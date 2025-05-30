module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      // Override tsconfig.json for Jest
      tsconfig: {
        jsx: 'react-jsx', // Ensure ts-jest transpiles JSX
      },
    }],
  },
  // Revert transformIgnorePatterns as moduleNameMapper will handle lucide-react
  // Default Jest behavior is to not transform node_modules.
  // If other ESM modules cause issues, this might need to be adjusted.
  transformIgnorePatterns: [
    "/node_modules/",
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1', // To handle path aliases like @/lib/utils
    // Force lucide-react to resolve to its CJS version for Jest
    '^lucide-react$': '<rootDir>/node_modules/lucide-react/dist/cjs/lucide-react.js',
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
