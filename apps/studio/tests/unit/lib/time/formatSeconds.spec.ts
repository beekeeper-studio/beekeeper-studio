import formatSeconds from "@/lib/time/formatSeconds"

describe("formatSeconds", () => {
  it("formats sub-minute and sub-hour durations as mm:ss", () => {
    expect(formatSeconds(0)).toBe("00:00")
    expect(formatSeconds(5)).toBe("00:05")
    expect(formatSeconds(59)).toBe("00:59")
    expect(formatSeconds(60)).toBe("01:00")
    expect(formatSeconds(95)).toBe("01:35")
    expect(formatSeconds(3599)).toBe("59:59")
  })

  it("shows the hours field starting exactly at one hour", () => {
    // Regression: the threshold used to be `seconds > 3600`, so at
    // exactly 3600s (1h) the hours prefix was dropped and the timer
    // briefly rendered "00:00" instead of "01:00:00".
    expect(formatSeconds(3600)).toBe("01:00:00")
    expect(formatSeconds(3601)).toBe("01:00:01")
    expect(formatSeconds(3661)).toBe("01:01:01")
    expect(formatSeconds(7384)).toBe("02:03:04")
  })
})
