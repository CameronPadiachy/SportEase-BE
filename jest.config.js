/** @type {import('jest').Config} */
module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'], // Only match files like *.test.js or *.spec.js
    testPathIgnorePatterns: [
      '/node_modules/',
      '/testApp\\.js$' // Prevent testApp.js from being treated as a test
    ],
  };
  
