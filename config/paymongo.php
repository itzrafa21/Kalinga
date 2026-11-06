<?php

return [
    'secret_key' => env('PAYMONGO_SECRET_KEY', ''),
    'public_key' => env('PAYMONGO_PUBLIC_KEY', ''),
    'webhook_secret' => env('PAYMONGO_WEBHOOK_SECRET', ''),
    'base_url' => env('PAYMONGO_BASE_URL', 'https://api.paymongo.com'),
    'currency' => 'PHP',
    'success_path' => env('PAYMONGO_SUCCESS_PATH', '/donations/success'),
    'cancel_path' => env('PAYMONGO_CANCEL_PATH', '/donations/cancel'),
];
