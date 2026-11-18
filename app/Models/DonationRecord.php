<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DonationRecord extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'id',
        'campaign_id',
        'campaign_title',
        'org_id',
        'org_name',
        'volunteer_id',
        'volunteer_email',
        'volunteer_name',
        'amount_centavos',
        'currency',
        'status',
        'provider',
        'maya_checkout_id',
        'maya_payment_id',
        'checkout_url',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount_centavos' => 'integer',
            'paid_at' => 'datetime',
        ];
    }

    public function toApiArray(): array
    {
        return [
            'id' => $this->id,
            'campaignId' => $this->campaign_id,
            'campaignTitle' => $this->campaign_title,
            'orgId' => $this->org_id,
            'orgName' => $this->org_name,
            'volunteerId' => $this->volunteer_id,
            'volunteerEmail' => $this->volunteer_email,
            'volunteerName' => $this->volunteer_name,
            'amountCentavos' => $this->amount_centavos,
            'currency' => $this->currency,
            'status' => $this->status,
            'provider' => $this->provider,
            'mayaCheckoutId' => $this->maya_checkout_id,
            'mayaPaymentId' => $this->maya_payment_id,
            'checkoutUrl' => $this->checkout_url,
            'paidAt' => optional($this->paid_at)?->toIso8601String(),
            'createdAt' => optional($this->created_at)?->toIso8601String(),
            'updatedAt' => optional($this->updated_at)?->toIso8601String(),
        ];
    }
}
