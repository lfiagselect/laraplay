// LARAPLAY — Login TV ultra-compatible pour navigateurs anciens / inconnus.
// Route HTML sans React client, sans fetch côté TV, avec refresh HTML serveur.

import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_FLOW_CONFIG, getByDeviceCode } from "@/lib/device-flow";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { publicOrigin, publicUrl } from "@/lib/public-origin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function noStoreHeaders(contentType = "text/html; charset=utf-8") {
  return {
    "content-type": contentType,
    "cache-control": "no-store, no-cache, max-age=0, must-revalidate",
    pragma: "no-cache",
    expires: "0",
  };
}

const DEVICE_COOKIE = "laraplay_device";

function setDeviceCookie(res: NextResponse, deviceCode: string) {
  res.cookies.set(DEVICE_COOKIE, deviceCode, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });
}

function htmlEscape(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function redirectNoStore(url: string | URL) {
  const res = NextResponse.redirect(url, 303);
  res.headers.set("cache-control", "no-store, no-cache, max-age=0, must-revalidate");
  res.headers.set("pragma", "no-cache");
  res.headers.set("expires", "0");
  return res;
}

function renderPage({
  req,
  userCode,
  status,
}: {
  req: Request;
  userCode: string;
  status: "pending" | "consumed" | "expired" | "denied" | "error";
}) {
  const origin = publicOrigin(req);
  const verifyUrl = `${origin}/d`;
  // AUTH-02: le device_code ne transite plus par l'URL (cookie HttpOnly).
  const currentUrl = publicUrl(req, "/login-basic");
  currentUrl.searchParams.set("user_code", userCode);
  currentUrl.searchParams.set("_", String(Date.now()));

  const restartUrl = publicUrl(req, "/login-basic?new=1").toString();
  const refreshSeconds = Math.max(4, DEVICE_FLOW_CONFIG.pollIntervalSec);
  const shouldRefresh = status === "pending";
  const title = status === "pending" ? "Connexion TV" : "Connexion TV interrompue";
  const message =
    status === "pending"
      ? "En attente de validation sur votre téléphone. Cette page se vérifie automatiquement."
      : status === "consumed"
        ? "Ce code a déjà été utilisé. Générez un nouveau code."
        : status === "expired"
          ? "Ce code a expiré. Générez un nouveau code."
          : status === "denied"
            ? "Connexion refusée. Générez un nouveau code pour réessayer."
            : "Impossible de préparer la connexion TV. Réessayez.";

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=1&data=${encodeURIComponent(verifyUrl)}`;

  return `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="Cache-Control" content="no-store, no-cache, max-age=0, must-revalidate">
<meta http-equiv="Pragma" content="no-cache">
<meta http-equiv="Expires" content="0">
${shouldRefresh ? `<meta http-equiv="refresh" content="${refreshSeconds};url=${htmlEscape(currentUrl.toString())}">` : ""}
<title>LARAPLAY — ${htmlEscape(title)}</title>
<style>
html,body{margin:0;padding:0;background:#000;color:#fff;font-family:Arial,Helvetica,sans-serif;min-height:100%;}
body{display:block;text-align:center;}
.wrap{max-width:900px;margin:0 auto;padding:38px 24px;}
.logo{font-size:54px;letter-spacing:.08em;color:#e50914;font-weight:900;margin:8px 0 24px;}
.panel{border:2px solid #333;border-radius:18px;background:#111;padding:28px 22px;}
.grid{display:block;}
.qr{width:220px;height:220px;background:#fff;border:10px solid #18181b;border-radius:10px;margin:0 auto 24px;}
.label{color:#aaa;font-size:20px;margin:14px 0 8px;text-transform:uppercase;letter-spacing:.08em;}
.url{font-size:30px;font-weight:700;background:#000;border:2px solid #333;border-radius:12px;padding:14px;word-break:break-all;}
.code{display:inline-block;font-size:64px;line-height:1.1;font-weight:900;letter-spacing:.12em;color:#e50914;background:#000;border:2px solid #333;border-radius:12px;padding:12px 18px;margin-top:4px;}
.msg{font-size:22px;color:#ddd;margin:24px 0 0;line-height:1.35;}
.small{font-size:16px;color:#777;margin-top:14px;}
.btn{display:inline-block;margin-top:24px;background:#fff;color:#000;text-decoration:none;font-weight:800;border-radius:10px;padding:14px 22px;font-size:20px;}
@media (min-width: 800px){.grid{display:table;width:100%;}.left,.right{display:table-cell;vertical-align:middle;}.left{width:280px}.right{text-align:left;padding-left:30px}.qr{margin-bottom:0}.logo{font-size:68px}.code{font-size:78px}}
</style>
</head>
<body>
<div class="wrap">
  <div class="logo">LARAPLAY</div>
  <div class="panel">
    <div class="grid">
      <div class="left">
        <img class="qr" src="${htmlEscape(qrUrl)}" alt="QR code">
      </div>
      <div class="right">
        <div class="label">Ouvrez sur téléphone</div>
        <div class="url">${htmlEscape(verifyUrl.replace(/^https?:\/\//, ""))}</div>
        <div class="label">Entrez ce code</div>
        <div class="code">${htmlEscape(userCode)}</div>
      </div>
    </div>
    <p class="msg">${htmlEscape(message)}</p>
    ${shouldRefresh ? `<p class="small">Actualisation automatique toutes les ${refreshSeconds} secondes. Si rien ne se passe, utilisez la touche Actualiser de la TV.</p>` : `<a class="btn" href="${htmlEscape(restartUrl)}">Générer un nouveau code</a>`}
  </div>
</div>
</body>
</html>`;
}

function cookieValue(req: Request, name: string): string {
  const raw = req.headers.get("cookie") ?? "";
  for (const part of raw.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === name) return decodeURIComponent(v.join("="));
  }
  return "";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const forceNew = url.searchParams.get("new") === "1";
  const deviceCode = forceNew ? "" : cookieValue(req, DEVICE_COOKIE);

  // Rate limit création de codes (AUTH-01 durcissement).
  if (!deviceCode) {
    if (!rateLimit(`start:${clientIp(req)}`, 10, 60_000)) {
      return new Response(renderPage({ req, userCode: "----", status: "error" }), {
        status: 429,
        headers: noStoreHeaders(),
      });
    }
    const session = await createDeviceSession();
    const next = publicUrl(req, "/login-basic");
    next.searchParams.set("user_code", session.userCode);
    const res = redirectNoStore(next);
    setDeviceCookie(res, session.deviceCode);
    return res;
  }

  const session = await getByDeviceCode(deviceCode);
  if (!session) {
    return new Response(renderPage({ req, userCode: "----", status: "expired" }), {
      headers: noStoreHeaders(),
    });
  }

  if (session.status === "approved") {
    // Le finalize lit le device_code dans le cookie HttpOnly, plus en query.
    return redirectNoStore(publicUrl(req, "/api/auth/device/finalize"));
  }

  const status = session.status === "consumed" ? "consumed" : session.status;
  return new Response(renderPage({ req, userCode: session.userCode, status }), {
    headers: noStoreHeaders(),
  });
}
