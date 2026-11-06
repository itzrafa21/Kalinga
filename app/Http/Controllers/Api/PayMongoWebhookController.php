<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirestoreRestService;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PayMongoWebhookController extends Controller
{
    public function __construct(
        private PayMongoService $payMongo,
        private FirestoreRestService $firestore
    ) {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $raw = $request->getContent();
        $signature = $request->header('Paymongo-Signature')
            ?? $request->header('paymongo-signature');

        if (! $this->payMongo->verifyWebhookSignature($raw, $signature)) {
            return response()->json(['message' => 'Invalid webhook signature.'], 400);
        }

        $payload = json_decode($raw, true);
        if (! is_array($payload)) {
            return response()->json(['message' => 'Invalid JSON payload.'], 400);
        }

        $event = $payload['data'] ?? $payload;
        $eventId = (string) ($event['id'] ?? '');
        $eventType = (string) ($event['attributes']['type'] ?? $event['type'] ?? '');

        if ($eventId === '') {
            return response()->json(['message' => 'Missing event id.'], 400);
        }

        try {
            if ($this->firestore->documentExists('payment_events', $eventId)) {
                return response()->json(['message' => 'Event already processed.', 'duplicate' => true]);
            }
        } catch (Throwable $e) {
            report($e);

            return response()->json(['message' => 'Firestore unavailable for webhook processing.'], 503);
        }

        $resource = $event['attributes']['data'] ?? [];
        $resourceAttrs = $resource['attributes'] ?? [];
        $metadata = $resourceAttrs['metadata'] ?? [];
        $donationId = (string) ($metadata['donation_id'] ?? '');
        $status = $this->mapEventToDonationStatus($eventType, $resourceAttrs);

        $now = now()->toIso8601String();

        try {
            // Record the event first (doc id = event id) to prevent double-count races.
            $this->firestore->createDocument('payment_events', [
                'eventId' => $eventId,
                'type' => $eventType,
                'donationId' => $donationId,
                'campaignId' => (string) ($metadata['campaign_id'] ?? ''),
                'orgId' => (string) ($metadata['org_id'] ?? ''),
                'statusMapped' => $status,
                'payload' => $payload,
                'processedAt' => $now,
                'createdAt' => $now,
            ], $eventId);

            if ($donationId !== '' && $status !== null) {
                $this->applyDonationUpdate($donationId, $status, $resource, $now);
            }
        } catch (Throwable $e) {
            // If create failed because the doc already exists, treat as duplicate.
            if (str_contains($e->getMessage(), 'ALREADY_EXISTS') || str_contains($e->getMessage(), '409')) {
                return response()->json(['message' => 'Event already processed.', 'duplicate' => true]);
            }

            report($e);
            Log::error('PayMongo webhook processing failed', [
                'eventId' => $eventId,
                'error' => $e->getMessage(),
            ]);

            return response()->json(['message' => 'Webhook processing failed.'], 500);
        }

        return response()->json(['message' => 'ok']);
    }

    private function mapEventToDonationStatus(string $eventType, array $resourceAttrs): ?string
    {
        $normalized = strtolower($eventType);
        $paymentStatus = strtolower((string) ($resourceAttrs['status'] ?? ''));

        return match (true) {
            str_contains($normalized, 'payment.paid'),
            str_contains($normalized, 'checkout_session.payment.paid'),
            $paymentStatus === 'paid' => 'paid',
            str_contains($normalized, 'payment.failed'),
            $paymentStatus === 'failed' => 'failed',
            str_contains($normalized, 'expired'),
            $paymentStatus === 'expired' => 'expired',
            str_contains($normalized, 'cancelled') || str_contains($normalized, 'canceled'),
            $paymentStatus === 'cancelled' || $paymentStatus === 'canceled' => 'cancelled',
            default => null,
        };
    }

    private function applyDonationUpdate(string $donationId, string $status, array $resource, string $now): void
    {
        $donation = $this->firestore->getDocument('donations', $donationId);
        if (! $donation) {
            return;
        }

        $previousStatus = (string) ($donation['status'] ?? '');
        if ($previousStatus === 'paid') {
            // Never re-count a paid donation.
            return;
        }

        $paymentId = (string) ($resource['id'] ?? data_get($resource, 'attributes.payments.0.id', ''));
        $patch = [
            'status' => $status,
            'paymongoPaymentId' => $paymentId,
            'updatedAt' => $now,
        ];
        $mask = ['status', 'paymongoPaymentId', 'updatedAt'];

        if ($status === 'paid') {
            $patch['paidAt'] = $now;
            $mask[] = 'paidAt';
        }

        $this->firestore->patchDocument('donations', $donationId, $patch, $mask);

        if ($status === 'paid' && $previousStatus !== 'paid') {
            $this->incrementCampaignTotals(
                (string) ($donation['campaignId'] ?? ''),
                (int) ($donation['amountCentavos'] ?? 0)
            );
        }
    }

    private function incrementCampaignTotals(string $campaignId, int $amountCentavos): void
    {
        if ($campaignId === '' || $amountCentavos <= 0) {
            return;
        }

        $campaign = $this->firestore->getDocument('donation_campaigns', $campaignId);
        if (! $campaign) {
            return;
        }

        $raised = (int) ($campaign['raisedAmountCentavos'] ?? 0) + $amountCentavos;
        $donors = (int) ($campaign['donorCount'] ?? 0) + 1;

        $this->firestore->patchDocument('donation_campaigns', $campaignId, [
            'raisedAmountCentavos' => $raised,
            'donorCount' => $donors,
            'updatedAt' => now()->toIso8601String(),
        ], ['raisedAmountCentavos', 'donorCount', 'updatedAt']);
    }
}
