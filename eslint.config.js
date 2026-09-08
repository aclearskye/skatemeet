// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Deno-runtime Supabase Edge Functions — resolve modules from URLs, not
    // node_modules, so Node-oriented ESLint rules (e.g. import/no-unresolved)
    // don't apply here.
    ignores: ['dist/*', 'supabase/functions/**'],
  },
]);
