import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
      <h1 className="text-xl font-semibold">That page does not exist.</h1>
      <Link href="/" className="rounded-xl bg-ink-700 px-5 py-3 text-ink-100 hover:bg-ink-600">
        Back to Continue
      </Link>
    </main>
  );
}
