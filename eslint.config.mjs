import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      'examples/**',
      '**/*.d.ts',
    ],
  },
  ...tseslint.configs.recommended,
  prettier,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
);
