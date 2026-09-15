import { prisma } from "./prisma";
import { ROOM_CATALOG } from "./constants";

export type PublicRoom = {
  id: string;
  name: string;
  slug: string;
  description: string;
  basePrice: number;
  maxGuests: number;
  bedType: string;
  sizeSqFt: number;
  viewType: string;
  amenities: string[];
  images: string[];
  isActive: boolean;
};

const fallbackRooms: PublicRoom[] = ROOM_CATALOG.map((room) => ({
  id: `fallback-${room.slug}`,
  name: room.name,
  slug: room.slug,
  description: room.description,
  basePrice: room.basePrice,
  maxGuests: room.maxGuests,
  bedType: room.bedType,
  sizeSqFt: room.sizeSqFt,
  viewType: room.viewType,
  amenities: [...room.amenities],
  images: [...room.images],
  isActive: true,
}));

function withCatalogPhotos(room: PublicRoom): PublicRoom {
  const catalog = ROOM_CATALOG.find((item) => item.slug === room.slug);
  if (!catalog) return room;
  return {
    ...room,
    description: catalog.description,
    viewType: catalog.viewType,
    images: [...catalog.images],
  };
}

export async function getActiveRooms(): Promise<PublicRoom[]> {
  try {
    const rooms = await prisma.room.findMany({
      where: { isActive: true },
      orderBy: { basePrice: "desc" },
    });
    if (rooms.length) return rooms.map(withCatalogPhotos);
  } catch (error) {
    console.warn("Room query fell back to catalog", error);
  }
  return fallbackRooms;
}

export async function getRoomBySlug(slug: string): Promise<PublicRoom | null> {
  try {
    const room = await prisma.room.findUnique({ where: { slug } });
    if (room) return withCatalogPhotos(room);
  } catch (error) {
    console.warn("Room slug query fell back to catalog", error);
  }
  return fallbackRooms.find((room) => room.slug === slug) ?? null;
}
