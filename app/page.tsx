"use client";

import { useState } from "react";
import { Send, Terminal, Zap } from "lucide-react";

export default function CommandCenter() {
  const [command, setCommand] = useState("");
  const [log, setLog] = useState<
    { type: "user" | "system"; text: string; time: string }[]
  >([
    {
      type: "system",
      text: "Outreach Machine online. Type a command or use quick actions below.",
      time: new Date().toLocaleTimeString(),
    },
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim()) return;

    const userMsg = {
      type: "user" as const,
      text: command,
      time: new Date().toLocaleTimeString(),
    };

    // Simulated response for scaffold
    let systemReply = "Command received. (Backend email + outreach engine not yet wired — this is the scaffold.)";
    if (command.toLowerCase().includes("email") || command.toLowerCase().includes("nonprofit")) {
      systemReply =
        "Understood. Preparing nonprofit outreach. In production this will pull your Gmail / list and send. Ready for list + message payload.";
    } else if (command.toLowerCase().includes("live") || command.toLowerCase().includes("stream")) {
      systemReply = "Live launcher ready. Connect Meta glasses or camera and go live from /live.";
    }

    setLog((prev) => [
      ...prev,
      userMsg,
      { type: "system", text: systemReply, time: new Date().toLocaleTimeString() },
    ]);
    setCommand("");
  };

  const quickActions = [
    "Email 150 nonprofits about getting people off the street",
    "Show recent kindness content",
    "Start a live stream",
    "Open ambassador pricing",
  ];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Terminal className="text-accent" />
          Command Center
        </h1>
        <p className="mt-2 text-muted">
          Talk to the machine. Email nonprofits. Launch content. Control the outreach.
        </p>
      </div>

      {/* Chat / Command Log */}
      <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="h-80 overflow-y-auto p-4 space-y-3 font-mono text-sm">
          {log.map((entry, i) => (
            <div
              key={i}
              className={`flex gap-3 ${
                entry.type === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 ${
                  entry.type === "user"
                    ? "bg-accent/20 text-accent"
                    : "bg-background text-muted"
                }`}
              >
                <div className="text-xs opacity-60 mb-1">{entry.time}</div>
                {entry.text}
              </div>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border p-3 flex gap-2">
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            placeholder='e.g. "Email 150 nonprofits saying I\'m getting people off the street..."'
            className="flex-1 rounded-lg bg-background border border-border px-4 py-3 text-sm focus:outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-3 text-black font-medium hover:bg-accent-dim transition flex items-center gap-2"
          >
            <Send size={16} />
            Send
          </button>
        </form>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <p className="text-xs text-muted mb-3 uppercase tracking-wider">Quick Actions</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {quickActions.map((action) => (
            <button
              key={action}
              onClick={() => setCommand(action)}
              className="text-left rounded-lg border border-border bg-surface px-4 py-3 text-sm hover:border-accent/50 hover:bg-accent/5 transition flex items-center gap-2"
            >
              <Zap size={14} className="text-accent shrink-0" />
              {action}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 rounded-xl border border-border bg-surface/50 p-5 text-sm text-muted">
        <p className="font-medium text-white mb-1">Scaffold Status</p>
        This is the live command UI. Backend email engine, Gmail integration, and real list execution will be wired next. The vision is already locked: you talk, the machine acts.
      </div>
    </div>
  );
}
