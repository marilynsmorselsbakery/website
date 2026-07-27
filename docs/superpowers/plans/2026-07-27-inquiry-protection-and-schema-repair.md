# Inquiry Protection and Schema Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the observed bulk-inquiry spam, require structured quantity and date values, and add a working image URL to every Product JSON-LD record.

**Architecture:** Keep inquiry normalization and email formatting in the existing `lib/email/bulk-inquiry.ts` boundary, with the API route responsible for silent honeypot handling and Resend delivery. Keep the form visually unchanged except for replacing the combined free-text field with number/date controls. Reuse the existing product-image map when building JSON-LD, and add an external Vercel WAF rate-limit rule only for the inquiry POST route.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript 5.9, Vitest 4, Resend, Vercel WAF.

## Global Constraints

- Keep normal bot protection invisible; do not add a CAPTCHA widget in this phase.
- Quantity is a required whole number from `1` through `100000`.
- Needed-by date is a required real `YYYY-MM-DD` date that is today or later in `America/New_York`.
- Honeypot submissions must not call Resend or emit `generate_lead`.
- Rate-limit only `POST /api/bulk-inquiry`: five requests per source IP per ten-minute fixed window.
- Reuse `lib/product-images.ts`; do not create a duplicate image map.
- Every Product JSON-LD record must contain an absolute HTTPS image URL that returns HTTP `200`.
- Do not enable Stripe automatic tax or create a Stripe tax registration.
- Do not stage or commit the two pre-existing modified July 17 analytics documents.

---

## File Map

- `lib/email/bulk-inquiry.ts`: inquiry payload types, normalization, date validation, honeypot detection, and notification formatting.
- `lib/email/bulk-inquiry.test.ts`: behavior tests for quantity/date parsing, honeypot recognition, and email content.
- `app/api/bulk-inquiry/route.ts`: silent honeypot response, validated delivery, and HTTP outcomes.
- `app/api/bulk-inquiry/route.test.ts`: route-level proof that spam does not send and valid inquiries do.
- `app/bulk-orders/BulkOrdersContent.tsx`: number/date controls, hidden honeypot, analytics gating, and rate-limit message.
- `app/bulk-orders/page.tsx`: supplies the Eastern current date used as the browser date minimum.
- `components/ProductSchema.tsx`: builds Product JSON-LD with image URLs from the existing map.
- `components/ProductSchema.test.tsx`: validates actual generated Product records and preserved offers.
- `.env.example`: no new key is required; update only if implementation reveals a missing documented variable.

---

### Task 1: Structured inquiry normalization and email output

**Files:**
- Modify: `lib/email/bulk-inquiry.test.ts`
- Modify: `lib/email/bulk-inquiry.ts`

**Interfaces:**
- Produces: `easternDateString(now?: Date): string`
- Produces: `isBulkInquiryHoneypot(payload: unknown): boolean`
- Produces: `parseBulkInquiryPayload(payload, metadata, options?): BulkInquiryData | null`
- `BulkInquiryData` replaces `details: string` with `quantity: number` and `neededByDate: string`.

- [ ] **Step 1: Write failing parser and email tests**

Add literal, table-driven cases:

```ts
const metadata = {
  id: "inquiry_123",
  submittedAt: "2026-07-21T16:30:00.000Z",
};

expect(
  parseBulkInquiryPayload(
    {
      name: "Jamie Customer",
      company: "Acme Events",
      email: "jamie@example.com",
      phone: "614-555-0123",
      quantity: "120",
      neededByDate: "2026-08-15",
      notes: "Chocolate chip",
    },
    metadata,
    { today: "2026-07-27" }
  )
).toMatchObject({
  quantity: 120,
  neededByDate: "2026-08-15",
});
```

Add rejection tables for quantities `"0"`, `"-1"`, `"1.5"`, `"cookies"`,
and `"100001"`; dates `"07/31/2026"`, `"2026-02-31"`, and `"2026-07-26"`.
Add acceptance cases for `"2026-07-27"` and `"2026-07-28"`.

Add honeypot cases proving an empty or absent `website` is clean and a
non-empty string is automated.

Update the email test to require:

```ts
expect(deliveries[0].message.text).toContain("Estimated quantity: 120 cookies");
expect(deliveries[0].message.text).toContain("Needed by: Aug 15, 2026");
expect(deliveries[0].message.subject).toBe(
  "NEW BULK INQUIRY — Jamie Customer — 120 cookies — Aug 15, 2026"
);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
npm test -- --run lib/email/bulk-inquiry.test.ts
```

Expected: FAIL because the parser still reads `details`, lacks the date and
honeypot functions, and the email lacks the new labels.

- [ ] **Step 3: Implement the minimal domain changes**

Use the following public shapes:

```ts
export type BulkInquiryData = {
  id: string;
  submittedAt: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  quantity: number;
  neededByDate: string;
  notes: string;
};

export function easternDateString(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function isBulkInquiryHoneypot(payload: unknown): boolean {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return false;
  const value = (payload as Record<string, unknown>).website;
  return typeof value === "string" && value.trim().length > 0;
}
```

Validate quantity with exact digits before conversion, validate a date by
round-tripping its UTC year/month/day, and compare normalized date strings
lexicographically only after format and calendar validation pass.

Format the email date from `${neededByDate}T12:00:00Z` so a date-only value
cannot shift to the previous day in Eastern Time.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```powershell
npm test -- --run lib/email/bulk-inquiry.test.ts
```

Expected: all tests in the file PASS.

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- lib/email/bulk-inquiry.ts lib/email/bulk-inquiry.test.ts
git commit -m "fix: validate bulk inquiry quantity and date"
```

---

### Task 2: Honeypot route behavior and structured form controls

**Files:**
- Modify: `app/api/bulk-inquiry/route.test.ts`
- Modify: `app/api/bulk-inquiry/route.ts`
- Modify: `app/bulk-orders/BulkOrdersContent.tsx`
- Modify: `app/bulk-orders/page.tsx`

**Interfaces:**
- Consumes: `easternDateString`, `isBulkInquiryHoneypot`, and the updated parser from Task 1.
- Produces: `BulkOrdersContent({ minimumDate }: { minimumDate: string })`.

- [ ] **Step 1: Write failing route tests**

Update the valid request fixture to send:

```ts
quantity: "120",
neededByDate: "2099-08-15",
website: "",
```

Add a route test:

```ts
it("silently accepts a honeypot submission without sending email", async () => {
  const { POST } = await import("./route");
  const response = await POST(
    new NextRequest("https://marilynsmorsels.com/api/bulk-inquiry", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Bot",
        email: "bot@example.com",
        quantity: "120",
        neededByDate: "2099-08-15",
        website: "https://spam.example",
      }),
    })
  );

  expect(response.status).toBe(200);
  expect(resendSend).not.toHaveBeenCalled();
});
```

Add a route test proving invalid quantity/date returns `400` and does not call
Resend.

- [ ] **Step 2: Run the route test and verify RED**

Run:

```powershell
npm test -- --run app/api/bulk-inquiry/route.test.ts
```

Expected: honeypot test FAILS because the route sends the message; valid fixture
fails until the route uses the updated parser contract.

- [ ] **Step 3: Implement the server route behavior**

Parse JSON before delivery, then short-circuit:

```ts
const payload = await request.json();

if (isBulkInquiryHoneypot(payload)) {
  return NextResponse.json({ ok: true });
}

const inquiry = parseBulkInquiryPayload(payload, {
  id: randomUUID(),
  submittedAt: new Date().toISOString(),
});
```

Keep the Resend configuration failure, validation failure, delivery call, and
delivery-error behavior otherwise unchanged.

- [ ] **Step 4: Implement the form controls**

Change the component signature:

```ts
export default function BulkOrdersContent({
  minimumDate,
}: {
  minimumDate: string;
}) {
```

Add a honeypot inside the form:

```tsx
<div className="absolute -left-[10000px]" aria-hidden="true">
  <label htmlFor="website">Website</label>
  <input
    id="website"
    name="website"
    type="text"
    tabIndex={-1}
    autoComplete="off"
  />
</div>
```

Replace `details` with:

```tsx
<input
  id="quantity"
  name="quantity"
  type="number"
  min={1}
  max={100000}
  step={1}
  required
/>

<input
  id="neededByDate"
  name="neededByDate"
  type="date"
  min={minimumDate}
  required
/>
```

Before `fetch`, silently accept a filled honeypot without tracking:

```ts
if (String(formData.get("website") ?? "").trim()) {
  setStatus("sent");
  return;
}
```

For response status `429`, render: `Too many attempts. Please wait a few
minutes and try again.` Keep `generate_lead` gated on a successful real API
response.

In `page.tsx`, pass:

```tsx
return <BulkOrdersContent minimumDate={easternDateString()} />;
```

- [ ] **Step 5: Run route and domain tests**

Run:

```powershell
npm test -- --run app/api/bulk-inquiry/route.test.ts lib/email/bulk-inquiry.test.ts
```

Expected: both files PASS and Resend is called only for the valid route case.

- [ ] **Step 6: Commit Task 2**

```powershell
git add -- app/api/bulk-inquiry/route.ts app/api/bulk-inquiry/route.test.ts app/bulk-orders/BulkOrdersContent.tsx app/bulk-orders/page.tsx
git commit -m "fix: block automated bulk inquiries"
```

---

### Task 3: Product schema image URLs

**Files:**
- Create: `components/ProductSchema.test.tsx`
- Modify: `components/ProductSchema.tsx`

**Interfaces:**
- Produces: `buildProductSchemas(products: Product[]): ProductSchemaRecord[]`
- Consumes: `getProductImage(product.id).src` from `lib/product-images.ts`.

- [ ] **Step 1: Write the failing Product schema test**

Create a real product fixture and test the public builder:

```ts
const [schema] = buildProductSchemas([
  {
    id: "chocolate_chip",
    flavor: "chocolate_chip",
    name: "Old Fashion Chocolate Chip",
    description: "Classic cookies.",
    category: "cookie",
    variants: [
      {
        sku: "cc-6",
        stripeProductId: "prod_123",
        stripePriceId: "price_123",
        packSize: "6",
        packLabel: "Half-Dozen",
        priceCents: 1300,
      },
    ],
  },
]);

expect(schema.image).toMatch(
  /^https:\/\/marilynsmorsels\.com\/_next\/static\/media\//
);
expect(schema.offers).toHaveLength(1);
expect(schema.offers[0]).toMatchObject({
  priceCurrency: "USD",
  price: "13.00",
});
```

- [ ] **Step 2: Run the Product schema test and verify RED**

Run:

```powershell
npm test -- --run components/ProductSchema.test.tsx
```

Expected: FAIL because `buildProductSchemas` is not exported and Product
records have no `image`.

- [ ] **Step 3: Implement the schema builder**

Import the existing map and add the absolute URL:

```ts
import { getProductImage } from "@/lib/product-images";

const SITE_URL = "https://marilynsmorsels.com";

export function buildProductSchemas(products: Product[]) {
  return products.map((product) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    image: new URL(getProductImage(product.id).src, SITE_URL).toString(),
    // Preserve the existing description, category, brand, and offers.
  }));
}
```

Have `ProductSchema` serialize `buildProductSchemas(products)`.

- [ ] **Step 4: Run the Product schema test and verify GREEN**

Run:

```powershell
npm test -- --run components/ProductSchema.test.tsx
```

Expected: PASS with one absolute image and the existing offer.

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- components/ProductSchema.tsx components/ProductSchema.test.tsx
git commit -m "fix: add images to product structured data"
```

---

### Task 4: Full verification, deployment, and WAF rule

**Files:**
- No additional production files expected.
- Do not modify Stripe tax settings.

**Interfaces:**
- Consumes: all code from Tasks 1–3.
- Produces: deployed code and one Vercel WAF rule.

- [ ] **Step 1: Run the complete local verification gate**

```powershell
npm test
npm run lint
npx tsc --noEmit
npm run build
git diff --check HEAD~3..HEAD
```

Expected: each command exits `0`; Vitest reports zero failed tests; lint and
typecheck report zero errors; the production build completes.

- [ ] **Step 2: Inspect commit scope**

```powershell
git status --short --branch
git log --oneline origin/main..HEAD
git diff --stat origin/main..HEAD
```

Expected: only the approved spec, plan, inquiry files, and Product schema files
are committed. The two pre-existing July 17 document modifications remain
unstaged and are not part of the commit diff.

- [ ] **Step 3: Push the verified commits**

```powershell
git push origin main
```

Expected: push succeeds and the Vercel Git integration starts a production
deployment.

- [ ] **Step 4: Wait for and inspect production deployment**

Use the hosting dashboard or deployment API to confirm the commit is deployed
to `https://marilynsmorsels.com`. Do not infer deployment from a successful
Git push alone.

- [ ] **Step 5: Configure the Vercel WAF rule**

In the Marilyn's Morsels Vercel project:

- Match request path exactly `/api/bulk-inquiry`.
- Match method `POST`.
- Action: Rate Limit.
- Key: IP.
- Algorithm: Fixed Window.
- Window: ten minutes.
- Limit: five requests.

Save the rule and verify it is active. Do not alter any existing unrelated WAF
rules.

- [ ] **Step 6: Verify production form behavior without generating spam**

First submit controlled invalid payloads to exercise the rate limit. Confirm
the initial responses are `400` and the over-limit response is `429`; invalid
payloads must not generate Resend email.

After the window clears, submit one legitimate controlled inquiry through the
browser. Confirm the success message and exactly one notification email with
separate quantity and needed-by fields.

Submit one honeypot payload directly and confirm the route returns generic
success while no notification email arrives.

- [ ] **Step 7: Verify production Product JSON-LD**

Fetch `/shop`, parse all `application/ld+json` scripts, and assert:

```ts
for (const product of productSchemas) {
  if (!product.image?.startsWith("https://marilynsmorsels.com/")) {
    throw new Error(`Missing absolute image for ${product.name}`);
  }
  const imageResponse = await fetch(product.image, { method: "HEAD" });
  if (!imageResponse.ok) {
    throw new Error(`Image failed for ${product.name}: ${imageResponse.status}`);
  }
}
```

Run Google's Rich Results Test on `/shop`. If Search Console access is
available, start validation for the reported missing-image issue.

- [ ] **Step 8: Final scope and tax safety check**

Use a read-only Stripe API query to confirm:

- Automatic tax remains disabled on a newly created Checkout Session.
- The account still has zero tax registrations.

Do not create a payment. Smoke-test only through arrival at Stripe Checkout.
