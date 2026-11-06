<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class FirestoreRestService
{
    private ?string $accessToken = null;

    private function projectId(): string
    {
        $projectId = (string) config('firebase_admin.project_id');
        if ($projectId === '') {
            throw new RuntimeException('FIREBASE_PROJECT_ID is not configured.');
        }

        return $projectId;
    }

    private function credentialsPath(): string
    {
        $path = (string) config('firebase_admin.credentials');
        if ($path === '' || ! is_file($path)) {
            throw new RuntimeException(
                'Firebase service account credentials not found. Set FIREBASE_CREDENTIALS to a valid JSON path.'
            );
        }

        return $path;
    }

    private function getAccessToken(): string
    {
        if ($this->accessToken) {
            return $this->accessToken;
        }

        $credentials = json_decode((string) file_get_contents($this->credentialsPath()), true);
        if (! is_array($credentials)) {
            throw new RuntimeException('Invalid Firebase service account JSON.');
        }

        $now = time();
        $header = $this->base64UrlEncode(json_encode(['alg' => 'RS256', 'typ' => 'JWT']));
        $claim = $this->base64UrlEncode(json_encode([
            'iss' => $credentials['client_email'],
            'scope' => 'https://www.googleapis.com/auth/datastore',
            'aud' => 'https://oauth2.googleapis.com/token',
            'iat' => $now,
            'exp' => $now + 3600,
        ]));

        $unsigned = $header.'.'.$claim;
        $privateKey = openssl_pkey_get_private($credentials['private_key'] ?? '');
        if ($privateKey === false) {
            throw new RuntimeException('Unable to read Firebase service account private key.');
        }

        $signature = '';
        openssl_sign($unsigned, $signature, $privateKey, OPENSSL_ALGO_SHA256);
        $jwt = $unsigned.'.'.$this->base64UrlEncode($signature);

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if (! $response->successful() || empty($response->json('access_token'))) {
            throw new RuntimeException('Unable to obtain Firestore access token.');
        }

        $this->accessToken = (string) $response->json('access_token');

        return $this->accessToken;
    }

    private function documentsUrl(string $path = ''): string
    {
        $base = 'https://firestore.googleapis.com/v1/projects/'.$this->projectId().'/databases/(default)/documents';

        return rtrim($base.'/'.ltrim($path, '/'), '/');
    }

    public function getDocument(string $collection, string $id): ?array
    {
        $response = Http::withToken($this->getAccessToken())
            ->get($this->documentsUrl($collection.'/'.$id));

        if ($response->status() === 404) {
            return null;
        }

        if (! $response->successful()) {
            throw new RuntimeException('Firestore get failed: '.$response->body());
        }

        return $this->decodeDocument($response->json());
    }

    public function createDocument(string $collection, array $fields, ?string $documentId = null): array
    {
        $query = $documentId ? ['documentId' => $documentId] : [];
        $response = Http::withToken($this->getAccessToken())
            ->post($this->documentsUrl($collection).($query ? '?'.http_build_query($query) : ''), [
                'fields' => $this->encodeFields($fields),
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Firestore create failed: '.$response->body());
        }

        return $this->decodeDocument($response->json());
    }

    public function patchDocument(string $collection, string $id, array $fields, array $updateMask = []): array
    {
        $mask = $updateMask ?: array_keys($fields);
        $query = [];
        foreach ($mask as $field) {
            $query[] = 'updateMask.fieldPaths='.rawurlencode($field);
        }

        $url = $this->documentsUrl($collection.'/'.$id).'?'.implode('&', $query);
        $response = Http::withToken($this->getAccessToken())
            ->patch($url, [
                'fields' => $this->encodeFields($fields),
            ]);

        if (! $response->successful()) {
            throw new RuntimeException('Firestore patch failed: '.$response->body());
        }

        return $this->decodeDocument($response->json());
    }

    public function documentExists(string $collection, string $id): bool
    {
        return $this->getDocument($collection, $id) !== null;
    }

    private function encodeFields(array $fields): array
    {
        $encoded = [];
        foreach ($fields as $key => $value) {
            $encoded[$key] = $this->encodeValue($value);
        }

        return $encoded;
    }

    private function encodeValue(mixed $value): array
    {
        if ($value === null) {
            return ['nullValue' => null];
        }
        if (is_bool($value)) {
            return ['booleanValue' => $value];
        }
        if (is_int($value)) {
            return ['integerValue' => (string) $value];
        }
        if (is_float($value)) {
            return ['doubleValue' => $value];
        }
        if (is_string($value)) {
            return ['stringValue' => $value];
        }
        if ($value instanceof \DateTimeInterface) {
            return ['timestampValue' => $value->format(DATE_ATOM)];
        }
        if (is_array($value)) {
            if ($this->isList($value)) {
                return [
                    'arrayValue' => [
                        'values' => array_map(fn ($item) => $this->encodeValue($item), array_values($value)),
                    ],
                ];
            }

            $map = [];
            foreach ($value as $k => $v) {
                $map[$k] = $this->encodeValue($v);
            }

            return ['mapValue' => ['fields' => $map]];
        }

        return ['stringValue' => (string) $value];
    }

    private function decodeDocument(array $document): array
    {
        $name = (string) ($document['name'] ?? '');
        $id = $name !== '' ? basename($name) : '';
        $fields = $this->decodeFields($document['fields'] ?? []);

        return array_merge(['id' => $id, '_name' => $name], $fields);
    }

    private function decodeFields(array $fields): array
    {
        $out = [];
        foreach ($fields as $key => $value) {
            $out[$key] = $this->decodeValue($value);
        }

        return $out;
    }

    private function decodeValue(array $value): mixed
    {
        if (array_key_exists('nullValue', $value)) {
            return null;
        }
        if (array_key_exists('booleanValue', $value)) {
            return (bool) $value['booleanValue'];
        }
        if (array_key_exists('integerValue', $value)) {
            return (int) $value['integerValue'];
        }
        if (array_key_exists('doubleValue', $value)) {
            return (float) $value['doubleValue'];
        }
        if (array_key_exists('stringValue', $value)) {
            return (string) $value['stringValue'];
        }
        if (array_key_exists('timestampValue', $value)) {
            return (string) $value['timestampValue'];
        }
        if (array_key_exists('mapValue', $value)) {
            return $this->decodeFields($value['mapValue']['fields'] ?? []);
        }
        if (array_key_exists('arrayValue', $value)) {
            $items = $value['arrayValue']['values'] ?? [];

            return array_map(fn ($item) => $this->decodeValue($item), $items);
        }

        return null;
    }

    private function isList(array $value): bool
    {
        if ($value === []) {
            return true;
        }

        return array_keys($value) === range(0, count($value) - 1);
    }

    private function base64UrlEncode(string $data): string
    {
        return rtrim(strtr(base64_encode($data), '+/', '-_'), '=');
    }
}
