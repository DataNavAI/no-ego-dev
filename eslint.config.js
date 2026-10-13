import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    files: ['src/**/*.js', 'bin/**/*.js', 'scripts/**/*.mjs', 'tests/**/*.js', 'docs/features/**/tests/**/*.js', 'eslint.config.js'],
    ...js.configs.recommended,
    rules: { ...js.configs.recommended.rules, 'no-eval': 'error', 'no-implied-eval': 'error', 'no-new-func': 'error' },
    languageOptions: { globals: globals.node },
  },
  { files: ['src/web/public/**/*.js', 'src/communicator/public/**/*.js'], languageOptions: { globals: globals.browser } },
];
