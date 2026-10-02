# Optional donation pop-up system

The donation system is independent from membership and ticket workflows. A donation never changes membership eligibility, ticket validity, registration limits, OTP verification, or admin approval decisions.

## Migration

For WampServer/MariaDB:

```powershell
mysql -u root leaders_db < database/migrations/005_optional_donations.sql
```

The migration creates:

- `donations`
- `donation_events`

It also adds:

- `donations.view`
- `donations.manage`

## Environment variables

```env
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
NEXT_PUBLIC_PAYPAL_CLIENT_ID=
DONATION_POPUP_SESSION_LIMIT=1
DONATION_POPUP_LATER_DAYS=7
DONATION_POPUP_DECLINED_DAYS=30
DONATION_POPUP_DONOR_DAYS=90
DONATION_POPUP_SCROLL_THRESHOLD=90
```

Keep `PAYPAL_CLIENT_SECRET` only on the server. The app uses the official PayPal Checkout SDK and never stores card numbers, CVV, card expiry, PayPal passwords, or banking credentials.

## PayPal setup

1. Create a PayPal developer app in sandbox.
2. Copy the client ID into `PAYPAL_CLIENT_ID` and optionally `NEXT_PUBLIC_PAYPAL_CLIENT_ID`.
3. Copy the secret into `PAYPAL_CLIENT_SECRET`.
4. Set `PAYPAL_MODE=sandbox`.
5. Test a donation with a sandbox buyer account.
6. For production, switch to live PayPal credentials and `PAYPAL_MODE=live`.

Card funding through PayPal Checkout depends on the configured PayPal merchant account, country, currency, and PayPal eligibility. If card funding is unavailable, PayPal wallet payment remains available.

## Triggers

Enabled trigger contexts:

- `membership_completed`: opens after the membership success confirmation is visible.
- `page_bottom`: opens when a bottom sentinel becomes visible on eligible public pages.

Excluded pages include login, admin console, member area, ticket/register/payment/OTP flows, scanner pages, privacy/legal pages, API routes, and error pages.

## Frequency rules

Preferences are stored with first-party local storage/cookies:

- `donation_popup_last_shown_at`
- `donation_popup_dismissed_until`
- `donation_popup_completed_at`
- `donation_popup_choice`

Defaults:

- At most once per browsing session.
- “Plus tard”: hide for 7 days.
- “Non merci”: hide for 30 days.
- Completed donation: hide for 90 days.

## Admin

The admin console has a Donations section with:

- Donation list and masked donor emails.
- Summary cards for confirmed totals and payment states.
- Filters by context, page, status, anonymous state, and amount range.
- Popup configuration for triggers, eligible pages, threshold, amounts, max amount, currency, text, delays, and anonymous donations.

Payment secrets are not editable from the admin UI.

## Email

Donation confirmation email reuses the existing SMTP system and is sent only after backend PayPal capture verification. It is titled “Confirmation de don” and is not described as a tax receipt.
