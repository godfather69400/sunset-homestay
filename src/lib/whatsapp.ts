import twilio from "twilio";
import { PROPERTY } from "./constants";
import { formatDisplayDate, normalizePhone } from "./utils";

type ConfirmationInput = {
  guestName: string;
  guestPhone: string;
  bookingNumber: string;
  checkIn: Date | string;
  checkOut: Date | string;
  roomName: string;
};

export function formatConfirmationMessage(input: ConfirmationInput) {
  return [
    `Namaste ${input.guestName}! Your stay at Sunset Point Homestay, Bir is confirmed.`,
    `- Booking ID: ${input.bookingNumber}`,
    `- Check-in: ${formatDisplayDate(input.checkIn)} (${PROPERTY.checkIn})`,
    `- Check-out: ${formatDisplayDate(input.checkOut)} (${PROPERTY.checkOut})`,
    `- Room: ${input.roomName}`,
    `- Google Maps: ${PROPERTY.mapsUrl}`,
    `Need a taxi from Baijnath or paragliding? Reply on this chat.`,
  ].join("\n");
}

export function formatOwnerMessage(input: ConfirmationInput) {
  return [
    `New direct booking at Sunset Point Homestay`,
    `- Booking ID: ${input.bookingNumber}`,
    `- Guest: ${input.guestName}`,
    `- Phone: ${normalizePhone(input.guestPhone)}`,
    `- Room: ${input.roomName}`,
    `- Check-in: ${formatDisplayDate(input.checkIn)} (${PROPERTY.checkIn})`,
    `- Check-out: ${formatDisplayDate(input.checkOut)} (${PROPERTY.checkOut})`,
  ].join("\n");
}

export function ownerWhatsAppNumber() {
  const raw = process.env.WHATSAPP_OWNER_NUMBER ?? process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? PROPERTY.phoneDigits;
  return normalizePhone(raw);
}

function isTwilioConfigured() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_FROM);
}

function isMetaConfigured() {
  return Boolean(process.env.WHATSAPP_CLOUD_PHONE_ID && process.env.WHATSAPP_CLOUD_TOKEN);
}

async function sendViaTwilio(to: string, body: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_WHATSAPP_FROM;
  if (!sid || !token || !from) {
    throw new Error("Twilio WhatsApp is not configured.");
  }
  const client = twilio(sid, token);
  await client.messages.create({
    from,
    to: `whatsapp:${to}`,
    body,
  });
}

async function sendViaCloudApi(to: string, body: string) {
  const phoneId = process.env.WHATSAPP_CLOUD_PHONE_ID;
  const token = process.env.WHATSAPP_CLOUD_TOKEN;
  if (!phoneId || !token) {
    throw new Error("WhatsApp Cloud API is not configured.");
  }

  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: to.replace("+", ""),
      type: "text",
      text: { body, preview_url: true },
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`WhatsApp Cloud API failed: ${detail}`);
  }
}

async function sendWhatsApp(to: string, body: string) {
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";
  if (provider === "meta") {
    await sendViaCloudApi(to, body);
    return;
  }
  await sendViaTwilio(to, body);
}

export async function sendBookingConfirmation(input: ConfirmationInput) {
  if (!isTwilioConfigured() && !isMetaConfigured()) {
    return {
      sent: false,
      error:
        "WhatsApp is not connected. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and TWILIO_WHATSAPP_FROM in Vercel.",
    };
  }

  const guestTo = normalizePhone(input.guestPhone);
  const ownerTo = ownerWhatsAppNumber();
  const targets = [{ to: guestTo, body: formatConfirmationMessage(input) }];
  if (ownerTo.replace(/\D/g, "") !== guestTo.replace(/\D/g, "")) {
    targets.push({ to: ownerTo, body: formatOwnerMessage(input) });
  }

  const errors: string[] = [];
  for (const target of targets) {
    try {
      await sendWhatsApp(target.to, target.body);
    } catch (error) {
      const message = error instanceof Error ? error.message : "WhatsApp send failed";
      console.error("WhatsApp confirmation failed", target.to, message);
      errors.push(`${target.to}: ${message}`);
    }
  }

  if (errors.length === targets.length) {
    return { sent: false, error: errors.join(" | ") };
  }

  return { sent: true, error: errors.length ? errors.join(" | ") : null };
}
