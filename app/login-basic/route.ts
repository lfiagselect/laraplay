// LARAPLAY — Login TV ultra-compatible pour navigateurs anciens / inconnus.
// Route HTML sans React client, sans fetch côté TV, avec refresh HTML serveur.

import { NextResponse } from "next/server";
import { createDeviceSession, DEVICE_FLOW_CONFIG, getByDeviceCode } from "@/lib/device-flow";

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

function publicOrigin(req: Request): string {
  if (process.env.NEXTAUTH_URL) {
    try {
      return new URL(process.env.NEXTAUTH_URL).origin;
    } catch {
      // ignore, fallback request headers
    }
  }
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
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
  deviceCode,
  userCode,
  status,
}: {
  req: Request;
  deviceCode: string;
  userCode: string;
  status: "pending" | "expired" | "denied" | "error";
}) {
  const origin = publicOrigin(req);
  const verifyUrl = `${origin}/d`;
  const currentUrl = new URL(req.url);
  currentUrl.searchParams.set("device_code", deviceCode);
  currentUrl.searchParams.set("user_code", userCode);
  currentUrl.searchParams.set("_", String(Date.now()));

  const restartUrl = new URL("/login-basic", req.url).toString();
  const refreshSeconds = Math.max(4, DEVICE_FLOW_CONFIG.pollIntervalSec);
  const shouldRefresh = status === "pending";
  const title = status === "pending" ? "Connexion TV" : "Connexion TV interrompue";
  const message =
    status === "pending"
      ? "En attente de validation sur votre téléphone. Cette page se vérifie automatiquement."
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

export async function GET(req: Request) {
  const url = new URL(req.url);
  let deviceCode = url.searchParams.get("device_code") ?? "";
  let userCode = url.searchParams.get("user_code") ?? "";

  if (!deviceCode || !userCode) {
    const session = await createDeviceSession();
    const next = new URL("/login-basic", req.url);
    next.searchParams.set("device_code", session.deviceCode);
    next.searchParams.set("user_code", session.userCode);
    return redirectNoStore(next);
  }

  const session = await getByDeviceCode(deviceCode);
  if (!session) {
    return new Response(renderPage({ req, deviceCode, userCode, status: "expired" }), {
      headers: noStoreHeaders(),
    });
  }

  deviceCode = session.deviceCode;
  userCode = session.userCode;

  if (session.status === "approved") {
    const finalizeUrl = new URL("/api/auth/device/finalize", req.url);
    finalizeUrl.searchParams.set("device_code", deviceCode);
    return redirectNoStore(finalizeUrl);
  }

  return new Response(renderPage({ req, deviceCode, userCode, status: session.status }), {
    headers: noStoreHeaders(),
  });
}
