export const PROPERTY = {
  name: "Sunset Point Homestay",
  shortName: "Sunset Point",
  location: "Bir, Himachal Pradesh",
  area: "Vill Kotli, near Bir Bus Stand / Billing Road",
  address:
    "Sunset Point Home Stay And Food Corner, Vill Kotli, P.O. Bir, Teh. Baijnath, Distt. Kangra, Himachal Pradesh 176077",
  tagline: "Serene Himalayan Living & Sunset Views in Bir Billing",
  checkIn: "1:00 PM",
  checkOut: "10:00 AM",
  phone: "+91 98170 63210",
  phoneDigits: "919817063210",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Sunset+Point+Home+Stay+And+Food+Corner+Vill+Kotli+Bir+Himachal+Pradesh",
  googleListingUrl: "https://share.google/b6oCY0xbVOKBdQpYH",
  mmtUrl: "https://www.makemytrip.com/hotels/sunset_point_homestay-details-bir_billing.html",
  goibiboUrl: "https://www.goibibo.com/hotels/sunset-point-homestay-hotel-in-bir-6026446820887707629/",
  coordinates: { lat: 32.0422, lng: 76.7231 },
  whatsappPrefill:
    "Hi, I'm interested in booking a room at Sunset Point Homestay, Bir.",
  heroImage: "/images/property/guest-bcc6f5.jpg",
  gallery: [
    "/images/property/guest-bcc6f5.jpg",
    "/images/property/hero-listing.jpg",
    "/images/property/sunset-room.jpg",
    "/images/property/guest-2308938.jpg",
    "/images/property/guest-2309006.jpg",
    "/images/property/guest-2308854.jpg",
  ],
  // Shown in italics in the footer, out of gratitude to the homestay family.
  developerNote:
    "Built out of gratitude for a heartful, welcoming stay of over 50 days — for Vikrant Bhaiya and Seema Bhabhi.",
} as const;

export const SHARED_AMENITIES = [
  "High-speed Wi-Fi",
  "24-hr Hot Water/Geyser",
  "Smart TV",
  "Laundry Service (on request)",
  "Homemade Himachali Food on order",
  "Rooftop Sit-out",
  "Rooftop Café & Workation Terrace",
  "Free Parking",
  "Workstation",
] as const;

// Base nightly rates apply every day by default. Owners can still set special
// dates (weekends, holidays, festivals) from the admin panel — no automatic
// weekend surge is applied unless the owner sets one explicitly.
export const ROOM_CATALOG = [
  {
    slug: "forest-view-deluxe",
    name: "Forest View Balcony (101)",
    roomNumber: "101",
    sortOrder: 1,
    description:
      "A quiet balcony room looking into pine, deodar and the green fields below the house. Attached bath, a comfortable king bed, and the hush of Vill Kotli's forest edge.",
    basePrice: 1000,
    maxGuests: 2,
    bedType: "1 King Bed",
    sizeSqFt: 150,
    viewType: "Pine, deodar and village greenery",
    amenities: [
      ...SHARED_AMENITIES,
      "Private Balcony",
      "Attached Private Bath",
      "Peaceful pine view",
    ],
    images: [
      "/images/rooms/101/room-101-1.jpeg",
      "/images/rooms/101/room-101-2.jpeg",
      "/images/rooms/101/room-101-3.jpeg",
    ],
  },
  {
    slug: "family-suite",
    name: "Sunset View Balcony Top (102)",
    roomNumber: "102",
    sortOrder: 2,
    description:
      "A top-floor balcony room with a wide sit-out over Bir and the Billing ridge — the one families ask for. Comfortable for a couple with room for an extra mattress.",
    basePrice: 1200,
    maxGuests: 4,
    bedType: "1 Double Bed + Extra Mattress/Bunk",
    sizeSqFt: 280,
    viewType: "Sunset and valley view from the top-floor balcony",
    amenities: [
      ...SHARED_AMENITIES,
      "Private Balcony",
      "Family sleeping setup",
      "Mountain View Balcony",
    ],
    images: [
      "/images/rooms/102/room-102-1.jpeg",
      "/images/rooms/102/room-102-2.jpeg",
      "/images/rooms/102/room-102-3.jpeg",
      "/images/rooms/102/room-102-4.jpeg",
    ],
  },
  {
    slug: "sunset-view-balcony",
    name: "Sunset View Balcony (103)",
    roomNumber: "103",
    sortOrder: 3,
    description:
      "The room guests book for the actual Bir sunset. Private balcony with a cane sit-out, Dhauladhar valley in front, and paragliders drifting over Kotli at last light.",
    basePrice: 1200,
    maxGuests: 2,
    bedType: "1 Double Bed",
    sizeSqFt: 150,
    viewType: "Direct sunset and valley from the private balcony",
    amenities: [
      ...SHARED_AMENITIES,
      "Private Balcony",
      "Mountain View Balcony",
      "Direct sunset outlook",
    ],
    images: [
      "/images/rooms/103/room-103-1.jpeg",
      "/images/rooms/103/room-103-2.jpeg",
      "/images/rooms/103/room-103-3.jpeg",
    ],
  },
  {
    slug: "standard-mountain",
    name: "Triple Bed Balcony, Forest View (104)",
    roomNumber: "104",
    sortOrder: 4,
    description:
      "A workation-friendly triple room with its own forest-view balcony, opening onto the Kotli hillside. High-speed Wi-Fi, mountain air, and a short walk to Bir Bus Stand.",
    basePrice: 1500,
    maxGuests: 3,
    bedType: "Triple Bed (1 Double + 1 Single)",
    sizeSqFt: 160,
    viewType: "Forest and mountain view balcony",
    amenities: [
      ...SHARED_AMENITIES,
      "Private Balcony",
      "Compact workation setup",
      "Mountain view window",
    ],
    images: [
      "/images/rooms/104/room-104-1.jpeg",
      "/images/rooms/104/room-104-2.jpeg",
      "/images/rooms/104/room-104-3.jpeg",
    ],
  },
] as const;
