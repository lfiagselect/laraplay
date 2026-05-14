// LARAPLAY — Détection TV server-safe (PAS "use client").
// Server: detectTVServer(ua) → headers UA dans RootLayout/pages.
// Client utilities (useTV hook): voir lib/tv-client.ts

const TV_UA_REGEX =
  /Tizen|Web0S|webOS|AFT[A-Z]|Silk\/|CrKey|Chromecast|AppleTV|GoogleTV|SMART-TV|SmartTV|HbbTV|NetCast|VIERA|BRAVIA|DTV|POV_TV|PhilipsTV|Roku|Xbox|PlayStation|NintendoBrowser/i;

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

// Fallback keyCodes pour TVs anciennes (Tizen/WebOS) qui n'envoient pas KeyboardEvent.key
// Tizen: https://developer.samsung.com/smarttv/develop/guides/user-interaction/remote-control.html
// WebOS: https://webostv.developer.lge.com/develop/references/magic-remote
export const TV_KEYCODES: Record<TVKeyAction, number[]> = {
  UP: [38],
  DOWN: [40],
  LEFT: [37],
  RIGHT: [39],
  ENTER: [13, 32],
  BACK: [8, 27, 10009, 461],  // 10009=Tizen, 461=WebOS
  PLAY: [415],
  PAUSE: [19],
  STOP: [413],
  REWIND: [412],
  FORWARD: [417],
};

export type TVKeyAction = keyof typeof TV_KEYS;

export function matchTVKey(key: string, action: TVKeyAction): boolean {
  return (TV_KEYS[action] as readonly string[]).includes(key);
}

/** Match keyboard event (e.key OU e.keyCode fallback Tizen/WebOS). */
export function matchTVKeyEvent(e: KeyboardEvent, action: TVKeyAction): boolean {
  if (matchTVKey(e.key, action)) return true;
  if (TV_KEYCODES[action].includes(e.keyCode)) return true;
  return false;
}

export { TV_UA_REGEX };
