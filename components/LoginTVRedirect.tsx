// LARAPLAY — Redirection client de secours vers le Device Flow TV.
// Certains navigateurs LG/Samsung masquent ou modifient l'UA côté proxy: si le
// serveur ne redirige pas /login vers /login-basic, on corrige côté client.

"use client";

import { useEffect } from "react";
import { detectTVClient } from "@/lib/tv-client";

export function LoginTVRedirect() {
  useEffect(() => {
    if (!detectTVClient()) return;
    window.location.replace("/login-basic");
  }, []);

  return null;
}
