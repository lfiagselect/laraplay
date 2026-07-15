/** Lance une vidéo sans supposer que play() retourne une Promise (anciens moteurs TV). */
export function safePlay(video: HTMLMediaElement, onRejected?: () => void): void {
  try {
    const result = video.play();
    if (result && typeof result.catch === "function") {
      result.catch(() => onRejected?.());
    }
  } catch {
    onRejected?.();
  }
}
