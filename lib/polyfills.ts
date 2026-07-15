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
