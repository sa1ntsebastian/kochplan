type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-sm">
        <h1 className="brand text-3xl text-forest text-center mb-8">
          kochplan
        </h1>
        <form
          action="/api/auth/login"
          method="post"
          className="bg-white border border-taupe-light rounded-lg p-5 space-y-3 shadow-sm"
        >
          <input type="hidden" name="next" value={sp.next ?? "/"} />
          <label className="block text-sm">
            <span className="text-ink-soft">Passwort</span>
            <input
              type="password"
              name="password"
              autoFocus
              className="mt-1 w-full border rounded px-3 py-2"
              required
            />
          </label>
          {sp.error && (
            <p className="text-sm text-red-700">Falsches Passwort.</p>
          )}
          <button
            type="submit"
            className="w-full bg-forest hover:bg-forest-dark text-cream-100 rounded px-3 py-2 font-medium transition-colors"
          >
            einloggen
          </button>
        </form>
      </div>
    </div>
  );
}
