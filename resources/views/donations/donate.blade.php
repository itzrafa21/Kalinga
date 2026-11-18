<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Donate - Kalinga</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css">
  @vite([
    'resources/css/app.css',
    'resources/js/app.js',
    'resources/js/donation-checkout.js'
  ])
  <style>
    :root {
      --bg: #effff4;
      --card: #ffffff;
      --ink: #0f172a;
      --muted: #64748b;
      --green: #166534;
      --green-soft: #aaf0ba;
      --line: #e2e8f0;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "Poppins", Arial, sans-serif;
      background:
        radial-gradient(circle at top left, rgba(170, 240, 186, 0.55), transparent 42%),
        linear-gradient(180deg, #f7fff9 0%, var(--bg) 100%);
      color: var(--ink);
    }
    .wrap {
      max-width: 560px;
      margin: 0 auto;
      padding: 2rem 1.15rem 3rem;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 0.45rem;
      color: var(--green);
      font-weight: 700;
      text-decoration: none;
      margin-bottom: 1.25rem;
    }
    .card {
      background: var(--card);
      border-radius: 18px;
      box-shadow: 0 14px 40px rgba(15, 36, 25, 0.08);
      padding: 1.35rem 1.4rem 1.5rem;
    }
    .cover {
      width: 100%;
      aspect-ratio: 16 / 9;
      object-fit: cover;
      border-radius: 14px;
      background: #f1f5f9;
      margin-bottom: 1rem;
    }
    h1 {
      margin: 0 0 0.35rem;
      font-size: 1.55rem;
      letter-spacing: -0.02em;
    }
    .meta {
      color: var(--muted);
      font-size: 0.92rem;
      margin-bottom: 1rem;
    }
    .progress-track {
      height: 10px;
      border-radius: 999px;
      background: #e2e8f0;
      overflow: hidden;
      margin: 0.85rem 0 0.45rem;
    }
    .progress-track > span {
      display: block;
      height: 100%;
      width: 0;
      background: linear-gradient(90deg, #22c55e, #16a34a);
    }
    .progress-label {
      margin: 0 0 1.15rem;
      color: var(--muted);
      font-size: 0.88rem;
    }
    label {
      display: block;
      font-size: 0.85rem;
      font-weight: 600;
      margin-bottom: 0.4rem;
    }
    .amount-pills {
      display: flex;
      flex-wrap: wrap;
      gap: 0.45rem;
      margin-bottom: 0.75rem;
    }
    .amount-pills button {
      border: 1px solid var(--line);
      background: #fff;
      border-radius: 999px;
      padding: 0.45rem 0.85rem;
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .amount-pills button.active {
      background: var(--green-soft);
      border-color: #86efac;
      color: var(--green);
    }
    input {
      width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 0.75rem 0.9rem;
      font: inherit;
      margin-bottom: 0.85rem;
    }
    .btn-donate {
      width: 100%;
      border: none;
      border-radius: 12px;
      padding: 0.85rem 1rem;
      background: #16a34a;
      color: #fff;
      font: inherit;
      font-weight: 700;
      cursor: pointer;
    }
    .btn-donate:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .status {
      margin-top: 0.85rem;
      padding: 0.75rem 0.9rem;
      border-radius: 12px;
      background: #eff6ff;
      color: #1e40af;
      font-size: 0.9rem;
    }
    .status.is-error {
      background: #fef2f2;
      color: #991b1b;
    }
    .hint {
      margin: 0.85rem 0 0;
      color: var(--muted);
      font-size: 0.82rem;
      line-height: 1.45;
    }
  </style>
</head>
<body data-campaign-id="{{ $campaignId }}">
  <div class="wrap">
    <a class="brand" href="/organization/dashboard">Kalinga</a>
    <section class="card">
      <img class="cover" id="campaignCover" alt="" hidden>
      <h1 id="campaignTitle">Loading campaign…</h1>
      <p class="meta" id="campaignMeta"></p>
      <div class="progress-track"><span id="progressFill"></span></div>
      <p class="progress-label" id="progressLabel">Loading…</p>

      <label for="donorName">Your name</label>
      <input id="donorName" type="text" placeholder="Optional" autocomplete="name">

      <label>Amount (PHP)</label>
      <div class="amount-pills" id="amountPills">
        <button type="button" data-amount="1000">₱10</button>
        <button type="button" data-amount="5000" class="active">₱50</button>
        <button type="button" data-amount="10000">₱100</button>
        <button type="button" data-amount="50000">₱500</button>
      </div>
      <input id="customAmount" type="number" min="10" step="1" placeholder="Or enter amount (min ₱10)" value="50">

      <button type="button" class="btn-donate" id="donateBtn">
        <i class="bi bi-credit-card"></i> Donate with Maya
      </button>
      <div class="status" id="statusMsg" hidden></div>
      <p class="hint">
        Sandbox payments use Maya Party 1. Card <code>5123456789012346</code>,
        expiry <code>12/2030</code>, CVV <code>111</code>.
      </p>
    </section>
  </div>
</body>
</html>
