import { PrismaClient } from "@prisma/client";
import { ROOM_CATALOG } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  for (const room of ROOM_CATALOG) {
    const existing = await prisma.room.findUnique({ where: { slug: room.slug } });

    await prisma.room.upsert({
      where: { slug: room.slug },
      // Keep name/photos/description/order in sync with the code on every
      // deploy, but never clobber a basePrice the owner has already set from
      // the admin panel — that field is only reseeded until they touch it.
      update: {
        name: room.name,
        description: room.description,
        maxGuests: room.maxGuests,
        bedType: room.bedType,
        sizeSqFt: room.sizeSqFt,
        viewType: room.viewType,
        amenities: [...room.amenities],
        images: [...room.images],
        sortOrder: room.sortOrder,
        isActive: true,
        ...(existing && !existing.basePriceCustomized ? { basePrice: room.basePrice } : {}),
      },
      create: {
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
        sortOrder: room.sortOrder,
        isActive: true,
      },
    });
  }

  console.log(`Seeded ${ROOM_CATALOG.length} rooms for Sunset Point Homestay.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
