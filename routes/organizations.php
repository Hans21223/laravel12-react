<?php

use App\Http\Controllers\Api\CallController;
use App\Http\Controllers\Api\OrganizationController;
use App\Http\Controllers\Api\OrganizationDatabaseController;
use App\Http\Controllers\Api\TeamController;
use App\Http\Middleware\UseOrganization;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('auth')->group(function () {
    Route::get('/organizations', fn () => Inertia::render('Approvals/Organizations'));
    Route::get('/api/organizations', [OrganizationController::class, 'index']);
    Route::post('/api/organizations', [OrganizationController::class, 'create'])->middleware('throttle:3,60');
    Route::post('/api/organizations/join', [OrganizationController::class, 'join'])->middleware('throttle:10,1');
    Route::post('/api/organizations/{organization}/switch', [OrganizationController::class, 'switch'])->whereNumber('organization');
    Route::middleware(UseOrganization::class)->prefix('api/organization')->group(function () {
        Route::get('/database', [OrganizationDatabaseController::class, 'index']);
        Route::get('/members', [OrganizationController::class, 'members']);
        Route::patch('/members/{membership}', [OrganizationController::class, 'updateMember'])->whereNumber('membership');
        Route::get('/invites', [OrganizationController::class, 'invites']);
        Route::post('/invites', [OrganizationController::class, 'invite'])->middleware('throttle:10,1');
        Route::delete('/invites/{invite}', [OrganizationController::class, 'revoke'])->whereNumber('invite');
    });
    Route::middleware(UseOrganization::class)->prefix('api/team')->group(function () {
        Route::get('/conversations', [TeamController::class, 'conversations']);
        Route::get('/messages/{peer}', [TeamController::class, 'messages'])->whereNumber('peer');
        Route::post('/messages/{peer}', [TeamController::class, 'send'])->whereNumber('peer')->middleware('throttle:60,1');
        Route::post('/messages/{peer}/read', [TeamController::class, 'read'])->whereNumber('peer');
        Route::get('/calls/configuration', [CallController::class, 'configuration']);
        Route::get('/calls', [CallController::class, 'index']);
        Route::post('/calls', [CallController::class, 'create'])->middleware('throttle:10,1');
        Route::get('/calls/{call}', [CallController::class, 'show'])->whereNumber('call');
        Route::patch('/calls/{call}', [CallController::class, 'update'])->whereNumber('call');
        Route::post('/calls/{call}/signals', [CallController::class, 'signal'])->whereNumber('call')->middleware('throttle:240,1');
    });
});
