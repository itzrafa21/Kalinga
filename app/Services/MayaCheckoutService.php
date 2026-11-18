<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use RuntimeException;

class MayaCheckoutService
{
    private function publicKey(): string
    {
        $key = trim((string) config('maya.public_key'));
        if ($key === '') {
            throw new RuntimeException('MAYA_PUBLIC_KEY is not configured.');
        }

        return $key;
    }

    private function secretKey(): string
    {
        $key = trim((string) config('maya.secret_key'));
        if ($key === '') {
            throw new RuntimeException('MAYA_SECRET_KEY is not configured.');
        }

        return $key;
    }

    private function client(string $apiKey)
    {
        return Http::withBasicAuth($apiKey, '')
            ->acceptJson()
            ->asJson()
            ->baseUrl(rtrim((string) config('maya.base_url'), '/'));
    }

    /**
     * Create a Maya Checkout using the public key (Sandbox Party 1).
     *
     * @return array{id: string, checkout_url: string, raw: array}
     */
    public function createCheckout(array $payload): array
    {
        $response = $this->client($this->publicKey())->post('/checkout/v1/checkouts', $payload);

        if (! $response->successful()) {
            throw new RuntimeException('Maya checkout failed: '.$response->body());
        }

        $data = $response->json() ?? [];
        $id = (string) ($data['checkoutId'] ?? '');
        $checkoutUrl = (string) ($data['redirectUrl'] ?? '');

        if ($id === '' || $checkoutUrl === '') {
            throw new RuntimeException('Maya checkout response was incomplete.');
        }

        return [
            'id' => $id,
            'checkout_url' => $checkoutUrl,
            'raw' => $data,
        ];
    }

    /**
     * Retrieve a checkout with the secret key.
     */
    public function getCheckout(string $checkoutId): array
    {
        $response = $this->client($this->secretKey())->get('/checkout/v1/checkouts/'.$checkoutId);

        if (! $response->successful()) {
            throw new RuntimeException('Maya checkout lookup failed: '.$response->body());
        }

        $data = $response->json();

        return is_array($data) ? $data : [];
    }

    public function paymentStatus(array $checkout): string
    {
        $candidates = [
            data_get($checkout, 'paymentStatus'),
            data_get($checkout, 'status'),
            data_get($checkout, 'paymentDetails.status'),
            data_get($checkout, 'paymentDetails.0.status'),
        ];

        foreach ($candidates as $value) {
            $status = strtoupper(trim((string) $value));
            if ($status !== '') {
                return $status;
            }
        }

        return '';
    }
}
