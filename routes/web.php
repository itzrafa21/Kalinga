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
Route::get('/admin/login', function () {
    return view('admin.login');
});
Route::get('/admin/dashboard', function () {
    return view('admin.dashboard');
});
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