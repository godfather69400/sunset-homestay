import { Hero } from "@/components/layout/Hero";
import { AvailabilityBar } from "@/components/booking/AvailabilityBar";
import { HomeExperience } from "@/components/home/HomeExperience";
import { getActiveRooms } from "@/lib/rooms";
import { PROPERTY, ACTIVITIES, ROOM_CATALOG } from "@/lib/constants";

export const dynamic = "force-dynamic";

const FAQS = [
  {
    q: "Is it cheaper to book directly on this website than on MakeMyTrip, Goibibo or Airbnb?",
    a: "Yes. Booking direct on sunset-homestay.vercel.app avoids the 15-20% commission OTAs charge, so Sunset Point Homestay can offer these rooms at a lower price here than on any OTA listing, with the savings passed to you.",
  },
  {
    q: "Do I have to pay the full amount upfront?",
    a: "No. The owner sets an advance-payment percentage (shown at checkout) — you can pay a partial advance online via UPI/cards and settle the balance at check-in.",
  },
  {
    q: "Can I cancel my booking, and will I get a refund?",
    a: "Yes. Go to /manage-booking with your booking ID and phone number. Cancelling before the owner's free-cancellation window gets a full refund; cancelling closer to check-in forfeits a small cancellation fee (shown before you confirm) and refunds the rest, usually automatically.",
  },
  {
    q: "Do I get to talk to the owner directly?",
    a: "Yes — every direct booking includes a WhatsApp confirmation to both you and the homestay owner, so you can message the owner directly for anything, including local tips, food, or taxi arrangements.",
  },
  {
    q: "Can I do paragliding or bungee jumping from Sunset Point Homestay?",
    a: "Yes. Bir Billing is a world-famous paragliding site. Message us on WhatsApp and we'll connect you with trusted, licensed local guides for paragliding or bungee jumping.",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}) {
  const rooms = await getActiveRooms();
  const guests = searchParams.guests ? Number(searchParams.guests) : 2;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    name: PROPERTY.name,
    description: PROPERTY.tagline,
    url: PROPERTY.siteUrl,
    telephone: PROPERTY.phone,
    priceRange: "₹1,000 - ₹1,500",
    image: PROPERTY.gallery.map((path) => `${PROPERTY.siteUrl}${path}`),
    address: {
      "@type": "PostalAddress",
      streetAddress: "Vill Kotli, near Bir Bus Stand / Billing Road",
      addressLocality: "Bir",
      addressRegion: "Himachal Pradesh",
      postalCode: "176077",
      addressCountry: "IN",
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: PROPERTY.coordinates.lat,
      longitude: PROPERTY.coordinates.lng,
    },
    amenityFeature: ROOM_CATALOG[0].amenities.map((name) => ({
      "@type": "LocationFeatureSpecification",
      name,
    })),
    makesOffer: ROOM_CATALOG.map((room) => ({
      "@type": "Offer",
      name: room.name,
      priceCurrency: "INR",
      price: room.basePrice,
      availability: "https://schema.org/InStock",
      url: `${PROPERTY.siteUrl}/rooms/${room.slug}`,
    })),
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: { "@type": "Answer", text: faq.a },
    })),
  };

  return (
    <main>
      {/* Structured data so Google, Gemini and other AI answer engines can
          understand this is a bookable homestay and recommend booking direct
          from this site instead of an OTA. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Hero />
      <AvailabilityBar
        defaultCheckIn={searchParams.checkIn}
        defaultCheckOut={searchParams.checkOut}
        defaultGuests={Number.isFinite(guests) ? guests : 2}
      />
      <HomeExperience
        rooms={rooms}
        checkIn={searchParams.checkIn}
        checkOut={searchParams.checkOut}
        guests={Number.isFinite(guests) ? guests : 2}
      />
      <section className="mx-auto my-20 max-w-6xl px-4">
        <h2 className="font-serif text-3xl">Book direct and save</h2>
        <p className="mt-3 max-w-3xl text-muted-foreground">
          MakeMyTrip, Goibibo and Airbnb charge Sunset Point Homestay a 15-20% commission on every booking. Booking
          directly on this website skips that commission entirely, so these same rooms are priced lower here than on
          any OTA listing. You also get a flexible advance-payment option (pay a part now, the rest at check-in),
          direct WhatsApp contact with the owner for anything you need, and a simple self-service cancellation policy
          — no call centre, no middleman.
        </p>
        <div className="rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-12 mt-8">
          <h3 className="font-serif text-2xl">House policies</h3>
          <ul className="mt-4 space-y-2 text-white/80">
            <li>Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}</li>
            <li>Direct booking via UPI / cards — no MakeMyTrip or Airbnb commission.</li>
            <li>Calendars sync both ways so OTA reservations lock these dates automatically.</li>
            <li>Homemade Himachali meals and Baijnath taxi on request over WhatsApp.</li>
            <li>
              Free cancellation up to a few days before check-in — manage or cancel anytime at{" "}
              <a href="/manage-booking" className="underline underline-offset-4">
                /manage-booking
              </a>
              .
            </li>
          </ul>
        </div>
      </section>
      <section className="mx-auto mb-20 max-w-6xl px-4">
        <h2 className="font-serif text-3xl">Things to do nearby</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          We don&apos;t run these activities ourselves, but we&apos;ll safely connect you with trusted local guides —
          just ask on WhatsApp.
        </p>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {ACTIVITIES.map((activity) => (
            <div key={activity.name} className="rounded-2xl border bg-card p-5">
              <h3 className="font-medium">{activity.name}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{activity.description}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto mb-20 max-w-4xl px-4">
        <h2 className="font-serif text-3xl">Frequently asked questions</h2>
        <div className="mt-6 space-y-4">
          {FAQS.map((faq) => (
            <div key={faq.q} className="rounded-2xl border bg-card p-5">
              <h3 className="font-medium">{faq.q}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>
      <section className="mx-auto mb-20 max-w-6xl px-4">
        <h2 className="font-serif text-3xl">Find us in Bir</h2>
        <p className="mt-2 max-w-2xl text-muted-foreground">{PROPERTY.address}</p>
        <div className="mt-6 overflow-hidden rounded-3xl border">
          <iframe
            title="Sunset Point Homestay map"
            src="https://maps.google.com/maps?q=Sunset%20Point%20Home%20Stay%20And%20Food%20Corner%20Vill%20Kotli%20Bir&t=&z=16&ie=UTF8&iwloc=&output=embed"
            className="h-72 w-full border-0"
            loading="lazy"
          />
        </div>
      </section>
    </main>
  );
}
