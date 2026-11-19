<?php

use App\Http\Controllers\Api\DonationCheckoutController;
use App\Http\Controllers\Api\MayaWebhookController;
use App\Http\Middleware\VerifyFirebaseToken;
use Illuminate\Support\Facades\Route;

Route::post('/maya/webhook', MayaWebhookController::class);

Route::middleware([VerifyFirebaseToken::class])->group(function () {
    Route::post('/donations/checkout', [DonationCheckoutController::class, 'store']);
    Route::get('/donations', [DonationCheckoutController::class, 'index']);
    Route::get('/donations/{donationId}', [DonationCheckoutController::class, 'show'])
        ->where('donationId', '[^/]+');
});
