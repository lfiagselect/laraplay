// COMP-01: aplatit les @layer générés par Tailwind 4 pour la cible TV
// Chromium 53+ (LG webOS 4.x / Samsung 2018 M56+). Réécriture par spécificité.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
