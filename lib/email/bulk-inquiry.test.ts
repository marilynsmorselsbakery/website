import { describe, expect, it } from "vitest";
import {
  easternDateString,
  isBulkInquiryHoneypot,
  parseBulkInquiryPayload,
  sendBulkInquiryEmail,
  type BulkInquiryEmailMessage,
} from "./bulk-inquiry";

describe("bulk inquiry email", () => {
  const metadata = {
    id: "inquiry_123",
    submittedAt: "2026-07-21T16:30:00.000Z",
  };

  it("delivers the inquiry details to Marilyn with customer reply-to", async () => {
    const deliveries: Array<{
      message: BulkInquiryEmailMessage;
      idempotencyKey: string;
    }> = [];

    await sendBulkInquiryEmail(
      {
        id: "inquiry_123",
        submittedAt: "2026-07-21T16:30:00.000Z",
        name: "Jamie Customer",
        company: "Acme Events",
        email: "jamie@example.com",
        phone: "614-555-0123",
        quantity: 120,
        neededByDate: "2026-08-15",
        notes: "Chocolate chip and snickerdoodle",
      },
      async (message, options) => {
        deliveries.push({ message, idempotencyKey: options.idempotencyKey });
        return { id: "email_123" };
      },
      {
        from: "Marilyn's Morsels <orders@marilynsmorsels.com>",
        businessEmail: "marilynsmorselsbakery@gmail.com",
      }
    );

    expect(deliveries).toHaveLength(1);
    expect(deliveries[0]).toMatchObject({
      idempotencyKey: "bulk-inquiry/inquiry_123",
      message: {
        to: "marilynsmorselsbakery@gmail.com",
        replyTo: "jamie@example.com",
        subject:
          "NEW BULK INQUIRY — Jamie Customer — 120 cookies — Aug 15, 2026",
      },
    });
    expect(deliveries[0].message.text).toContain("Acme Events");
    expect(deliveries[0].message.text).toContain("614-555-0123");
    expect(deliveries[0].message.text).toContain(
      "Estimated quantity: 120 cookies"
    );
    expect(deliveries[0].message.text).toContain("Needed by: Aug 15, 2026");
    expect(deliveries[0].message.text).toContain(
      "Chocolate chip and snickerdoodle"
    );
  });

  it("normalizes a valid form submission", () => {
    expect(
      parseBulkInquiryPayload(
        {
          name: "  Jamie Customer  ",
          company: "  Acme Events ",
          email: " JAMIE@EXAMPLE.COM ",
          phone: " 614-555-0123 ",
          quantity: "120",
          neededByDate: "2026-08-15",
          notes: " Chocolate chip ",
        },
        metadata,
        { today: "2026-07-27" }
      )
    ).toEqual({
      id: "inquiry_123",
      submittedAt: "2026-07-21T16:30:00.000Z",
      name: "Jamie Customer",
      company: "Acme Events",
      email: "jamie@example.com",
      phone: "614-555-0123",
      quantity: 120,
      neededByDate: "2026-08-15",
      notes: "Chocolate chip",
    });
  });

  it.each(["0", "-1", "1.5", "cookies", "100001"])(
    "rejects invalid quantity %s",
    (quantity) => {
      expect(
        parseBulkInquiryPayload(
          {
            name: "Jamie Customer",
            email: "jamie@example.com",
            quantity,
            neededByDate: "2026-08-15",
          },
          metadata,
          { today: "2026-07-27" }
        )
      ).toBeNull();
    }
  );

  it.each(["07/31/2026", "2026-02-31", "2026-07-26"])(
    "rejects invalid needed-by date %s",
    (neededByDate) => {
      expect(
        parseBulkInquiryPayload(
          {
            name: "Jamie Customer",
            email: "jamie@example.com",
            quantity: "120",
            neededByDate,
          },
          metadata,
          { today: "2026-07-27" }
        )
      ).toBeNull();
    }
  );

  it.each(["2026-07-27", "2026-07-28"])(
    "accepts needed-by date %s",
    (neededByDate) => {
      expect(
        parseBulkInquiryPayload(
          {
            name: "Jamie Customer",
            email: "jamie@example.com",
            quantity: "120",
            neededByDate,
          },
          metadata,
          { today: "2026-07-27" }
        )
      ).toMatchObject({ neededByDate });
    }
  );

  it("rejects an incomplete or invalid form submission", () => {
    expect(
      parseBulkInquiryPayload(
        {
          name: "Jamie Customer",
          email: "not-an-email",
          quantity: "120",
          neededByDate: "2026-08-15",
        },
        metadata,
        { today: "2026-07-27" }
      )
    ).toBeNull();
  });

  it("recognizes only a filled website honeypot as automated", () => {
    expect(isBulkInquiryHoneypot({})).toBe(false);
    expect(isBulkInquiryHoneypot({ website: "" })).toBe(false);
    expect(isBulkInquiryHoneypot({ website: "   " })).toBe(false);
    expect(isBulkInquiryHoneypot({ website: "https://spam.example" })).toBe(
      true
    );
  });

  it("formats the Eastern calendar date at a UTC day boundary", () => {
    expect(easternDateString(new Date("2026-07-28T02:00:00.000Z"))).toBe(
      "2026-07-27"
    );
  });
});
