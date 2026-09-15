import { Hero } from "@/components/layout/Hero";
import { AvailabilityBar } from "@/components/booking/AvailabilityBar";
import { HomeExperience } from "@/components/home/HomeExperience";
import { getActiveRooms } from "@/lib/rooms";
import { PROPERTY } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: { checkIn?: string; checkOut?: string; guests?: string };
}) {
  const rooms = await getActiveRooms();
  const guests = searchParams.guests ? Number(searchParams.guests) : 2;

  return (
    <main>
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
        <div className="rounded-3xl bg-secondary p-8 text-secondary-foreground md:p-12">
          <h2 className="font-serif text-3xl">House policies</h2>
          <ul className="mt-4 space-y-2 text-white/80">
            <li>Check-in {PROPERTY.checkIn} · Check-out {PROPERTY.checkOut}</li>
            <li>Direct booking via UPI / cards — no MakeMyTrip or Airbnb commission.</li>
            <li>Calendars sync both ways so OTA reservations lock these dates automatically.</li>
            <li>Homemade Himachali meals and Baijnath taxi on request over WhatsApp.</li>
          </ul>
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
