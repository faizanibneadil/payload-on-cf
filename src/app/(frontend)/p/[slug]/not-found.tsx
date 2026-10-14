import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button'

export default function PlaygroundNotFound() {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Playground not found</h1>
      <p className="max-w-sm text-sm text-muted-foreground">
        This link may be wrong, or the owner may have deleted the playground.
      </p>
      <Link href="/" className={buttonVariants()}>
        Go to Playground
      </Link>
    </div>
  )
}
