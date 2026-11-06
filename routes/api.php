<?php

use App\Http\Controllers\Api\DonationCheckoutController;
use App\Http\Controllers\Api\PayMongoWebhookController;
use App\Http\Middleware\VerifyFirebaseToken;
use Illuminate\Support\Facades\Route;

Route::post('/paymongo/webhook', PayMongoWebhookController::class);

Route::middleware([VerifyFirebaseToken::class])->group(function () {
    Route::post('/donations/checkout', [DonationCheckoutController::class, 'store']);
});
