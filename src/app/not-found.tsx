import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="space-y-2 py-16 text-center">
      <h1 className="text-xl font-semibold">Page not found</h1>
      <p className="text-muted-foreground">The project may not exist, or the link is wrong.</p>
      <Link href="/" className="underline">
        Back to the portfolio
      </Link>
    </div>
  )
}
