# Bulk Inquiry Protection and Merchant Schema Repair

**Date:** 2026-07-27
**Status:** Approved design, pending written-spec review
**Site:** https://marilynsmorsels.com

## Objective

Stop automated bulk-inquiry emails without adding visible friction for normal
customers, make the inquiry fields structurally valid, and repair the product
image omission reported by Google Search Console.

The Stripe Tax email was investigated as part of this work. It is an account
recommendation, not a checkout failure. No tax-collection change is included.

## Observed Causes

### Bulk inquiry spam

`POST /api/bulk-inquiry` currently sends any payload that contains non-empty
name, email, and free-form details fields and passes basic length checks. It has
no bot trap or request-rate control. The captured spam used syntactically valid
random strings, so the existing parser accepted it.

### Merchant listing warning

The live `/shop` page currently emits eight `Product` JSON-LD records. All
eight contain offers but omit the top-level `image` property. Google Search
Console reports that omission as a critical merchant-listing issue.

### Stripe Tax notice

Read-only inspection of the live Stripe account found:

- Stripe Tax settings are active.
- Checkout automatic tax is disabled.
- There are no active tax registrations.
- The account default product tax code is `Biscuits/Cookies - Plain`.

Stripe requires an applicable tax registration before automatic collection is
enabled. Ohio Department of Taxation guidance generally treats food sold for
off-premises consumption as non-taxable. Marilyn's Morsels is a home bakery
using local delivery rather than on-premises dining. Because the final tax
determination belongs to Rick and a qualified tax professional, this project
will not enable automatic tax or create a registration.

## Approved Design

### 1. Bulk inquiry form fields

Replace the combined `Estimated quantity & date` text field with:

- `Estimated number of cookies`: an HTML number input.
  - Required.
  - Whole numbers only.
  - Minimum `1`.
  - Technical safety ceiling `100000`, chosen only to bound abusive input.
- `Needed-by date`: an HTML date input.
  - Required.
  - Minimum is the current local date.
  - Past dates are rejected.

The client-side controls improve the customer experience but are not trusted as
security boundaries. The server repeats every validation.

The business notification email will show quantity and needed-by date as
separate labeled values. The date will be human-readable in Eastern Time.

### 2. Server-side inquiry validation

The parser will accept the browser's string payload and enforce:

- Quantity contains digits only and converts to a whole number in the approved
  range.
- Needed-by date uses exact `YYYY-MM-DD` syntax.
- The date is a real calendar date; values such as February 31 are rejected.
- The date is today or later in `America/New_York`.
- Existing name, company, email, phone, notes, and length checks remain.

Invalid submissions return HTTP `400` and never call Resend.

### 3. Invisible bot protection

Use two layers that do not appear to ordinary customers:

1. **Honeypot field**
   - Add a visually hidden, non-focusable `website` field.
   - Legitimate customers leave it empty.
   - A non-empty value is treated as automated.
   - The server returns a generic success response without sending email, which
     avoids teaching simple bots how they were detected.
   - The client does not emit the `generate_lead` analytics event for a
     honeypot submission.

2. **Vercel Web Application Firewall rate limit**
   - Match only `POST /api/bulk-inquiry`.
   - Count by source IP.
   - Allow five requests in a ten-minute fixed window.
   - Return HTTP `429` after the limit.
   - Do not apply the rule to checkout, webhooks, or other routes.

The rate limit is an abuse guard, not proof that a visitor is human.
Distributed low-frequency submissions can evade an IP limit, while the
honeypot and structured fields target the random form-filling pattern already
observed. If verified spam continues after deployment, Cloudflare Turnstile
managed mode is the approved escalation path.

### 4. Customer-facing error handling

- A valid inquiry keeps the existing thank-you confirmation.
- A validation failure uses the existing general retry message; native field
  validation should catch normal mistakes before submission.
- A `429` response displays a specific request to wait a few minutes before
  trying again.
- A delivery failure remains an error and does not emit `generate_lead`.
- No submitted customer data is written to application logs.

### 5. Product structured-data image repair

Reuse the existing product-image map in `lib/product-images.ts`; do not create a
second image mapping.

For each `Product` JSON-LD record:

- Resolve the product's existing imported image.
- Convert the Next.js asset path to an absolute
  `https://marilynsmorsels.com/...` URL.
- Add that URL as the top-level `image` property.
- Keep the existing product name, description, category, brand, offers,
  pricing, availability, seller, and shop URL unchanged.

The rendered schema must contain one absolute, crawlable image URL for every
rendered product record. The corresponding image request must return HTTP
`200`.

### 6. Stripe Tax disposition

No application, product, registration, or Stripe Dashboard tax setting will be
changed in this project.

The Stripe email can be treated as an onboarding recommendation. Before any
future tax change:

1. Rick confirms the bakery's obligation with a qualified tax professional.
2. Any required government registration is completed.
3. The matching registration is recorded in Stripe.
4. Only then is `automatic_tax: { enabled: true }` considered for Checkout.

## Data Flow

1. Customer opens `/bulk-orders`.
2. Browser displays the normal fields plus the hidden honeypot.
3. Browser enforces required quantity/date constraints.
4. Submission reaches Vercel's rate-limit rule.
5. An allowed request reaches `POST /api/bulk-inquiry`.
6. The server checks the honeypot and validates all fields.
7. Only a clean, valid inquiry is formatted and sent through Resend.
8. Only confirmed delivery produces the client-side lead analytics event.

The product-schema repair is independent: `/shop` loads Stripe-backed products,
uses the existing product-image map, and emits JSON-LD containing the image URL.

## Test Strategy

### Automated regression tests

Write tests before production changes and confirm each new test fails for the
expected missing behavior.

Inquiry parser and route tests will cover:

- Valid quantity and needed-by date are normalized.
- Zero, negative, decimal, non-numeric, and above-ceiling quantities fail.
- Malformed, impossible, and past dates fail.
- Today and a future date pass.
- A honeypot submission returns success but does not call Resend.
- A valid submission calls Resend once.
- Invalid structured fields do not call Resend.
- Failed delivery does not report success.

Product-schema tests will cover:

- Every emitted `Product` has an absolute HTTPS image URL.
- Each product uses the existing mapped image rather than a new duplicate map.
- Existing offer data remains present.

### Build and static verification

Run:

- Targeted Vitest files.
- Full `npm test`.
- `npm run lint`.
- `npx tsc --noEmit`.
- `npm run build`.

### Post-deployment verification

- Submit one controlled legitimate inquiry and confirm exactly one business
  email arrives with separate quantity and date fields.
- Submit a honeypot payload and confirm no business email arrives.
- Exercise the rate-limit rule with invalid payloads so no email is generated;
  confirm the limit returns `429`.
- Fetch `/shop`, parse all live Product JSON-LD records, and confirm every one
  contains an absolute image URL.
- Confirm each emitted image URL returns HTTP `200`.
- Run Google's Rich Results Test on the deployed shop.
- Start Search Console's validation flow for the missing-image issue when
  available.
- Smoke-test add-to-cart through arrival at Stripe Checkout; no payment is
  required.

## Deployment

Code changes will be committed using the repository's required
`marilynsmorselsbakery@gmail.com` identity and pushed to `main`, which triggers
the production Vercel deployment.

The WAF rule will be configured on the Marilyn's Morsels Vercel project and
verified after the code deployment. Existing unrelated local documentation
changes will not be included in commits for this work.

## Out of Scope

- Turning on Stripe Tax or creating tax registrations.
- Providing legal or tax advice.
- Product-detail routes or a wider merchant-listing redesign.
- Replacing current product photography.
- General form redesign beyond the approved quantity/date and bot-protection
  changes.
- Changing checkout, pricing, delivery policy, or fulfillment behavior.

## Acceptance Criteria

- Random text cannot satisfy the quantity or date fields.
- Honeypot submissions do not send email.
- Repeated requests to the inquiry endpoint are rate-limited without affecting
  other routes.
- Legitimate customers encounter no bot widget during normal use.
- A valid inquiry still reaches the configured business inbox.
- Every live Product JSON-LD record includes a working absolute image URL.
- Checkout automatic tax remains disabled and no Stripe tax registration is
  created.
- Targeted tests, full tests, lint, typecheck, and production build pass.
