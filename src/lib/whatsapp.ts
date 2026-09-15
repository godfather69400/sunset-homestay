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
    `Namaste ${input.guestName}! 🏔️ Your stay at Sunset Point Homestay, Bir is confirmed!`,
    `- Booking ID: ${input.bookingNumber}`,
    `- Check-in: ${formatDisplayDate(input.checkIn)} (${PROPERTY.checkIn})`,
    `- Check-out: ${formatDisplayDate(input.checkOut)} (${PROPERTY.checkOut})`,
    `- Room: ${input.roomName}`,
    `- Google Maps Directions: ${PROPERTY.mapsUrl}`,
    `Need a taxi from Baijnath or paragliding booking? Reply to this message directly!`,
  ].join("\n");
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

export async function sendBookingConfirmation(input: ConfirmationInput) {
  const to = normalizePhone(input.guestPhone);
  const body = formatConfirmationMessage(input);
  const provider = process.env.WHATSAPP_PROVIDER ?? "twilio";

  try {
    if (provider === "meta") {
      await sendViaCloudApi(to, body);
    } else {
      await sendViaTwilio(to, body);
    }
    return { sent: true };
  } catch (error) {
    console.error("WhatsApp confirmation failed", error);
    return {
      sent: false,
      error: error instanceof Error ? error.message : "WhatsApp send failed",
    };
  }
}
