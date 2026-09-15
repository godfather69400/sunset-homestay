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
} as const;

export const SHARED_AMENITIES = [
  "High-speed Wi-Fi",
  "24-hr Hot Water/Geyser",
  "Homemade Himachali Food on order",
  "Free Parking",
  "Workstation",
] as const;

export const WEEKEND_SURGE = 1.2;

export const ROOM_CATALOG = [
  {
    slug: "sunset-view-balcony",
    name: "Sunset View Room with Balcony",
    description:
      "The room guests book for the actual Bir sunset. Private balcony with a cane sit-out, Dhauladhar valley in front, and paragliders drifting over Kotli at last light.",
    basePrice: 2200,
    maxGuests: 2,
    bedType: "1 Double Bed",
    sizeSqFt: 150,
    viewType: "Direct sunset & valley from the private balcony",
    amenities: [
      ...SHARED_AMENITIES,
      "Private Balcony",
      "Mountain View Balcony",
      "Direct sunset outlook",
    ],
    images: [
      "/images/property/sunset-room.jpg",
      "/images/property/guest-bcc6f5.jpg",
      "/images/property/guest-2308938.jpg",
    ],
  },
  {
    slug: "forest-view-deluxe",
    name: "Forest View Deluxe Room",
    description:
      "A quieter balcony looking into pine, deodar and the green fields below the house. Attached bath, king/double bed, and the hush of Vill Kotli’s forest edge.",
    basePrice: 1700,
    maxGuests: 2,
    bedType: "1 King Bed",
    sizeSqFt: 150,
    viewType: "Pine, deodar and village greenery",
    amenities: [
      ...SHARED_AMENITIES,
      "Attached Private Bath",
      "Peaceful pine view",
    ],
    images: [
      "/images/property/guest-164643.jpg",
      "/images/property/guest-183602.jpg",
      "/images/property/guest-091105.jpg",
    ],
  },
  {
    slug: "family-suite",
    name: "Mountain View Family Suite",
    description:
      "The larger sit-out with table and chairs — the terrace families use. Sleeps 3–4 (double + extra mattress/bunk) with a wide look over Bir, Billing ridge and the valley floor.",
    basePrice: 2800,
    maxGuests: 4,
    bedType: "1 Double Bed + Bunk / Extra Mattress",
    sizeSqFt: 280,
    viewType: "Mountain-view terrace over Bir",
    amenities: [
      ...SHARED_AMENITIES,
      "Attached terrace",
      "Family sleeping setup",
      "Mountain View Balcony",
    ],
    images: [
      "/images/property/guest-2309006.jpg",
      "/images/property/guest-164646.jpg",
      "/images/property/guest-2308854.jpg",
    ],
  },
  {
    slug: "standard-mountain",
    name: "Standard Cozy Himalayan Room",
    description:
      "A compact, workation-friendly room opening onto the same Kotli hillside. High-speed Wi-Fi, mountain air, and a short walk to Bir Bus Stand.",
    basePrice: 1400,
    maxGuests: 2,
    bedType: "1 Double Bed",
    sizeSqFt: 120,
    viewType: "Mountain and village view",
    amenities: [
      ...SHARED_AMENITIES,
      "Compact workation setup",
      "Mountain view window",
    ],
    images: [
      "/images/property/guest-091105.jpg",
      "/images/property/guest-092449.jpg",
      "/images/property/guest-183602.jpg",
    ],
  },
] as const;
