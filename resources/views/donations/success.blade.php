<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation submitted - Kalinga</title>
  @vite(['resources/js/donation-success.js'])
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 2rem; color: #0f172a; }
    .box { max-width: 480px; margin: 3rem auto; background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
    h1 { margin: 0 0 0.75rem; font-size: 1.35rem; color: #14532d; }
    p { color: #64748b; line-height: 1.5; }
    #syncNote { margin-top: 1rem; font-size: 0.9rem; color: #334155; }
  </style>
</head>
<body
  data-donation-id="{{ $donationId ?? request('donation_id') }}"
  data-donation-status="{{ $status ?? '' }}"
>
  <div class="box">
    <h1>Thank you</h1>
    <p>
      @if (($status ?? '') === 'paid')
        Maya confirmed this donation. It is marked <strong>paid</strong>.
      @elseif (($status ?? '') === 'failed')
        Maya reported this payment as failed. No donation was counted.
      @else
        You returned from Maya Checkout. If the payment is still processing, the donation stays pending until Maya confirms it.
      @endif
    </p>
    <p>Donation ID: <code>{{ $donationId ?? request('donation_id') }}</code></p>
    <p id="syncNote"></p>
  </div>
</body>
</html>
