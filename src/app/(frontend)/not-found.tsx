import Link from 'next/link'
import { SiteHeader } from '@/components/shell/site-header'
import { buttonVariants } from '@/components/ui/button'

// Header yahan bhi — private board ka owner yahin se sign in kar sake
export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <h1 className="text-2xl font-semibold">Not found</h1>
        <p className="text-muted-foreground">
          This board does not exist, or its owner has not shared it.
        </p>
        <Link href="/" className={buttonVariants()}>
          Go to Boards
        </Link>
      </main>
    </>
  )
}
