import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 pt-24">
      <div className="text-center">
        <h1 className="font-serif text-4xl">That trail does not exist</h1>
        <p className="mt-3 text-muted-foreground">The room or page you asked for is not on the map.</p>
        <Link href="/" className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm text-primary-foreground">
          Back to Sunset Point
        </Link>
      </div>
    </main>
  );
}
