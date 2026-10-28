/** Pruebas de integración: API real (NestJS) + PostgreSQL de pruebas (TEST_DATABASE_URL). */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }] },
  globalSetup: '<rootDir>/test/integration/global-setup.ts',
  globalTeardown: '<rootDir>/test/integration/global-teardown.ts',
  setupFiles: ['<rootDir>/test/integration/env.ts'],
  testTimeout: 30000,
};
