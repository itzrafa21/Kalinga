<?php

use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('organization.login');
});
Route::get('/organization/login', function () {
    return view('organization.login');
});
Route::get('/organization/dashboard', function () {
    return view('organization.dashboard');
});
Route::get('/organization/register', function () {
    return view('organization.register');
});
Route::get('/', function () {
    return view('organization.login');
});
Route::get('/missions/create', function () {
    return view('missions.create');
});
Route::get('/missions/donation-details', function () {
    return view('missions.donation-details');
});
// Edit mission page
Route::get('/missions/edit', function () {
    return view('missions.edit');
});
Route::get('/organization/profile', function () {
    return view('organization.profile');
});
Route::get('/organization/profile', function () {
    return view('organization.profile'); // or your blade filename
});
Route::get('/missions/history', function () {
    return view('missions.history'); // ✅ This loads resources/views/missions/history.blade.php
});
Route::get('/organization/volunteers', function () {
    return view('organization.volunteers');
});
Route::get('/donation', function () {
    return view('organization.donation');
});
Route::get('/donation/campaigns/create', function () {
    return view('organization.campaign-form');
});
Route::get('/donation/campaigns/{campaignId}/edit', function (string $campaignId) {
    return view('organization.campaign-form', ['campaignId' => $campaignId]);
})->where('campaignId', '[^/]+');
Route::get('/donation/campaigns/{campaignId}', function (string $campaignId) {
    return view('organization.campaign-details', ['campaignId' => $campaignId]);
})->where('campaignId', '[^/]+');

Route::get('/donations/success', function () {
    return view('donations.success');
});
Route::get('/donations/cancel', function () {
    return view('donations.cancel');
});
Route::get('/settings', function () {
    return view('organization.settings');
});
Route::get('/organization/settings', function () {
    return view('organization.settings');
});
Route::get('/admin/login', function () {
    return view('admin.login');
});
Route::get('/admin/dashboard', function () {
    return view('admin.dashboard');
});
Route::get('/admin/organizations/{orgId}', function (string $orgId) {
    return view('admin.organization-details', ['orgId' => $orgId]);
})->where('orgId', '[^/]+');
Route::get('/admin/missions/{missionId}', function (string $missionId) {
    return view('admin.mission-details', ['missionId' => $missionId]);
})->where('missionId', '[^/]+');
Route::get('/admin/volunteers/{volunteerId}', function (string $volunteerId) {
    return view('admin.volunteer-details', ['volunteerId' => $volunteerId]);
})->where('volunteerId', '[^/]+');
Route::get('/admin/config', function () {
    return view('admin.config');
});
Route::get('/admin/hotlines', function () {
    return view('admin.hotlines');
});
Route::get('/establishments/manage', function () {
    return view('establishments.manage');
})->middleware('auth');
Route::get('/missions/details', function () {
    return view('missions.details');
});
Route::get('/organization/volunteers/details', function () {
    return view('organization.volunteer-details');
});