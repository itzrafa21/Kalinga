<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DonationRecord;
use App\Services\DonationSettlementService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MayaWebhookController extends Controller
{
    public function __construct(private DonationSettlementService $settlement)
    {
    }

    public function __invoke(Request $request): JsonResponse
    {
        $payload = $request->json()->all();
        if ($payload === []) {
            $decoded = json_decode($request->getContent(), true);
            $payload = is_array($decoded) ? $decoded : [];
        }

        $reference = (string) ($payload['requestReferenceNumber'] ?? '');
        if ($reference === '') {
            return response()->json(['message' => 'Missing request reference.'], 400);
        }

        if (! DonationRecord::query()->whereKey($reference)->exists()) {
            return response()->json(['message' => 'Donation not found.'], 404);
        }

        $status = $this->settlement->confirmMayaDonation($reference);

        return response()->json(['message' => 'ok', 'status' => $status]);
    }
}
