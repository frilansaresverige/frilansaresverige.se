// jest.config.ts
import type { Config } from '@jest/types'
import nextJest from 'next/jest'
const createJestConfig = nextJest({
  // Provide the path to Next.js app to load next.config.js and .env files in test environment
  dir: './',
})

// Custom config to be passed to Jest
const config: Config.InitialOptions = {
  name: 'frilansaresverige.se',
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  verbose: true,
  setupFilesAfterEnv: ['./jest.setup.ts'],
  moduleNameMapper: {
    '^@/components/(.*)$': './components/$1',
    '^@/pages/(.*)$': './pages/$1',
    '^@/hooks/(.*)$': './hooks/$1',
  },
}
// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
export default createJestConfig(config)
