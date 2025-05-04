/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/testApp\\.js$'
  ],
  // Add these new configurations:
  moduleDirectories: ['node_modules', '<rootDir>'],
  moduleFileExtensions: ['js', 'json'],
  moduleNameMapper: {
    '^@controllers/(.*)$': '<rootDir>/controllers/$1',
    '^@routes/(.*)$': '<rootDir>/routes/$1'
  },
  roots: ['<rootDir>'],
  // For better debugging
  verbose: true,
  displayName: {
    name: 'API',
    color: 'blue'
  }
};