import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        console: "readonly",
        
        // Node.js globals
        process: "readonly",
        global: "readonly",
        setTimeout: "readonly",
        setInterval: "readonly",
        
        // Web globals
        fetch: "readonly",
        AbortSignal: "readonly",
        URLSearchParams: "readonly",
        
        // Jest globals
        jest: "readonly",
        describe: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        
        // Project-specific globals
        isDebug: "readonly",
        storage: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "warn",
    },
  },
];