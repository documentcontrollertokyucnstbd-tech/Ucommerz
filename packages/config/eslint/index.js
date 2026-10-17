/** Shared ESLint rule overrides, consumed by apps/web/eslint.config.mjs */
module.exports = {
  rules: {
    "@next/next/no-img-element": "off",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    "@typescript-eslint/no-explicit-any": "off",
    "react/no-unescaped-entities": "off",
    "prefer-const": "warn",
  },
};
