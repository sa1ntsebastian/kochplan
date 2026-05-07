type SearchParams = Promise<{ next?: string; error?: string }>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  return (
    <div className="max-w-sm mx-auto mt-16">
      <h1 className="text-2xl font-semibold mb-4">Kochplan</h1>
      <form
        action="/api/auth/login"
        method="post"
        className="bg-white border rounded-lg p-4 space-y-3"
      >
        <input type="hidden" name="next" value={sp.next ?? "/"} />
        <label className="block text-sm">
          Passwort
          <input
            type="password"
            name="password"
            autoFocus
            className="mt-1 w-full border rounded px-3 py-2"
            required
          />
        </label>
        {sp.error && (
          <p className="text-sm text-red-600">Falsches Passwort.</p>
        )}
        <button
          type="submit"
          className="w-full bg-accent hover:bg-accent-dark text-white rounded px-3 py-2 font-medium"
        >
          Einloggen
        </button>
      </form>
    </div>
  );
}
