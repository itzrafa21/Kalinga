<?php

namespace App\Http\Controllers;

use App\Services\DonationSettlementService;
use Illuminate\Http\Request;
use Throwable;

class DonationReturnController extends Controller
{
    public function __construct(private DonationSettlementService $settlement)
    {
    }

    public function success(Request $request)
    {
        $donationId = (string) $request->query('donation_id', '');
        $status = 'pending';

        if ($donationId !== '') {
            try {
                $status = $this->settlement->confirmMayaDonation($donationId);
            } catch (Throwable $e) {
                report($e);
                $status = 'pending';
            }
        }

        return view('donations.success', [
            'donationId' => $donationId,
            'status' => $status,
        ]);
    }

    public function cancel(Request $request)
    {
        return view('donations.cancel', [
            'donationId' => (string) $request->query('donation_id', ''),
        ]);
    }
}
