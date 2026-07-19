// Polyfills ciblés pour les moteurs Chromium TV antérieurs à 92.
// Garder ce fichier synchrone et minuscule : instrumentation-client le charge
// avant l'hydratation React.

if (!Array.prototype.at) {
  Object.defineProperty(Array.prototype, "at", {
    configurable: true,
    writable: true,
    value: function at<T>(this: T[], index: number): T | undefined {
      const length = this.length >>> 0;
      const relative = Math.trunc(index) || 0;
      const position = relative < 0 ? length + relative : relative;
      return position < 0 || position >= length ? undefined : this[position];
    },
  });
}

if (!String.prototype.at) {
  Object.defineProperty(String.prototype, "at", {
    configurable: true,
    writable: true,
    value: function at(this: string, index: number): string | undefined {
      const value = String(this);
      const relative = Math.trunc(index) || 0;
      const position = relative < 0 ? value.length + relative : relative;
      return position < 0 || position >= value.length ? undefined : value.charAt(position);
    },
  });
}

if (!Object.fromEntries) {
  Object.defineProperty(Object, "fromEntries", {
    configurable: true,
    writable: true,
    value: function fromEntries(entries: Iterable<readonly [PropertyKey, unknown]>) {
      const result: Record<PropertyKey, unknown> = {};
      for (const entry of entries) result[entry[0]] = entry[1];
      return result;
    },
  });
}

if (!Object.entries) {
  Object.defineProperty(Object, "entries", {
    configurable: true,
    writable: true,
    value: function entries(object: object): [string, unknown][] {
      const keys = Object.keys(object);
      const result: [string, unknown][] = [];
      for (let index = 0; index < keys.length; index++) {
        const key = keys[index];
        result.push([key, (object as Record<string, unknown>)[key]]);
      }
      return result;
    },
  });
}

if (!Object.values) {
  Object.defineProperty(Object, "values", {
    configurable: true,
    writable: true,
    value: function values(object: object): unknown[] {
      const keys = Object.keys(object);
      const result: unknown[] = [];
      for (let index = 0; index < keys.length; index++) {
        result.push((object as Record<string, unknown>)[keys[index]]);
      }
      return result;
    },
  });
}

// Chrome 53/56 ne fournit pas AbortController, alors que le routeur Next et
// certains chemins HLS peuvent l'instancier après l'hydratation. Ce repli
// couvre le contrat utilisé ici (état, raison et listeners "abort") ; le fetch
// natif de ces moteurs ne devient pas annulable pour autant.
if (typeof window.AbortController === "undefined") {
  type LegacyAbortListener = EventListenerOrEventListenerObject;

  const createAbortEvent = (): Event => {
    try {
      return new Event("abort");
    } catch {
      const event = document.createEvent("Event");
      event.initEvent("abort", false, false);
      return event;
    }
  };

  const createAbortReason = (): unknown => {
    try {
      return new DOMException("The operation was aborted.", "AbortError");
    } catch {
      const error = new Error("The operation was aborted.");
      error.name = "AbortError";
      return error;
    }
  };

  class LegacyAbortSignal {
    aborted = false;
    reason: unknown;
    onabort: ((event: Event) => void) | null = null;
    private listeners: LegacyAbortListener[] = [];

    addEventListener(type: string, listener: LegacyAbortListener | null): void {
      if (type !== "abort" || !listener || this.listeners.indexOf(listener) >= 0) return;
      this.listeners.push(listener);
    }

    removeEventListener(type: string, listener: LegacyAbortListener | null): void {
      if (type !== "abort" || !listener) return;
      const index = this.listeners.indexOf(listener);
      if (index >= 0) this.listeners.splice(index, 1);
    }

    throwIfAborted(): void {
      if (this.aborted) throw this.reason;
    }

    dispatchAbort(reason: unknown): void {
      if (this.aborted) return;
      this.aborted = true;
      this.reason = reason;
      const event = createAbortEvent();
      const listeners = this.listeners.slice();
      if (typeof this.onabort === "function") this.onabort.call(this, event);
      for (const listener of listeners) {
        if (typeof listener === "function") listener.call(this, event);
        else listener.handleEvent(event);
      }
    }
  }

  class LegacyAbortController {
    readonly signal = new LegacyAbortSignal();

    abort(reason?: unknown): void {
      this.signal.dispatchAbort(reason === undefined ? createAbortReason() : reason);
    }
  }

  Object.defineProperty(window, "AbortSignal", {
    configurable: true,
    writable: true,
    value: LegacyAbortSignal,
  });
  Object.defineProperty(window, "AbortController", {
    configurable: true,
    writable: true,
    value: LegacyAbortController,
  });
}

// Chrome 53/56 : React possède un repli interne, mais les autres callbacks de
// l'application peuvent utiliser queueMicrotask après l'hydratation.
if (typeof window.queueMicrotask !== "function") {
  const resolved = Promise.resolve();
  window.queueMicrotask = (callback: VoidFunction): void => {
    resolved.then(callback).catch((error) => {
      window.setTimeout(() => { throw error; }, 0);
    });
  };
}

// Utilisé par le runtime React View Transition. Le chemin n'est normalement
// pas activé sur ces TV, mais le polyfill évite un échec si le firmware expose
// une implémentation partielle de l'API d'animation.
if (typeof Promise.allSettled !== "function") {
  Object.defineProperty(Promise, "allSettled", {
    configurable: true,
    writable: true,
    value: function allSettled(values: Iterable<unknown>) {
      return Promise.all(Array.from(values, (value) =>
        Promise.resolve(value).then(
          (resolvedValue) => ({ status: "fulfilled" as const, value: resolvedValue }),
          (reason) => ({ status: "rejected" as const, reason }),
        )
      ));
    },
  });
}
