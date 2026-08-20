import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'supabase'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Node types are on for the whole app project so a test can read a
      // source file from disk. Shipped code must not follow them into the
      // bundle, so the import itself is what gets forbidden.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['node:*'],
              message:
                'Node builtins do not exist in the browser. Only test files may read from disk.',
            },
          ],
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "Literal[value=/rickandmortyapi\.com/]",
          message:
            'The frontend must never contact rickandmortyapi.com directly. All external calls go through the Edge Function. See spec section 3.1.',
        },
        {
          selector: "TemplateElement[value.raw=/rickandmortyapi\.com/]",
          message:
            'The frontend must never contact rickandmortyapi.com directly. All external calls go through the Edge Function. See spec section 3.1.',
        },
      ],
    },
  },
  {
    // Tests run under Vitest in Node, so reading a source file from disk is
    // legitimate there and nowhere else.
    files: ['src/**/*.test.{ts,tsx}', 'src/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
)
