// LARAPLAY — Détection TV server-safe (PAS "use client").
// Server: detectTVServer(ua) → headers UA dans RootLayout/pages.
// Client utilities (useTV hook): voir lib/tv-client.ts

const TV_UA_REGEX =
  /Tizen|Web0S|webOS|AFT[A-Z]|CrKey|Chromecast|AppleTV|GoogleTV|SMART-TV|SmartTV|HbbTV|NetCast|VIERA|BRAVIA|DTV|POV_TV|PhilipsTV|Roku|Xbox|PlayStation|NintendoBrowser/i;

export function detectTVServer(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return TV_UA_REGEX.test(userAgent);
}

export const TV_KEYS = {
  UP: ["ArrowUp"],
  DOWN: ["ArrowDown"],
  LEFT: ["ArrowLeft"],
  RIGHT: ["ArrowRight"],
  ENTER: ["Enter", " "],
  BACK: ["Backspace", "Escape", "GoBack", "BrowserBack", "XF86Back"],
  PLAY: ["MediaPlayPause", "MediaPlay", "Play"],
  PAUSE: ["MediaPause", "Pause"],
  STOP: ["MediaStop", "Stop"],
  REWIND: ["MediaRewind"],
  FORWARD: ["MediaFastForward"],
} as const;

export type TVKeyAction = keyof typeof TV_KEYS;

export function matchTVKey(key: string, action: TVKeyAction): boolean {
  return (TV_KEYS[action] as readonly string[]).includes(key);
}

export { TV_UA_REGEX };
