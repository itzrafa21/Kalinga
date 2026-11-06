# Kalinga Donation Management System (Organization)

Kalinga connects volunteers and organizations. **Donation funds never settle to Kalinga** — PayMongo Checkout sessions are created with the organization's Linked Account (`Paymongo-Account` header).

This web app covers **organization campaign management** and **admin approval**. Checkout API + webhook remain on the Laravel backend for payment processing.

## Collections

| Collection | Purpose |
|---|---|
| `donation_campaigns` | Campaign metadata, money and/or goods targets, approval status |
| `donations` | One checkout attempt; amounts in **integer centavos** (money) |
| `payment_events` | Idempotent webhook log (`doc id` = PayMongo event id) |

### Campaign donation modes
`money` | `goods` | `both`

Campaign fields for goods:
- `donationMode`, `acceptsMoney`, `acceptsGoods`
- `inKindItems[]`: `{ id, label, unit, targetQuantity, receivedQuantity }`
- Catalog choices: Water, Food, Shelter, Medical Supplies, Clothing, Hygiene Kits, Baby Supplies, Electricity, Communications, Transport, Volunteers, Logistics Support, Equipment, Other

Money campaigns still use `targetAmountCentavos` / `raisedAmountCentavos`. Goods-only campaigns may submit without PayMongo; money/`both` still require a Linked Account.

### Campaign statuses
`draft` → `pending_approval` → `published` | `rejected` | `closed`

### Donation statuses
`pending` | `paid` | `failed` | `expired` | `cancelled`

## Server setup (test mode)

1. Add PayMongo **test** keys to `.env`:
   - `PAYMONGO_SECRET_KEY=sk_test_…`
   - `PAYMONGO_PUBLIC_KEY=pk_test_…`
   - `PAYMONGO_WEBHOOK_SECRET=…`
2. Set Firebase Admin credentials:
   - `FIREBASE_PROJECT_ID=kalinga-74544`
   - `FIREBASE_CREDENTIALS=C:\path\to\serviceAccount.json`
3. Point a PayMongo webhook to: `https://YOUR_APP/api/paymongo/webhook`
4. Merge `firestore.rules` donation rules into the Firebase Console rules.
5. `composer install` and `npm run build`.

## Organization flows

1. `/donation` — save PayMongo Linked Account ID (`organizations/{uid}.paymongo.linkedAccountId`).
2. Create campaign → Save draft or Submit for approval.
3. View progress + transactions on campaign details.

## Admin

1. Dashboard → **Campaigns** tab.
2. Approve (publishes) or Reject pending campaigns.

## Backend payment endpoints

- `POST /api/donations/checkout` — Firebase ID token required; creates pending donation + PayMongo Checkout for the org linked account.
- `POST /api/paymongo/webhook` — verifies signature, writes `payment_events`, updates donation + campaign totals once.
- Redirect pages: `/donations/success`, `/donations/cancel`
