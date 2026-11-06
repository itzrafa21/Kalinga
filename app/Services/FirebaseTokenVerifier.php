<?php

namespace App\Services;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use RuntimeException;
use UnexpectedValueException;

class FirebaseTokenVerifier
{
    private const CERTS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

    /**
     * @return array{uid: string, email: ?string, claims: array}
     */
    public function verify(string $idToken): array
    {
        $projectId = (string) config('firebase_admin.project_id');
        if ($projectId === '') {
            throw new RuntimeException('FIREBASE_PROJECT_ID is not configured.');
        }

        $keys = $this->getJwks();

        try {
            $decoded = JWT::decode($idToken, JWK::parseKeySet($keys));
        } catch (\Throwable $e) {
            throw new UnexpectedValueException('Invalid Firebase ID token: '.$e->getMessage(), 0, $e);
        }

        $claims = (array) $decoded;

        if (($claims['aud'] ?? null) !== $projectId) {
            throw new UnexpectedValueException('Invalid token audience.');
        }

        $issuer = 'https://securetoken.google.com/'.$projectId;
        if (($claims['iss'] ?? null) !== $issuer) {
            throw new UnexpectedValueException('Invalid token issuer.');
        }

        $uid = (string) ($claims['sub'] ?? $claims['user_id'] ?? '');
        if ($uid === '') {
            throw new UnexpectedValueException('Token is missing subject.');
        }

        return [
            'uid' => $uid,
            'email' => isset($claims['email']) ? (string) $claims['email'] : null,
            'claims' => $claims,
        ];
    }

    private function getJwks(): array
    {
        return Cache::remember('firebase_securetoken_jwks', 3600, function () {
            $response = Http::timeout(10)->get(self::CERTS_URL);
            if (! $response->successful()) {
                throw new RuntimeException('Unable to fetch Firebase public keys.');
            }

            $json = $response->json();
            if (! is_array($json) || empty($json['keys'])) {
                throw new RuntimeException('Firebase public keys response was empty.');
            }

            return $json;
        });
    }
}
