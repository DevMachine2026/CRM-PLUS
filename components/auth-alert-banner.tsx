"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";

const MESSAGES: Record<string, string> = {
  session_expired: "Sua sessão expirou. Faça login novamente para continuar.",
  forbidden: "Você não tem permissão para acessar essa área.",
};

function BannerInner() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const reason       = searchParams.get("reason");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (reason && MESSAGES[reason]) setVisible(true);
  }, [reason]);

  if (!visible || !reason || !MESSAGES[reason]) return null;

  function dismiss() {
    setVisible(false);
    const url = new URL(window.location.href);
    url.searchParams.delete("reason");
    router.replace(url.pathname + url.search);
  }

  const isWarning = reason === "forbidden";

  return (
    <div
      role="alert"
      className={`mx-6 mt-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
        isWarning
          ? "border-amber-200 bg-amber-50 text-amber-900"
          : "border-blue-200 bg-blue-50 text-blue-900"
      }`}
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <p className="flex-1">{MESSAGES[reason]}</p>
      <button
        type="button"
        onClick={dismiss}
        className="rounded p-0.5 opacity-70 hover:opacity-100"
        aria-label="Fechar aviso"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}

export function AuthAlertBanner() {
  return (
    <Suspense fallback={null}>
      <BannerInner />
    </Suspense>
  );
}
