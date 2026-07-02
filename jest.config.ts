import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.css$': 'identity-obj-proxy',
    // Vite `?worker` / `?url` imports have no meaning in jsdom — map to stubs.
    '\\?worker$': '<rootDir>/src/test-utils/worker-stub.ts',
    '\\?url$': '<rootDir>/src/test-utils/asset-url-stub.ts',
  },
  setupFilesAfterEnv: ['<rootDir>/src/test-utils/setup-tests.ts'],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/main.tsx',
    '!src/**/*.d.ts',
    '!src/**/*.test.{ts,tsx}',
    '!src/test-utils/**',
  ],
  coverageThreshold: { global: { statements: 60, lines: 60 } },
};

export default config;
