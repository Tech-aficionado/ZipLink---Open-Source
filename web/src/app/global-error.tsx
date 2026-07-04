"use client";

import { useEffect } from "react";

/**
 * Root error boundary. This is the last line of defense: it replaces the root
 * layout when an error is thrown in the layout itself, so it must render its
 * own <html>/<body>. Styles are inlined so the fallback works even if the app
 * stylesheet failed to load.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#06060b",
          color: "#f2f3fb",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "26rem",
            borderRadius: "1.125rem",
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(15,15,26,0.7)",
            padding: "2rem",
            boxShadow: "0 18px 46px -18px rgba(0,0,0,0.7)",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              margin: "0 auto",
              height: "44px",
              width: "44px",
              borderRadius: "12px",
              background: "linear-gradient(120deg,#635bff,#7c5cff 55%,#22d3ee)",
            }}
          />
          <h1 style={{ marginTop: "1.25rem", fontSize: "1.25rem", fontWeight: 600 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#9090ad" }}>
            The app hit an unexpected error. Please try again.
          </p>
          {error.digest ? (
            <p
              style={{
                marginTop: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                fontSize: "0.7rem",
                color: "#6a6a78",
              }}
            >
              Ref: {error.digest}
            </p>
          ) : null}
          <div
            style={{
              marginTop: "1.5rem",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              onClick={reset}
              style={{
                height: "2.75rem",
                padding: "0 1.25rem",
                borderRadius: "0.625rem",
                border: "none",
                cursor: "pointer",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#fff",
                background: "linear-gradient(120deg,#635bff,#7c5cff 55%,#22d3ee)",
              }}
            >
              Try again
            </button>
            <a
              href="/"
              style={{
                height: "2.75rem",
                display: "inline-flex",
                alignItems: "center",
                padding: "0 1.25rem",
                borderRadius: "0.625rem",
                border: "1px solid #2e2e50",
                fontSize: "0.875rem",
                fontWeight: 500,
                color: "#f2f3fb",
                textDecoration: "none",
              }}
            >
              Go home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
