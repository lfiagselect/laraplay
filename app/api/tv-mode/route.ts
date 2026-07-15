// LARAPLAY — QA-01: mode test TV serveur, signé et désactivable.
// GET /api/tv-mode?key=<TV_TEST_KEY>&on=1|0
// - Actif uniquement si TV_TEST_KEY est défini (staging). Sans variable → 404.
// - on=1 pose le cookie laraplay_legacy_tv (lu par le proxy serveur et watch)
//   → force layout TV + PlayerTV côté serveur, pas seulement html.tv client.
// - on=0 retire le cookie (vrai off).

import { NextResponse } from "next/server";
import { publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const key = process.env.TV_TEST_KEY;
  if (!key) {
    return new NextResponse("Not found", { status: 404 });
  }
  const url = new URL(req.url);
  if (url.searchParams.get("key") !== key) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  const on = url.searchParams.get("on") !== "0";
  const res = NextResponse.redirect(publicUrl(req, "/"), 303);
  res.headers.set("cache-control", "no-store");
  if (on) {
    res.cookies.set("laraplay_legacy_tv", "1", {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7,
    });
  } else {
    res.cookies.set("laraplay_legacy_tv", "", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 0,
    });
  }
  return res;
}
