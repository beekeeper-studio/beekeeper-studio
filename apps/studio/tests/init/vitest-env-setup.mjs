// Logger setup. fetch/TextEncoder/TextDecoder need no polyfill: node 22 (and
// vitest's jsdom environment) provide them natively.
import rawLog from 'electron-log/main'

rawLog.initialize()
rawLog.transports.console.level = 'debug'

// snowflake-sdk probes cloud platforms on import, which loads modules after
// the test environment tears down and fails the run.
process.env.SNOWFLAKE_DISABLE_PLATFORM_DETECTION = "true";
