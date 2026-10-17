"use client";

/** Last-resort boundary: replaces the root layout, so it renders its own <html>. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, padding: 24, textAlign: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: "#64748b", marginBottom: 16 }}>An unexpected error occurred.{error.digest ? ` (Ref: ${error.digest})` : ""}</p>
          <button onClick={reset} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid #cbd5e1", cursor: "pointer" }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
