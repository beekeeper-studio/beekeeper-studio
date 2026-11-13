import { describe, it, expect, vi } from "vitest"
import { resolveAppVersion, mainPlatformInfo } from "@/common/platform_info/mainPlatformInfo"
vi.mock('electron', () => {
  const app = {
    isPackaged: false,
    getLocale: () => 'en',
    getVersion: () => '1.0.0',
    getPath: (name) => {
      if (name === 'downloads') throw new Error("Failed to get 'downloads' path")
      return '/fake/' + name
    },
  }
  return { default: { app }, app }
})

describe("mainPlatformInfo", () => {
  const testCases = [
    ['1.0.0', { major: 1, minor: 0, patch: 0, channel: 'stable' }],
    ['1.99.123', { major: 1, minor: 99, patch: 123, channel: 'stable' }],
    ['5.0.0-beta.1', { major: 5, minor: 0, patch: 0, channel: 'beta', channelRelease: 1 }],
    ['5.0.0-alpha', { major: 5, minor: 0, patch: 0, channel: 'alpha', channelRelease: 0 }],
    ['5.0.0-beta.99', { major: 5, minor: 0, patch: 0, channel: 'beta', channelRelease: 99}]
  ]

  testCases.forEach(([ input, expected]) => {
    it(`Should resolve ${input} properly`, () => {
      expect(resolveAppVersion(input)).toEqual(expected)
    })
  })

  it('falls back to the home directory when the downloads path cannot be resolved', () => {
    delete process.env.TEST_MODE
    const info = mainPlatformInfo()
    expect(info.downloadsDirectory).toBe('/fake/home')
  })
})
