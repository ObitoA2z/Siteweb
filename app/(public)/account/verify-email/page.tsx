"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") ?? "").trim();
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(
    token ? "Verification en cours..." : "Lien de verification invalide.",
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    const controller = new AbortController();
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(data.error ?? "Lien invalide ou expire.");
        }
        setStatus("success");
        setMessage("Adresse email verifiee. Tu peux maintenant te connecter.");
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "Verification impossible.");
      });

    return () => {
      controller.abort();
    };
  }, [token]);

  return (
    <div className="shell">
      <div className="card mx-auto max-w-md space-y-4 p-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#8a6578]">Compte cliente</p>
        <h1 className="text-3xl font-bold">Verification email</h1>
        <p className="text-sm text-[#5f4754]">{message}</p>
        <div className="flex gap-2">
          <Link href="/account/login" className="btn-main flex-1 text-center">
            Se connecter
          </Link>
          {status === "error" ? (
            <Link href="/account/register" className="btn-soft flex-1 text-center">
              Nouvelle inscription
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="shell"><div className="card mx-auto max-w-md p-6">Chargement...</div></div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
