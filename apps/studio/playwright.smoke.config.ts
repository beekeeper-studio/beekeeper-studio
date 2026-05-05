import config from './playwright.ci.config'

config.testMatch = /.*appLaunch\.test\.ts/
config.testIgnore = undefined

export default config
