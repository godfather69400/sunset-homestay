import type { MetadataRoute } from "next";
import { PROPERTY, ROOM_CATALOG } from "@/lib/constants";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = PROPERTY.siteUrl;
  return [
    { url: base, changeFrequency: "daily", priority: 1 },
    { url: `${base}/manage-booking`, changeFrequency: "monthly", priority: 0.5 },
    ...ROOM_CATALOG.map((room) => ({
      url: `${base}/rooms/${room.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
