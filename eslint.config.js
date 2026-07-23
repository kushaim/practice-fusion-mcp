import js from "@eslint/js";
import tseslint from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default tseslint.config(
  { ignores: ["dist/", "node_modules/", "coverage/"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // FHIR resources are dynamically typed JSON; `any` is used deliberately
      // in the shapers and test harnesses.
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  prettier,
);
