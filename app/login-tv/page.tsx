// LARAPLAY — Compat: /login-tv pointe vers le login TV générique sans JS.

import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function LoginTVPage() {
  redirect("/login-basic");
}
