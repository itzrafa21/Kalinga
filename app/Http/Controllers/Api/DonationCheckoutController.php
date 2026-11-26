<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DonationRecord;
use App\Services\FirestoreRestService;
use App\Services\MayaCheckoutService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Throwable;

class DonationCheckoutController extends Controller
{
    public function __construct(
        private MayaCheckoutService $maya,
        private FirestoreRestService $firestore
    ) {
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campaignId' => ['required', 'string', 'max:128'],
            'amountCentavos' => ['required', 'integer', 'min:1000'],
            'donorName' => ['nullable', 'string', 'max:160'],
            'donorEmail' => ['nullable', 'email', 'max:190'],
            // Used when Firebase Admin credentials are not configured yet.
            'orgId' => ['nullable', 'string', 'max:128'],
            'campaignTitle' => ['nullable', 'string', 'max:200'],
            'orgName' => ['nullable', 'string', 'max:200'],
        ]);

        $uid = (string) $request->attributes->get('firebase_uid');
        $email = (string) ($request->attributes->get('firebase_email') ?: ($data['donorEmail'] ?? ''));

        $campaign = $this->resolveCampaign($data);
        if ($campaign === null) {
            return response()->json(['message' => 'Campaign not found.'], 404);
        }

        if (($campaign['status'] ?? '') !== 'published') {
            return response()->json(['message' => 'This campaign is not accepting donations.'], 422);
        }

        $orgId = (string) ($campaign['orgId'] ?? '');
        if ($orgId === '') {
            return response()->json(['message' => 'Campaign is missing an organization.'], 422);
        }

        $amount = (int) $data['amountCentavos'];
        $donationId = (string) Str::uuid();
        $appUrl = rtrim((string) config('app.url'), '/');
        $successUrl = $appUrl.config('maya.success_path').'?donation_id='.$donationId;
        $cancelUrl = $appUrl.config('maya.cancel_path').'?donation_id='.$donationId;
        $failureUrl = $appUrl.config('maya.failure_path').'?donation_id='.$donationId;
        $pesos = number_format($amount / 100, 2, '.', '');
        $donorName = trim((string) ($data['donorName'] ?? ''));
        $nameParts = preg_split('/\s+/', $donorName !== '' ? $donorName : 'Kalinga Donor') ?: [];
        $firstName = (string) array_shift($nameParts);
        $lastName = trim(implode(' ', $nameParts));
        if ($lastName === '') {
            $lastName = 'Donor';
        }

        $orgName = (string) ($campaign['orgName'] ?? $data['orgName'] ?? '');
        $campaignTitle = (string) ($campaign['title'] ?? $data['campaignTitle'] ?? 'Donation');

        $record = DonationRecord::query()->create([
            'id' => $donationId,
            'campaign_id' => $data['campaignId'],
            'campaign_title' => $campaignTitle,
            'org_id' => $orgId,
            'org_name' => $orgName,
            'volunteer_id' => $uid,
            'volunteer_email' => $email,
            'volunteer_name' => $donorName,
            'amount_centavos' => $amount,
            'currency' => 'PHP',
            'status' => 'pending',
            'provider' => 'maya',
        ]);

        $checkoutPayload = [
            'totalAmount' => [
                'currency' => 'PHP',
                'value' => (float) $pesos,
            ],
            'buyer' => [
                'firstName' => $firstName,
                'lastName' => $lastName,
            ],
            'items' => [[
                'name' => $campaignTitle,
                'code' => 'DONATION',
                'description' => 'Donation to '.$campaignTitle,
                'quantity' => 1,
                'amount' => ['value' => (float) $pesos],
                'totalAmount' => ['value' => (float) $pesos],
            ]],
            'redirectUrl' => [
                'success' => $successUrl,
                'failure' => $failureUrl,
                'cancel' => $cancelUrl,
            ],
            'requestReferenceNumber' => $donationId,
        ];

        if ($email !== '') {
            $checkoutPayload['buyer']['contact'] = ['email' => $email];
        }

        try {
            $checkout = $this->maya->createCheckout($checkoutPayload);
            $record->maya_checkout_id = $checkout['id'];
            $record->checkout_url = $checkout['checkout_url'];
            $record->save();

            $this->syncFirestoreCreate($record);
        } catch (Throwable $e) {
            report($e);
            $record->status = 'failed';
            $record->save();

            return response()->json([
                'message' => 'Unable to start Maya checkout. '.$e->getMessage(),
            ], 502);
        }

        return response()->json([
            'donationId' => $donationId,
            'checkoutUrl' => $record->checkout_url,
            'checkoutSessionId' => $record->maya_checkout_id,
            'amountCentavos' => $amount,
            'status' => 'pending',
        ]);
    }

    public function show(Request $request, string $donationId): JsonResponse
    {
        $record = DonationRecord::query()->find($donationId);
        if (! $record) {
            return response()->json(['message' => 'Donation not found.'], 404);
        }

        $uid = (string) $request->attributes->get('firebase_uid');
        $allowed = $record->volunteer_id === $uid || $record->org_id === $uid;

        if (! $allowed) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }

        return response()->json([
            'donation' => $record->toApiArray(),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $data = $request->validate([
            'campaignId' => ['required', 'string', 'max:128'],
            'orgId' => ['nullable', 'string', 'max:128'],
        ]);

        $uid = (string) $request->attributes->get('firebase_uid');
        $campaignOrgId = '';

        try {
            $campaign = $this->firestore->getDocument('donation_campaigns', $data['campaignId']);
            $campaignOrgId = (string) ($campaign['orgId'] ?? '');
        } catch (Throwable $e) {
            report($e);
            $campaignOrgId = trim((string) ($data['orgId'] ?? ''));
        }

        // Owner, donor, or same-org actor (org portal sends orgId from session).
        $allowedOrgIds = array_values(array_filter([
            $uid,
            $campaignOrgId,
            trim((string) ($data['orgId'] ?? '')),
        ]));

        $rows = DonationRecord::query()
            ->where('campaign_id', $data['campaignId'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        $visible = $rows->filter(function (DonationRecord $row) use ($uid, $allowedOrgIds, $campaignOrgId) {
            if ($row->volunteer_id === $uid) {
                return true;
            }
            if ($campaignOrgId !== '' && $row->org_id === $campaignOrgId) {
                // Caller must be the campaign org or a delegated org session for that org.
                return in_array($uid, $allowedOrgIds, true)
                    || in_array($campaignOrgId, $allowedOrgIds, true);
            }

            return in_array($row->org_id, $allowedOrgIds, true);
        })->values();

        // If the signed-in user is the campaign owner, always return every local row for that campaign.
        if ($campaignOrgId !== '' && ($uid === $campaignOrgId || in_array($campaignOrgId, $allowedOrgIds, true))) {
            $visible = $rows->values();
        }

        $paid = $visible->where('status', 'paid');

        return response()->json([
            'donations' => $visible->map->toApiArray()->all(),
            'raisedCentavos' => (int) $paid->sum('amount_centavos'),
            'donorCount' => $paid
                ->map(function (DonationRecord $row) {
                    $name = strtolower(trim((string) $row->volunteer_name));
                    $email = trim((string) $row->volunteer_email);
                    if ($name === 'anonymous' || ($name === '' && $email === '')) {
                        return 'anon:'.$row->id;
                    }

                    return $row->volunteer_id ?: $row->volunteer_email ?: $row->id;
                })
                ->filter()
                ->unique()
                ->count(),
        ]);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>|null
     */
    private function resolveCampaign(array $data): ?array
    {
        try {
            $campaign = $this->firestore->getDocument('donation_campaigns', $data['campaignId']);
            if (is_array($campaign)) {
                return $campaign;
            }
        } catch (Throwable $e) {
            report($e);
        }

        // Local/sandbox fallback: trust the signed-in client's campaign snapshot.
        if (! config('app.debug')) {
            return null;
        }

        $orgId = trim((string) ($data['orgId'] ?? ''));
        if ($orgId === '') {
            return null;
        }

        return [
            'status' => 'published',
            'orgId' => $orgId,
            'title' => (string) ($data['campaignTitle'] ?? 'Donation'),
            'orgName' => (string) ($data['orgName'] ?? ''),
        ];
    }

    private function syncFirestoreCreate(DonationRecord $record): void
    {
        $fields = [
            'campaignId' => $record->campaign_id,
            'campaignTitle' => $record->campaign_title,
            'orgId' => $record->org_id,
            'orgName' => $record->org_name,
            'volunteerId' => $record->volunteer_id,
            'volunteerEmail' => $record->volunteer_email,
            'volunteerName' => $record->volunteer_name,
            'amountCentavos' => $record->amount_centavos,
            'currency' => $record->currency,
            'status' => $record->status,
            'provider' => $record->provider,
            'mayaCheckoutId' => $record->maya_checkout_id,
            'mayaPaymentId' => $record->maya_payment_id ?: '',
            'mayaRequestReference' => $record->id,
            'checkoutUrl' => $record->checkout_url,
            'createdAt' => optional($record->created_at)?->toIso8601String(),
            'updatedAt' => optional($record->updated_at)?->toIso8601String(),
        ];

        try {
            $this->firestore->createDocument('donations', $fields, $record->id);
        } catch (Throwable $e) {
            // Optional while Firebase Admin credentials are missing.
            report($e);
        }
    }
}
