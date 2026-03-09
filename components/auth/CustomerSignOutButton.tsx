"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";

export function CustomerSignOutButton() {
  const [loading, setLoading] = useState(false);

  return (
    <button
      type="button"
      className="btn-soft"
      disabled={loading}
      onClick={async () => {
        setLoading(true);
        await signOut({ callbackUrl: "/" });
      }}
    >
      {loading ? "Deconnexion..." : "Se deconnecter"}
    </button>
  );
}
