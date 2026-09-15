"use client";

import { usePathname } from "next/navigation";
import { MessageCircle } from "lucide-react";
import { PROPERTY } from "@/lib/constants";

export function WhatsAppFAB() {
  const pathname = usePathname();
  if (pathname.startsWith("/admin")) return null;

  const number = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? PROPERTY.phoneDigits;
  const href = `https://wa.me/${number}?text=${encodeURIComponent(PROPERTY.whatsappPrefill)}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-[#25D366] px-4 py-3 text-sm font-medium text-white shadow-soft md:bottom-8 md:right-8"
    >
      <MessageCircle className="h-5 w-5" />
      Chat on WhatsApp
    </a>
  );
}
