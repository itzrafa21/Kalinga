<?php

namespace App\Http\Middleware;

use App\Services\FirebaseTokenVerifier;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use UnexpectedValueException;

class VerifyFirebaseToken
{
    public function __construct(private FirebaseTokenVerifier $verifier)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $header = (string) $request->header('Authorization', '');
        if (! preg_match('/^Bearer\s+(.+)$/i', $header, $matches)) {
            return response()->json(['message' => 'Missing Firebase ID token.'], 401);
        }

        try {
            $auth = $this->verifier->verify(trim($matches[1]));
        } catch (UnexpectedValueException $e) {
            return response()->json(['message' => $e->getMessage()], 401);
        } catch (\Throwable $e) {
            report($e);

            return response()->json(['message' => 'Unable to verify Firebase token.'], 401);
        }

        $request->attributes->set('firebase_uid', $auth['uid']);
        $request->attributes->set('firebase_email', $auth['email']);
        $request->attributes->set('firebase_claims', $auth['claims']);

        return $next($request);
    }
}
