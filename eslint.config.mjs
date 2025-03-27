import globals from 'globals';
import pluginJs from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import pluginSecurity from 'eslint-plugin-security';

/** @type {import('eslint').Linter.Config[]} */
export default [
  {
    files: ['**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node, // Add Node.js globals (includes `process`)
        ...globals.mocha, // Mocha
      },
    },
  },
  {
    ignores: ['.dockerignore', 'src/bak/**/*.js'], // Add .dockerignore to the ignored files
  },
  pluginJs.configs.recommended,
  pluginSecurity.configs.recommended,
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error', // Enforce Prettier formatting as an ESLint error
      ...prettierConfig.rules, // Disable conflicting ESLint rules
    },
  },
];
