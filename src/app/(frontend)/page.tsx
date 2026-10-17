// Iteration 0: purana frontend hata diya gaya hai. Naya Playground agle iterations me banega.
// Yeh placeholder sirf isliye hai ke deploy ka smoke test (`/`) pass ho.
export default function HomePage() {
  return (
    <main className="flex h-full items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Playground</h1>
        <p className="mt-2 text-muted-foreground">The new Playground is being rebuilt.</p>
      </div>
    </main>
  )
}
