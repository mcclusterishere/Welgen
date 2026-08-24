"use client";

import { useState } from "react";
import { Mail, Users, Send, List } from "lucide-react";

export default function OutreachPage() {
  const [subject, setSubject] = useState("Getting people off the street – partnership request");
  const [body, setBody] = useState(
    `Hey,

I'm active in the community, connecting people with real help and making mission-driven work more visible. I'm building a network of nonprofits that want an authentic representative on the ground.

Would love to connect and see how we can support each other's missions.

— Jay`
  );
  const [count, setCount] = useState(150);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Mail className="text-accent" />
          Nonprofit Outreach
        </h1>
        <p className="mt-2 text-muted">
          The machine sends the emails. You just give the message and the list size.
        </p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-surface p-5">
          <label className="block text-sm text-muted mb-2">How many nonprofits?</label>
          <div className="flex items-center gap-3">
            <Users size={18} className="text-accent" />
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-24 rounded-lg bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-accent"
            />
            <span className="text-sm text-muted">organizations</span>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
          <div>
            <label className="block text-sm text-muted mb-2">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-2">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={10}
              className="w-full rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent font-mono"
            />
          </div>
        </div>

        <button
          className="w-full rounded-xl bg-accent text-black font-semibold py-4 flex items-center justify-center gap-2 hover:bg-accent-dim transition"
          onClick={() =>
            alert(
              "Scaffold mode: This will connect to Gmail / email service and fire the campaign. List management + tracking coming next."
            )
          }
        >
          <Send size={18} />
          Queue {count} Emails
        </button>

        <div className="rounded-xl border border-border bg-surface/50 p-5 text-sm text-muted flex gap-3">
          <List size={18} className="shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-white mb-1">Next wiring</p>
            Connect Gmail API or SendGrid. Upload / paste nonprofit list. Track opens, replies, and convert positive responses into ambassador conversations.
          </div>
        </div>
      </div>
    </div>
  );
}
