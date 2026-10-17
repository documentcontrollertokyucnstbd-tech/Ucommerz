import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";
import shared from "@ucommerz/config/eslint";

const __dirname = dirname(fileURLToPath(import.meta.url));
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts", "app/components/ui/**"] },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  { rules: shared.rules },
];

export default config;
