const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const SENDER = "Mac Place"; // AlphaSender ID (must be approved in Twilio)

export async function sendSMS(to: string, message: string): Promise<boolean> {
  if (!ACCOUNT_SID || !AUTH_TOKEN) {
    console.warn("[SMS] TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set — skipping");
    return false;
  }

  // Normalize French phone number to E.164 format (+33...)
  const normalized = normalizePhone(to);
  if (!normalized) {
    console.warn(`[SMS] Invalid phone number: ${to}`);
    return false;
  }

  try {
    const body = new URLSearchParams({
      To: normalized,
      From: SENDER,
      Body: message,
    });

    const credentials = Buffer.from(`${ACCOUNT_SID}:${AUTH_TOKEN}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${ACCOUNT_SID}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );

    const data = await res.json() as { sid?: string; error_message?: string };
    if (!res.ok) {
      console.error("[SMS] Twilio error:", data.error_message ?? res.status);
      return false;
    }
    console.log(`[SMS] Sent to ${normalized} — sid=${data.sid}`);
    return true;
  } catch (err) {
    console.error("[SMS] Exception:", err);
    return false;
  }
}

function normalizePhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("33") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`;
  if (digits.length === 9) return `+33${digits}`;
  return null;
}
