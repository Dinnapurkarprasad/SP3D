import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-16 text-center">
      <h1 className="text-xl font-semibold text-navy">Page not found</h1>
      <p className="mt-2 text-sm text-ink-2">The page or record you asked for does not exist in this simulated dataset.</p>
      <Link href="/" className="mt-4 inline-block text-brand underline">Back to the overview</Link>
    </div>
  );
}
