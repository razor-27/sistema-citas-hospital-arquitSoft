import type { Config } from 'jest';

const config: Config = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
    '!src/**/index.ts',
    '!src/**/dtos/**',
    '!src/**/*.dto.ts',
    '!src/**/postgres-*.repository.ts',
    '!src/**/argon2-hash.service.ts',
    '!src/**/jwt.strategy.ts',
    '!src/**/jwt-auth.guard.ts',
    '!src/**/reniec.adapter.ts',
    '!src/**/sis-resilient.adapter.ts',
  ],
  coverageDirectory: './coverage',
  coverageReporters: ['text', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  testEnvironment: 'node',
};

export default config;
