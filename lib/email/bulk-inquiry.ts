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

export type BulkInquiryEmailMessage = {
  from: string;
  to: string;
  replyTo: string;
  subject: string;
  html: string;
  text: string;
};

export type BulkInquiryEmailSender = (
  message: BulkInquiryEmailMessage,
  options: { idempotencyKey: string }
) => Promise<{ id?: string }>;

function readString(
  payload: Record<string, unknown>,
  field: string,
  maxLength: number
): string | null {
  const value = payload[field];
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;

  const normalized = value.trim();
  return normalized.length <= maxLength ? normalized : null;
}

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
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return false;
  }

  const value = (payload as Record<string, unknown>).website;
  return typeof value === "string" && value.trim().length > 0;
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(0);
  parsed.setUTCHours(0, 0, 0, 0);
  parsed.setUTCFullYear(year, month - 1, day);

  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  );
}

export function parseBulkInquiryPayload(
  payload: unknown,
  metadata: { id: string; submittedAt: string },
  options: { today?: string } = {}
): BulkInquiryData | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;

  const data = payload as Record<string, unknown>;
  const name = readString(data, "name", 100);
  const company = readString(data, "company", 150);
  const email = readString(data, "email", 254)?.toLowerCase() ?? null;
  const phone = readString(data, "phone", 50);
  const quantityValue = readString(data, "quantity", 6);
  const neededByDate = readString(data, "neededByDate", 10);
  const notes = readString(data, "notes", 2_000);
  const quantity =
    quantityValue && /^\d+$/.test(quantityValue)
      ? Number(quantityValue)
      : Number.NaN;
  const today = options.today ?? easternDateString();

  if (
    !name ||
    company === null ||
    !email ||
    phone === null ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    quantity > 100_000 ||
    !neededByDate ||
    !isCalendarDate(neededByDate) ||
    neededByDate < today ||
    notes === null ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return null;
  }

  return {
    ...metadata,
    name,
    company,
    email,
    phone,
    quantity,
    neededByDate,
    notes,
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function display(value: string): string {
  return value || "Not provided";
}

function formatNeededByDate(value: string): string {
  return new Date(`${value}T12:00:00.000Z`).toLocaleDateString("en-US", {
    dateStyle: "medium",
    timeZone: "America/New_York",
  });
}

export async function sendBulkInquiryEmail(
  inquiry: BulkInquiryData,
  send: BulkInquiryEmailSender,
  config: { from: string; businessEmail: string }
): Promise<void> {
  const submittedAt = new Date(inquiry.submittedAt).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/New_York",
  });
  const neededByDate = formatNeededByDate(inquiry.neededByDate);
  const quantity = `${inquiry.quantity.toLocaleString("en-US")} cookies`;
  const text = `NEW BULK INQUIRY

Submitted: ${submittedAt} ET
Name: ${inquiry.name}
Company: ${display(inquiry.company)}
Email: ${inquiry.email}
Phone: ${display(inquiry.phone)}

Estimated quantity: ${quantity}
Needed by: ${neededByDate}

NOTES & PREFERENCES
${display(inquiry.notes)}

Reply to this email to contact the customer.`;
  const html = `<!doctype html>
<html><body style="margin:0;background:#fff8ef;color:#3f2618;font-family:Arial,sans-serif">
<div style="max-width:640px;margin:0 auto;padding:32px 20px">
  <div style="background:#ffffff;border:1px solid #ead7c2;border-radius:14px;overflow:hidden">
    <div style="background:#8b5a17;color:#ffffff;padding:22px 28px">
      <div style="font-size:13px;letter-spacing:1.5px;text-transform:uppercase">Marilyn's Morsels</div>
      <h1 style="font-size:26px;line-height:1.25;margin:8px 0 0">New bulk inquiry</h1>
    </div>
    <div style="padding:26px 28px;line-height:1.55">
      <p style="margin-top:0"><strong>Submitted:</strong> ${escapeHtml(
        `${submittedAt} ET`
      )}</p>
      <h2 style="font-size:18px;margin-top:26px">Customer</h2>
      <p><strong>${escapeHtml(inquiry.name)}</strong><br>${escapeHtml(
        display(inquiry.company)
      )}<br><a href="mailto:${escapeHtml(inquiry.email)}">${escapeHtml(
        inquiry.email
      )}</a><br>${escapeHtml(display(inquiry.phone))}</p>
      <h2 style="font-size:18px;margin-top:26px">Order timing</h2>
      <p><strong>Estimated quantity:</strong> ${escapeHtml(
        quantity
      )}<br><strong>Needed by:</strong> ${escapeHtml(neededByDate)}</p>
      <h2 style="font-size:18px;margin-top:26px">Notes &amp; preferences</h2>
      <p>${escapeHtml(display(inquiry.notes))}</p>
      <p style="color:#72533f;margin-top:26px">Reply to this email to contact the customer.</p>
    </div>
  </div>
</div>
</body></html>`;

  await send(
    {
      from: config.from,
      to: config.businessEmail,
      replyTo: inquiry.email,
      subject: `NEW BULK INQUIRY — ${inquiry.name} — ${quantity} — ${neededByDate}`,
      html,
      text,
    },
    { idempotencyKey: `bulk-inquiry/${inquiry.id}` }
  );
}
