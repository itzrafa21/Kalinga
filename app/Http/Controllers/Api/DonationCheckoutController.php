<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\FirestoreRestService;
use App\Services\PayMongoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

class DonationCheckoutController extends Controller
{
    public function __construct(
        private PayMongoService $payMongo,
        private FirestoreRestService $firestore
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campaignId' => ['required', 'string', 'max:128'],
            'amountCentavos' => ['required', 'integer', 'min:1000'], // ₱10.00 minimum
            'donorName' => ['nullable', 'string', 'max:160'],
            'donorEmail' => ['nullable', 'email', 'max:190'],
        ]);

        $uid = (string) $request->attributes->get('firebase_uid');
        $email = (string) ($request->attributes->get('firebase_email') ?: ($data['donorEmail'] ?? ''));

        try {
            $campaign = $this->firestore->getDocument('donation_campaigns', $data['campaignId']);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Donation service is not fully configured. Check Firebase Admin credentials.',
            ], 503);
        }

        if (! $campaign) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        if (($campaign['status'] ?? '') !== 'published') {
            return response()->json(['message' => 'This campaign is not accepting donations.'], 422);
        }

        $orgId = (string) ($campaign['orgId'] ?? '');
        if ($orgId === '') {
            return response()->json(['message' => 'Campaign is missing an organization.'], 422);
        }

        $org = $this->firestore->getDocument('organizations', $orgId);
        $linkedAccountId = (string) data_get($org, 'paymongo.linkedAccountId', data_get($campaign, 'paymongoAccountId', ''));
        if ($linkedAccountId === '') {
            return response()->json([
                'message' => 'This organization has not connected an approved PayMongo account yet.',
            ], 422);
        }

        $amount = (int) $data['amountCentavos'];
        $donationId = (string) Str::uuid();
        $appUrl = rtrim((string) config('app.url'), '/');
        $successUrl = $appUrl.config('paymongo.success_path').'?donation_id='.$donationId;
        $cancelUrl = $appUrl.config('paymongo.cancel_path').'?donation_id='.$donationId;

        $now = now()->toIso8601String();
        $donationFields = [
            'campaignId' => $data['campaignId'],
            'campaignTitle' => (string) ($campaign['title'] ?? ''),
            'orgId' => $orgId,
            'orgName' => (string) ($campaign['orgName'] ?? data_get($org, 'name', data_get($org, 'orgName', ''))),
            'volunteerId' => $uid,
            'volunteerEmail' => $email,
            'volunteerName' => (string) ($data['donorName'] ?? ''),
            'amountCentavos' => $amount,
            'currency' => 'PHP',
            'status' => 'pending',
            'paymongoCheckoutSessionId' => '',
            'paymongoPaymentId' => '',
            'checkoutUrl' => '',
            'paymongoAccountId' => $linkedAccountId,
            'createdAt' => $now,
            'updatedAt' => $now,
        ];

        try {
            $this->firestore->createDocument('donations', $donationFields, $donationId);

            $checkout = $this->payMongo->createCheckoutSession([
                'send_email_receipt' => true,
                'show_description' => true,
                'show_line_items' => true,
                'description' => 'Donation to '.($campaign['title'] ?? 'Kalinga campaign'),
                'line_items' => [[
                    'currency' => 'PHP',
                    'amount' => $amount,
                    'name' => (string) ($campaign['title'] ?? 'Donation'),
                    'quantity' => 1,
                ]],
                'payment_method_types' => ['card', 'gcash', 'paymaya', 'qrph'],
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
                'metadata' => [
                    'donation_id' => $donationId,
                    'campaign_id' => $data['campaignId'],
                    'org_id' => $orgId,
                    'volunteer_id' => $uid,
                ],
            ], $linkedAccountId);

            $this->firestore->patchDocument('donations', $donationId, [
                'paymongoCheckoutSessionId' => $checkout['id'],
                'checkoutUrl' => $checkout['checkout_url'],
                'updatedAt' => now()->toIso8601String(),
            ], ['paymongoCheckoutSessionId', 'checkoutUrl', 'updatedAt']);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'message' => 'Unable to start PayMongo checkout. '.$e->getMessage(),
            ], 502);
        }

        return response()->json([
            'donationId' => $donationId,
            'checkoutUrl' => $checkout['checkout_url'],
            'checkoutSessionId' => $checkout['id'],
            'amountCentavos' => $amount,
            'status' => 'pending',
        ]);
    }
}
