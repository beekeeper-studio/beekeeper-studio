import { relativeDateGroup } from "@/common/date";

// Strings without a timezone suffix are parsed as local time, which
// matches relativeDateGroup's local-time-based comparisons.
const d = (s: string): Date => new Date(s);

describe("relativeDateGroup", () => {
  // Wednesday, March 11, 2026 at 3pm.
  const now = d("March 11, 2026 15:00:00");

  it("returns 'Just now' for anything less than 10 minutes ago", () => {
    expect(relativeDateGroup(now, now)).toBe("Just now");
    expect(relativeDateGroup(d("March 11, 2026 14:55:00"), now)).toBe(
      "Just now"
    );
    // 9 minutes 59 seconds ago — still inside the window.
    expect(relativeDateGroup(d("March 11, 2026 14:50:01"), now)).toBe(
      "Just now"
    );
  });

  it("transitions from 'Just now' to 'Today' at the 10-minute boundary", () => {
    expect(relativeDateGroup(d("March 11, 2026 14:50:00"), now)).toBe("Today");
    expect(relativeDateGroup(d("March 11, 2026 14:49:00"), now)).toBe("Today");
  });

  it("returns 'Just now' even when 10 minutes ago is yesterday", () => {
    const justAfterMidnight = d("March 11, 2026 00:05:00");
    expect(
      relativeDateGroup(d("March 10, 2026 23:59:00"), justAfterMidnight)
    ).toBe("Just now");
  });

  it("returns 'Today'", () => {
    expect(relativeDateGroup(d("March 11, 2026 00:00:00"), now)).toBe("Today");
    expect(relativeDateGroup(d("March 11, 2026 23:59:59"), now)).toBe("Today");
  });

  it("returns 'Yesterday'", () => {
    expect(relativeDateGroup(d("March 10, 2026 00:00:00"), now)).toBe(
      "Yesterday"
    );
    expect(relativeDateGroup(d("March 10, 2026 23:59:59"), now)).toBe(
      "Yesterday"
    );
  });

  it("returns the weekday name", () => {
    // Monday is the start of the ISO week containing Wed Mar 11.
    expect(relativeDateGroup(d("March 9, 2026 12:00:00"), now)).toBe("Monday");
  });

  it("returns 'Last week'", () => {
    // The ISO week before this one is Mon Mar 2 - Sun Mar 8.
    expect(relativeDateGroup(d("March 2, 2026 00:00:00"), now)).toBe(
      "Last week"
    );
    expect(relativeDateGroup(d("March 5, 2026 12:00:00"), now)).toBe(
      "Last week"
    );
    expect(relativeDateGroup(d("March 8, 2026 23:59:59"), now)).toBe(
      "Last week"
    );
  });

  it("returns 'This month'", () => {
    // With now=Wed Mar 11, Mar 2-8 fall under "Last week", so only
    // Mar 1 remains in the "This month" bucket.
    expect(relativeDateGroup(d("March 1, 2026 12:00:00"), now)).toBe(
      "This month"
    );
    expect(relativeDateGroup(d("March 1, 2026 23:59:59"), now)).toBe(
      "This month"
    );
  });

  it("returns 'Last month'", () => {
    expect(relativeDateGroup(d("February 1, 2026 00:00:00"), now)).toBe(
      "Last month"
    );
    expect(relativeDateGroup(d("February 28, 2026 23:59:59"), now)).toBe(
      "Last month"
    );
  });

  it("returns the month name", () => {
    expect(relativeDateGroup(d("January 15, 2026 12:00:00"), now)).toBe(
      "January"
    );
  });

  it("returns 'Last year'", () => {
    expect(relativeDateGroup(d("January 1, 2025 00:00:00"), now)).toBe(
      "Last year"
    );
    expect(relativeDateGroup(d("December 31, 2025 23:59:59"), now)).toBe(
      "Last year"
    );
  });

  it("returns 'Years ago' for anything older than last year", () => {
    expect(relativeDateGroup(d("December 31, 2024 23:59:59"), now)).toBe(
      "Years ago"
    );
    expect(relativeDateGroup(d("June 1, 2020 00:00:00"), now)).toBe(
      "Years ago"
    );
  });

  it("treats the moment just before midnight today as 'Yesterday'", () => {
    expect(relativeDateGroup(d("March 10, 2026 23:59:59.999"), now)).toBe(
      "Yesterday"
    );
  });

  it("treats the moment just before yesterday's midnight as a weekday name", () => {
    expect(relativeDateGroup(d("March 9, 2026 23:59:59.999"), now)).toBe(
      "Monday"
    );
  });

  describe("when 'now' is on a Sunday (ISO week edge)", () => {
    // Sunday March 8, 2026. ISO startOfWeek = Monday March 2.
    const sunday = d("March 8, 2026 12:00:00");

    it("treats Monday of the same week as the weekday name", () => {
      expect(relativeDateGroup(d("March 2, 2026 12:00:00"), sunday)).toBe(
        "Monday"
      );
    });

    it("treats Saturday as 'Yesterday'", () => {
      expect(relativeDateGroup(d("March 7, 2026 12:00:00"), sunday)).toBe(
        "Yesterday"
      );
    });

    it("treats the prior Sunday as 'Last week' (outside this ISO week)", () => {
      // startOfLastWeek for now=Sun Mar 8 is Mon Feb 23, so Sun Mar 1 falls in.
      expect(relativeDateGroup(d("March 1, 2026 12:00:00"), sunday)).toBe(
        "Last week"
      );
    });
  });

  describe("when 'now' is in early January", () => {
    // Jan 5, 2026. There is no "month name" range this year (lastMonth == thisYear).
    const earlyJan = d("January 5, 2026 10:00:00");

    it("uses 'Last month' for late December of the prior year", () => {
      expect(
        relativeDateGroup(d("December 28, 2025 12:00:00"), earlyJan)
      ).toBe("Last month");
    });

    it("uses 'Last year' for earlier in the prior year", () => {
      expect(relativeDateGroup(d("June 15, 2025 12:00:00"), earlyJan)).toBe(
        "Last year"
      );
    });
  });
});
