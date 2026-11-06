<?php

return [
    'project_id' => env('FIREBASE_PROJECT_ID', 'kalinga-74544'),
    /*
     * Absolute path or storage-relative path to a Firebase service account JSON.
     * Required for webhook-driven Firestore updates.
     */
    'credentials' => env('FIREBASE_CREDENTIALS', storage_path('app/firebase-service-account.json')),
];
