/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/lib'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: { module: 'commonjs', moduleResolution: 'node', esModuleInterop: true },
      },
    ],
  },
  testMatch: ['**/*.test.ts'],
};
