// Purana frontend aur code editor hata diye gaye hain. Boards (lecture canvas) agle iterations me banega.
// Yeh placeholder sirf isliye hai ke deploy ka smoke test (`/`) pass ho.
export default function HomePage() {
  return (
    <main className="flex h-full items-center justify-center p-6 text-center">
      <div>
        <h1 className="text-2xl font-semibold">Boards</h1>
        <p className="mt-2 text-muted-foreground">
          Lecture boards for instructors are being built.
        </p>
      </div>
    </main>
  )
}
