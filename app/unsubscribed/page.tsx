import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Unsubscribed | Jay Johnson",
  description: "You have been removed from this mailing list.",
  robots: { index: false, follow: false },
};

/**
 * Where the unsubscribe endpoint sends people after it has written the
 * suppression. It lives here rather than in the edge function because
 * Supabase pins every function response to text/plain with a sandbox
 * CSP — a page built there would arrive as visible source. By the time
 * anyone reads this, the removal has already happened.
 */
export default function UnsubscribedPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "#f3efe6",
        color: "#101b2c",
        padding: 24,
        fontFamily: "Arial, Helvetica, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 520,
          background: "#fff",
          border: "1px solid #ddd8cd",
          borderRadius: 18,
          padding: "44px 40px",
        }}
      >
        <p style={{ fontSize: 9, fontWeight: 900, letterSpacing: 1.7, color: "#3157d5", margin: 0 }}>
          MAILING LIST
        </p>
        <h1
          style={{
            font: "400 38px/1.05 Georgia, 'Times New Roman', serif",
            letterSpacing: -1.5,
            margin: "18px 0 16px",
          }}
        >
          You&apos;re off the list.
        </h1>
        <p style={{ fontSize: 15, lineHeight: 1.7, color: "#5c6675", margin: "0 0 14px" }}>
          That address has been removed. No further outreach will be sent to it.
        </p>
        <p style={{ fontSize: 13, lineHeight: 1.7, color: "#8a8f99", margin: 0 }}>
          If this was a mistake, reply to any earlier email and ask to be put back on — it will not
          happen automatically.
        </p>
      </div>
    </main>
  );
}
