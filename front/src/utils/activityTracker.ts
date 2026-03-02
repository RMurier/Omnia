const SESSION_KEY = "omnia_session_id";

export async function trackVisit(): Promise<void> {
  try {
    if (localStorage.getItem(SESSION_KEY)) return;

    const anonymousUserId = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, anonymousUserId);

    await fetch("/api/activity/self", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ anonymousUserId }),
    });
  } catch {
    // silent — never block the app
  }
}
