<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donation submitted - Kalinga</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; margin: 0; padding: 2rem; color: #0f172a; }
    .box { max-width: 480px; margin: 3rem auto; background: #fff; border-radius: 12px; padding: 1.5rem; box-shadow: 0 8px 24px rgba(15,23,42,0.08); }
    h1 { margin: 0 0 0.75rem; font-size: 1.35rem; color: #14532d; }
    p { color: #64748b; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="box">
    <h1>Thank you</h1>
    <p>
      Your PayMongo checkout completed. Final confirmation happens when PayMongo sends a verified webhook —
      donation status will update to <strong>paid</strong> shortly.
    </p>
    <p>Donation ID: <code>{{ request('donation_id') }}</code></p>
  </div>
</body>
</html>
