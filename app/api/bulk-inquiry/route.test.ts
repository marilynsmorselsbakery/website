import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { resendSend } = vi.hoisted(() => ({
  resendSend: vi.fn(),
}));

vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

describe("POST /api/bulk-inquiry", () => {
  beforeEach(() => {
    vi.stubEnv("RESEND_API_KEY", "re_test");
    resendSend.mockReset();
    resendSend.mockResolvedValue({ data: { id: "email_123" }, error: null });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("emails a valid inquiry before reporting success", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("https://marilynsmorsels.com/api/bulk-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Jamie Customer",
          company: "Acme Events",
          email: "jamie@example.com",
          phone: "614-555-0123",
          quantity: "120",
          neededByDate: "2099-08-15",
          notes: "Chocolate chip",
          website: "",
        }),
      })
    );

    expect(response.status).toBe(200);
    expect(resendSend).toHaveBeenCalledTimes(1);
    expect(resendSend.mock.calls[0][0]).toMatchObject({
      to: "marilynsmorselsbakery@gmail.com",
      replyTo: "jamie@example.com",
    });
  });

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
    expect(await response.json()).toEqual({ ok: true });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("silently accepts a honeypot even when email is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    vi.resetModules();
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("https://marilynsmorsels.com/api/bulk-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ website: "https://spam.example" }),
      })
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("rejects invalid structured fields without sending email", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new NextRequest("https://marilynsmorsels.com/api/bulk-inquiry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: "Jamie Customer",
          email: "jamie@example.com",
          quantity: "cookies",
          neededByDate: "not-a-date",
          website: "",
        }),
      })
    );

    expect(response.status).toBe(400);
    expect(resendSend).not.toHaveBeenCalled();
  });
});
