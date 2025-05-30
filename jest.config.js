module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // To handle path aliases like @/lib/utils
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Add this line
  // Optional: You can uncomment these lines if you want to set up code coverage reporting
  // collectCoverage: true,
  // coverageDirectory: "coverage",
  // collectCoverageFrom: [
  //   "src/**/*.{ts,tsx}",
  //   "!src/**/*.d.ts",
  //   "!src/**/index.ts" // Or other specific files to ignore
  // ],
};
