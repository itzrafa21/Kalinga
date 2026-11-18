<?php

return [
    // Sandbox Party 1 (Checkout + Invoice). Public sandbox keys published by Maya.
    'public_key' => env('MAYA_PUBLIC_KEY', 'pk-Z0OSzLvIcOI2UIvDhdTGVVfRSSeiGStnceqwUE7n0Ah'),
    'secret_key' => env('MAYA_SECRET_KEY', 'sk-X8qolYjy62kIzEbr0QRK1h4b4KDVHaNcwMYk39jInSl'),
    'base_url' => env('MAYA_BASE_URL', 'https://pg-sandbox.paymaya.com'),
    'currency' => 'PHP',
    'success_path' => env('MAYA_SUCCESS_PATH', '/donations/success'),
    'failure_path' => env('MAYA_FAILURE_PATH', '/donations/cancel'),
    'cancel_path' => env('MAYA_CANCEL_PATH', '/donations/cancel'),
];
