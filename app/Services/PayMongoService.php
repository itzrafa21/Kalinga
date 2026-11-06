<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class PayMongoService
{
    private function secretKey(): string
    {
        $key = trim((string) config('paymongo.secret_key'));
        if ($key === '') {
            throw new RuntimeException('PAYMONGO_SECRET_KEY is not configured.');
        }

        return $key;
    }

    private function client(?string $linkedAccountId = null)
    {
        $request = Http::withBasicAuth($this->secretKey(), '')
            ->acceptJson()
            ->baseUrl(rtrim((string) config('paymongo.base_url'), '/'));

        if ($linkedAccountId) {
            $request = $request->withHeaders([
                'Paymongo-Account' => $linkedAccountId,
            ]);
        }

        return $request;
    }

    /**
     * Create a Checkout Session that settles to the organization's linked account.
     *
     * @return array{id: string, checkout_url: string, raw: array}
     */
    public function createCheckoutSession(array $payload, ?string $linkedAccountId = null): array
    {
        $response = $this->client($linkedAccountId)->post('/v1/checkout_sessions', [
            'data' => [
                'attributes' => $payload,
            ],
        ]);

        if (! $response->successful()) {
            throw new RuntimeException('PayMongo checkout failed: '.$response->body());
        }

        $data = $response->json('data') ?? [];
        $id = (string) ($data['id'] ?? '');
        $checkoutUrl = (string) ($data['attributes']['checkout_url'] ?? '');

        if ($id === '' || $checkoutUrl === '') {
            throw new RuntimeException('PayMongo checkout response was incomplete.');
        }

        return [
            'id' => $id,
            'checkout_url' => $checkoutUrl,
            'raw' => $data,
        ];
    }

    public function verifyWebhookSignature(string $rawPayload, ?string $signatureHeader): bool
    {
        $secret = trim((string) config('paymongo.webhook_secret'));
        if ($secret === '') {
            // In local/test without a secret, accept only when APP_DEBUG is true.
            return (bool) config('app.debug');
        }

        if (! $signatureHeader) {
            return false;
        }

        // PayMongo sends: t=timestamp,te=test_signature,li=live_signature
        $parts = [];
        foreach (explode(',', $signatureHeader) as $piece) {
            [$k, $v] = array_pad(explode('=', trim($piece), 2), 2, null);
            if ($k && $v) {
                $parts[$k] = $v;
            }
        }

        $timestamp = $parts['t'] ?? null;
        $signature = $parts['te'] ?? $parts['li'] ?? null;
        if (! $timestamp || ! $signature) {
            return false;
        }

        $signedPayload = $timestamp.'.'.$rawPayload;
        $computed = hash_hmac('sha256', $signedPayload, $secret);

        return hash_equals($computed, $signature);
    }
}
