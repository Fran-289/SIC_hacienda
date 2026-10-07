import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    // Patrones legítimos en esta base de código:
    //  - guardas de hidratación (setMounted(true) en useEffect)
    //  - inicio de carga de datos (setLoading(true) antes del primer await)
    // Se dejan como aviso para no ocultarlos, pero no bloquean `npm run lint`.
    rules: {
      "react-hooks/set-state-in-effect": "warn",
    },
  },
]);

export default eslintConfig;
