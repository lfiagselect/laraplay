// LARAPLAY — Détection TV server-safe (PAS "use client").

const TV_UA_REGEX =
  /Tizen|SamsungBrowser.*TV|Samsung.*TV|Web0S|WebOS|webOS|webOSTV|webOS\.TV|WebAppManager|LG Browser|LG NetCast|LG[ _-]?(?:Smart)?TV|AFT[A-Z]|Silk\/|CrKey|Chromecast|AppleTV|GoogleTV|SMART-TV|SmartTV|HbbTV|NetCast|VIERA|BRAVIA|DTV|POV_TV|PhilipsTV|Hisense|VIDAA|Vewd|Opera TV|Roku|Xbox|PlayStation|NintendoBrowser/i;

export function detectTVServer(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return TV_UA_REGEX.test(userAgent);
}

export const TV_KEYS = {
  UP: ["ArrowUp", "Up"],
  DOWN: ["ArrowDown", "Down"],
  LEFT: ["ArrowLeft", "Left"],
  RIGHT: ["ArrowRight", "Right"],
  ENTER: ["Enter", " ", "OK", "Accept", "Select"],
  BACK: ["Backspace", "Escape", "GoBack", "BrowserBack", "XF86Back"],
  PLAY: ["MediaPlayPause", "MediaPlay", "Play"],
  PAUSE: ["MediaPause", "Pause"],
  STOP: ["MediaStop", "Stop"],
  REWIND: ["MediaRewind"],
  FORWARD: ["MediaFastForward"],
} as const;

/** Événement interne : le premier input D-pad réveille les contrôles masqués. */
export const TV_CONTROLS_WAKE_EVENT = "laraplay:tv-controls-wake";

export type TVKeyAction = keyof typeof TV_KEYS;

export const TV_KEYCODES: Record<TVKeyAction, number[]> = {
  UP: [38],
  DOWN: [40],
  LEFT: [37],
  RIGHT: [39],
  ENTER: [13, 32],
  BACK: [8, 27, 10009, 461],
  PLAY: [415, 10252],
  PAUSE: [19],
  STOP: [413],
  REWIND: [412],
  FORWARD: [417],
};

export function matchTVKey(key: string, action: TVKeyAction): boolean {
  return (TV_KEYS[action] as readonly string[]).indexOf(key) !== -1;
}

export function matchTVKeyEvent(e: KeyboardEvent, action: TVKeyAction): boolean {
  if (matchTVKey(e.key, action)) return true;
  if (matchTVKey(e.code, action)) return true;
  if (TV_KEYCODES[action].indexOf(e.keyCode) !== -1) return true;
  return false;
}

export { TV_UA_REGEX };
