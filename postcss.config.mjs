// COMP-01: aplatit les @layer générés par Tailwind 4 pour les moteurs
// Chromium < 99 (Samsung 2023 = M94). Réécriture par spécificité.
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
    "@csstools/postcss-cascade-layers": {},
  },
};

export default config;
