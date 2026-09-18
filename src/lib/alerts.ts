import { ownerWhatsAppNumber, sendWhatsApp } from "./whatsapp";
import { normalizePhone } from "./utils";

function developerWhatsAppNumber(): string | null {
  const raw = process.env.DEVELOPER_WHATSAPP_NUMBER;
  if (!raw) return null;
  return normalizePhone(raw);
}

/**
 * Best-effort WhatsApp text to the owner (and the developer, if configured)
 * when something important fails: a payment error, a webhook signature
 * mismatch, an OTA sync error, or a double-booking conflict. Never throws —
 * alerting should never break the calling flow.
 */
export async function notifyFailure(subject: string, detail: string) {
  const body = `⚠️ Sunset Point Homestay — ${subject}\n${detail}`.slice(0, 1500);
  const owner = ownerWhatsAppNumber();
  const developer = developerWhatsAppNumber();
  const targets = new Set([owner]);
  if (developer && developer !== owner) targets.add(developer);

  await Promise.all(
    Array.from(targets).map(async (to) => {
      try {
        await sendWhatsApp(to, body);
      } catch (error) {
        console.error("notifyFailure: alert send failed", to, error);
      }
    }),
  );
}
