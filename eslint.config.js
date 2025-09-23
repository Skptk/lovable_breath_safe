import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";
import importPlugin from "eslint-plugin-import";
import { fileURLToPath } from 'node:url';
import path from 'path';
import { fileURLToPath as fileURLToPathNode } from 'url';

// Get the directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import custom rules
const noBeforeInit = await import('./eslint/rules/no-before-init.js');

// Enable TypeScript's path mapping support
const tsconfigPath = fileURLToPath(new URL('./tsconfig.json', import.meta.url));

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  {
    extends: [
      js.configs.recommended, 
      ...tseslint.configs.recommended,
      'plugin:import/recommended',
      'plugin:import/typescript',
    ],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: tsconfigPath,
        tsconfigRootDir: process.cwd(),
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "import": importPlugin,
    },
    settings: {
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
      'import/resolver': {
        typescript: {
          project: tsconfigPath,
        },
        node: true,
      },
    },
    rules: {
      // Core React rules
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "react-hooks/exhaustive-deps": "error",
      
      // TypeScript rules
      "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
      "@typescript-eslint/explicit-function-return-type": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-use-before-define": ["error", { 
        "functions": false, 
        "classes": true, 
        "variables": true,
        "enums": true,
        "typedefs": true
      }],
      
      // Import/export rules
      "import/no-cycle": ["error", { maxDepth: Infinity }],
      "import/no-unresolved": "error",
      "import/order": ["error", {
        "groups": [
          "builtin",
          "external",
          "internal",
          "parent",
          "sibling",
          "index",
          "object",
          "type"
        ],
        "newlines-between": "always",
        "alphabetize": { 
          "order": "asc",
          "caseInsensitive": true 
        }
      }],
      
      // Best practices to catch initialization issues
      "no-use-before-define": "off", // Using @typescript-eslint version instead
      "no-undef": "error",
      "no-restricted-syntax": [
        "error",
        {
          "selector": "VariableDeclarator > CallExpression[callee.name='require']",
          "message": "Use ES6 import/export syntax instead of require"
        }
      ]
    },
  },
  // Additional configuration for test files
  {
    files: ["**/*.test.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-use-before-define": "off"
    }
  },
  
  // Custom rules configuration
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      'custom-rules': {
        rules: {
          'no-before-init': noBeforeInit.default
        }
      }
    },
    rules: {
      // Custom rules
      'custom-rules/no-before-init': 'error',
      
      // Stricter React rules
      'react-hooks/exhaustive-deps': ['error', {
        additionalHooks: '(useIsomorphicLayoutEffect|useCustomHook)'
      }],
      
      // Additional rules for initialization order
      'no-use-before-define': 'off',
      '@typescript-eslint/no-use-before-define': ['error', {
        functions: false,
        classes: true,
        variables: true,
        enums: true,
        typedefs: true,
        ignoreTypeReferences: false,
        allowNamedExports: false
      }],
      
      // Ensure proper initialization order for hooks
      'react-hooks/rules-of-hooks': 'error',
      
      // Catch potential race conditions
      'require-atomic-updates': 'error',
      
      // Ensure proper cleanup in effects
      'react-hooks/exhaustive-deps': ['error', {
        additionalHooks: '(useCustomHook)'
      }],
      
      // Prevent common initialization issues
      'no-undef': 'error',
      'no-unused-vars': ['error', { 'args': 'after-used', 'ignoreRestSiblings': true }],
      
      // Import order to help with initialization
      'import/order': ['error', {
        'groups': [
          'builtin',
          'external',
          'internal',
          'parent',
          'sibling',
          'index',
          'object',
          'type'
        ],
        'pathGroups': [
          {
            pattern: 'react',
            group: 'external',
            position: 'before'
          },
          {
            pattern: '@/**',
            group: 'internal'
          }
        ],
        'pathGroupsExcludedImportTypes': ['react'],
        'newlines-between': 'always',
        'alphabetize': {
          'order': 'asc',
          'caseInsensitive': true
        }
      }]
    }
  }
);
