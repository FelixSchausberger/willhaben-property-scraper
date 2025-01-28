export default [
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        // Equivalent of "env: node" (Node.js globals)
        global: "readonly",
        process: "readonly",
        __dirname: "readonly",
        // Equivalent of "env: es2021" (ES2021 globals)
        Atomics: "readonly",
        SharedArrayBuffer: "readonly",
        // Jest-specific globals
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
      },
    },
    rules: {
      // Add specific ESLint rules here if needed
      // "no-unused-vars": "warn",
    },
  },
];
