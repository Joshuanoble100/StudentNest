"use client";

import { useEffect } from "react";

/**
 * Last-resort boundary for failures in the root layout.
 *
 * Replaces the whole document, so it must render its own <html> and <body> and
 * cannot rely on the app's global stylesheet or fonts.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <head>
        <title>StudentNest — something went wrong</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f8fafc",
          color: "#0f172a",
          fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          padding: "24px",
          textAlign: "center",
        }}
      >
        <main style={{ maxWidth: "32rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>
            StudentNest could not load
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.9rem", color: "#475569", lineHeight: 1.6 }}>
            An unexpected error stopped the app from rendering. No data was lost. Try again, or
            reload the page.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.5rem", fontSize: "0.75rem", color: "#94a3b8" }}>
              Reference: {error.digest}
            </p>
          )}
          <div style={{ marginTop: "1.5rem", display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={retry}
              style={{
                background: "#047857",
                color: "#fff",
                border: 0,
                borderRadius: "0.5rem",
                padding: "0.6rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                border: "1px solid #cbd5e1",
                borderRadius: "0.5rem",
                padding: "0.6rem 1.1rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#0f172a",
                textDecoration: "none",
                background: "#fff",
              }}
            >
              Reload home
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
