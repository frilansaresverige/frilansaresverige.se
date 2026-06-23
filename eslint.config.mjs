import next from 'eslint-config-next/core-web-vitals'
import testingLibrary from 'eslint-plugin-testing-library'

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**'],
  },
  ...next,
  {
    files: ['**/__tests__/**/*.[jt]s?(x)', '**/?(*.)+(spec|test).[jt]s?(x)'],
    ...testingLibrary.configs['flat/react'],
  },
]

export default eslintConfig
