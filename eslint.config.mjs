import next from 'eslint-config-next/core-web-vitals'
import nextTypeScript from 'eslint-config-next/typescript'
import testingLibrary from 'eslint-plugin-testing-library'

const eslintConfig = [
  {
    ignores: ['.next/**', 'node_modules/**', 'out/**', 'next-env.d.ts'],
  },
  ...next,
  ...nextTypeScript,
  {
    files: ['**/?(*.)+(spec|test).[jt]sx'],
    ...testingLibrary.configs['flat/react'],
  },
]

export default eslintConfig
