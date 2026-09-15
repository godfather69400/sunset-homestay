import { PrismaClient } from "@prisma/client";
import { ROOM_CATALOG } from "../src/lib/constants";

const prisma = new PrismaClient();

async function main() {
  for (const room of ROOM_CATALOG) {
    await prisma.room.upsert({
      where: { slug: room.slug },
      update: {
        name: room.name,
        description: room.description,
        basePrice: room.basePrice,
        maxGuests: room.maxGuests,
        bedType: room.bedType,
        sizeSqFt: room.sizeSqFt,
        viewType: room.viewType,
        amenities: [...room.amenities],
        images: [...room.images],
        isActive: true,
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
