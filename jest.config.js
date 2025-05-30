module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Override tsconfig.json for Jest
      tsconfig: {
        jsx: 'react-jsx', // Ensure ts-jest transpiles JSX
        // Preserve other settings from your main tsconfig.json or add as needed for tests
        // For example, if you have 'esModuleInterop': true in your main tsconfig,
        // and it's necessary for tests, you might need to ensure it's here too,
        // though ts-jest usually inherits well.
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // To handle path aliases like @/lib/utils
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'], // Updated to .ts
  // Optional: You can uncomment these lines if you want to set up code coverage reporting
  // collectCoverage: true,
  // coverageDirectory: "coverage",
  // collectCoverageFrom: [
  //   "src/**/*.{ts,tsx}",
  //   "!src/**/*.d.ts",
  //   "!src/**/index.ts" // Or other specific files to ignore
  // ],
};
