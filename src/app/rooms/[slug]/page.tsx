import { notFound } from "next/navigation";
import { getRoomBySlug } from "@/lib/rooms";
import { RoomDetail } from "@/components/rooms/RoomDetail";

export const dynamic = "force-dynamic";

export default async function RoomPage({ params }: { params: { slug: string } }) {
  const room = await getRoomBySlug(params.slug);
  if (!room) notFound();
  return <RoomDetail room={room} />;
}
