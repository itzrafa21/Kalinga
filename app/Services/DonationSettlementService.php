<?php

namespace App\Services;

use App\Models\DonationRecord;
use Throwable;

class DonationSettlementService
{
    public function __construct(
        private FirestoreRestService $firestore,
        private MayaCheckoutService $maya
    ) {
    }

    /**
     * Look up the Maya checkout and mark the donation when Maya reports a final status.
     */
    public function confirmMayaDonation(string $donationId): string
    {
        $record = DonationRecord::query()->find($donationId);
        if (! $record) {
            return 'missing';
        }

        if ($record->status === 'paid') {
            return 'paid';
        }

        $checkoutId = (string) ($record->maya_checkout_id ?? '');
        if ($checkoutId === '') {
            return $record->status ?: 'pending';
        }

        $checkout = $this->maya->getCheckout($checkoutId);
        $mayaStatus = $this->maya->paymentStatus($checkout);
        $mapped = $this->mapMayaStatus($mayaStatus);

        if ($mapped === null) {
            return $record->status ?: 'pending';
        }

        $paymentId = (string) (
            data_get($checkout, 'transactionReferenceNumber')
            ?: data_get($checkout, 'paymentId')
            ?: data_get($checkout, 'id')
            ?: $checkoutId
        );

        $this->applyStatus($record, $mapped, $paymentId);

        return $mapped;
    }

    public function mapMayaStatus(string $mayaStatus): ?string
    {
        return match ($mayaStatus) {
            'PAYMENT_SUCCESS', 'SUCCESS', 'PAID' => 'paid',
            'PAYMENT_FAILED', 'FAILED', 'AUTH_FAILED' => 'failed',
            'PAYMENT_EXPIRED', 'EXPIRED' => 'expired',
            'CANCELLED', 'CANCELED', 'PAYMENT_CANCELLED' => 'cancelled',
            default => null,
        };
    }

    public function applyStatus(DonationRecord $record, string $status, string $paymentId): void
    {
        $previousStatus = (string) $record->status;
        if ($previousStatus === 'paid') {
            return;
        }

        $record->status = $status;
        $record->maya_payment_id = $paymentId;
        if ($status === 'paid') {
            $record->paid_at = now();
        }
        $record->save();

        $this->syncFirestoreStatus($record);

        if ($status === 'paid' && $previousStatus !== 'paid') {
            $this->incrementCampaignTotals($record);
        }
    }

    private function syncFirestoreStatus(DonationRecord $record): void
    {
        try {
            $patch = [
                'status' => $record->status,
                'mayaPaymentId' => (string) $record->maya_payment_id,
                'updatedAt' => now()->toIso8601String(),
            ];
            $mask = ['status', 'mayaPaymentId', 'updatedAt'];
            if ($record->status === 'paid' && $record->paid_at) {
                $patch['paidAt'] = $record->paid_at->toIso8601String();
                $mask[] = 'paidAt';
            }
            $this->firestore->patchDocument('donations', $record->id, $patch, $mask);
        } catch (Throwable $e) {
            report($e);
        }
    }

    private function incrementCampaignTotals(DonationRecord $record): void
    {
        $campaignId = (string) $record->campaign_id;
        $amountCentavos = (int) $record->amount_centavos;
        if ($campaignId === '' || $amountCentavos <= 0) {
            return;
        }

        try {
            $campaign = $this->firestore->getDocument('donation_campaigns', $campaignId);
            if (! $campaign) {
                return;
            }

            $raised = (int) ($campaign['raisedAmountCentavos'] ?? 0) + $amountCentavos;
            $donors = (int) ($campaign['donorCount'] ?? 0) + 1;
            $recent = $campaign['recentDonations'] ?? [];
            if (! is_array($recent)) {
                $recent = [];
            }

            $entry = [
                'id' => $record->id,
                'volunteerName' => (string) ($record->volunteer_name ?: ''),
                'volunteerEmail' => (string) ($record->volunteer_email ?: ''),
                'amountCentavos' => $amountCentavos,
                'status' => 'paid',
                'paidAt' => optional($record->paid_at)?->toIso8601String() ?: now()->toIso8601String(),
            ];

            $recent = array_values(array_filter(
                $recent,
                fn ($item) => ! is_array($item) || (string) ($item['id'] ?? '') !== $record->id
            ));
            $recent[] = $entry;
            $recent = array_slice($recent, -50);

            $this->firestore->patchDocument('donation_campaigns', $campaignId, [
                'raisedAmountCentavos' => $raised,
                'donorCount' => $donors,
                'recentDonations' => $recent,
                'updatedAt' => now()->toIso8601String(),
            ], ['raisedAmountCentavos', 'donorCount', 'recentDonations', 'updatedAt']);
        } catch (Throwable $e) {
            report($e);
        }
    }
}
