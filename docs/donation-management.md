# Kalinga Donation Management System (Organization)

Kalinga connects volunteers and organizations. Donors pay through **Maya Checkout**. Funds settle to the platform Maya merchant account; campaign totals are tracked per organization. Admin can disburse to orgs outside the app.

This web app covers **organization campaign management** and **admin approval**. Checkout API + webhook remain on the Laravel backend for payment processing.

## Collections

| Collection | Purpose |
|---|---|
| `donation_campaigns` | Campaign metadata, money and/or goods targets, approval status |
| `donations` | One checkout attempt; amounts in **integer centavos** (money) |

### Campaign donation modes
`money` | `goods` | `both`

Campaign fields for goods:
- `donationMode`, `acceptsMoney`, `acceptsGoods`
- `inKindItems[]`: `{ id, label, unit, targetQuantity, receivedQuantity }`
- Catalog choices: Water, Food, Shelter, Medical Supplies, Clothing, Hygiene Kits, Baby Supplies, Electricity, Communications, Transport, Volunteers, Logistics Support, Equipment, Other

Money campaigns still use `targetAmountCentavos` / `raisedAmountCentavos`. No per-org payment account is required.

### Campaign statuses
`draft` → `pending_approval` → `published` | `rejected` | `closed`

### Donation statuses
`pending` | `paid` | `failed` | `expired` | `cancelled`

## Server setup (sandbox)

1. Add Maya sandbox keys to `.env`:
   - `MAYA_PUBLIC_KEY=…`
   - `MAYA_SECRET_KEY=…`
   - `MAYA_BASE_URL=https://pg-sandbox.paymaya.com`
2. Set Firebase Admin credentials:
   - `FIREBASE_PROJECT_ID=kalinga-74544`
   - `FIREBASE_CREDENTIALS=C:\path\to\serviceAccount.json`
3. Point a Maya webhook to: `https://YOUR_APP/api/maya/webhook`
4. Merge `firestore.rules` donation rules into the Firebase Console rules.
5. `composer install` and `npm run build`.

## Organization flows

1. `/donation` — create and track fundraising campaigns.
2. Create campaign → Save draft or Submit for approval.
3. View progress + transactions on campaign details.

## Admin

1. Dashboard → **Campaigns** tab.
2. Approve (publishes) or Reject pending campaigns.

## Backend payment endpoints

- `POST /api/donations/checkout` — Firebase ID token required; creates pending donation + Maya Checkout.
- `POST /api/maya/webhook` — confirms Maya payment status, updates donation + campaign totals.
- Redirect pages: `/donations/success`, `/donations/cancel`
