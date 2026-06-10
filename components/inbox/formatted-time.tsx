"use client";

import { useState, useEffect } from "react";

type Mode = "message" | "conversation";

function formatTime(iso: string | null, mode: Mode): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (mode === "message") {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  const today = new Date();
  if (d.toDateString() === today.toDateString()) {
    return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

type Props = {
  iso: string | null;
  mode?: Mode;
  className?: string;
  suffix?: string;
};

/** Renders locale-formatted time after mount to avoid SSR/client hydration mismatch (#418). */
export function FormattedTime({ iso, mode = "message", className, suffix }: Props) {
  const [text, setText] = useState("");

  useEffect(() => {
    setText(formatTime(iso, mode));
  }, [iso, mode]);

  if (!iso) return null;

  return (
    <span className={className} suppressHydrationWarning>
      {text}{suffix}
    </span>
  );
}
