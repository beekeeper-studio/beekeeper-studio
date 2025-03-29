// eslint-disable-next-line
var unitConfig = require('./jest.config')

unitConfig.testMatch = ["**/tests/integration/**/*.spec.[jt]s?(x)"]
const config = {
  ...unitConfig,
  testEnvironment: 'node',
  setupFilesAfterEnv: [],
  silent: false,
  globals: {
    fetch: global.fetch,
    // just to keep config.ts happy in debug mode
    localStorage: {}
  },
}

// Create a function to customize test configuration based on the test file
const findTestFilesInArgs = () => {
  // Look through all command line arguments for test file paths
  return process.argv.filter(arg => 
    typeof arg === 'string' && 
    (arg.includes('.spec.') || arg.includes('tests/integration/'))
  );
};

// Check if any test in the current run includes codemirror tests
const testPaths = findTestFilesInArgs();
const isRunningAllTests = testPaths.length === 0 || testPaths.some(p => !p.includes('spec.'));
const hasCodeMirrorTests = isRunningAllTests || testPaths.some(p => p.includes('codemirror'));

// Apply special configuration if codemirror tests are included
if (hasCodeMirrorTests) {
  console.log('Using jsdom environment for CodeMirror tests');
  
  // Configure projects array to use different environments for different test files
  config.projects = [
    // Regular node environment for most tests
    {
      ...config,
      displayName: 'node',
      testMatch: ["**/tests/integration/**/*.spec.[jt]s?(x)"],
      testPathIgnorePatterns: ["/codemirror/"]
    },
    // JSDOM environment specifically for codemirror tests
    {
      ...config,
      displayName: 'jsdom',
      testEnvironment: 'jsdom',
      testMatch: ["**/tests/integration/codemirror/**/*.spec.[jt]s?(x)"],
      testEnvironmentOptions: {
        url: "http://localhost",
        browsers: ["chrome"]
      },
      setupFilesAfterEnv: [
        ...unitConfig.setupFilesAfterEnv,
        '<rootDir>/tests/integration/codemirror/setup.js'
      ]
    }
  ];
}

module.exports = config
