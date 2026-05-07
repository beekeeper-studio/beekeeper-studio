export function monthAgo(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
}

/** Human-readable group label for `when` relative to `now`, used by the query
 * edit history sidebar (e.g. "Today", "Yesterday", "Last month"). */
export function relativeDateGroup(when: Date, now: Date): string {
  const elapsedMs = now.getTime() - when.getTime();
  if (elapsedMs >= 0 && elapsedMs < 10 * 60 * 1000) {
    return "Just now";
  }
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (when >= today) {
    return "Today";
  }
  if (when >= yesterday) {
    return "Yesterday";
  }
  const thisWeek = startOfWeek(now);
  if (when >= thisWeek) {
    return when.toLocaleString("en-US", { weekday: "long" });
  }

  const lastWeek = new Date(thisWeek);
  lastWeek.setDate(lastWeek.getDate() - 7);
  if (when >= lastWeek) {
    return "Last week";
  }

  const thisMonth = startOfMonth(now);
  if (when >= thisMonth) {
    return "This month";
  }

  const lastMonth = new Date(thisMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  if (when >= lastMonth) {
    return "Last month";
  }

  const thisYear = startOfYear(now);
  if (when >= thisYear) {
    return when.toLocaleString("en-US", { month: "long" });
  }

  const lastYear = new Date(thisYear);
  lastYear.setFullYear(lastYear.getFullYear() - 1);
  if (when >= lastYear) {
    return "Last year";
  }

  return "Years ago";
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

// ISO-style: weeks start on Monday.
function startOfWeek(d: Date): Date {
  const r = startOfDay(d);
  const day = r.getDay();
  const offset = day === 0 ? -6 : 1 - day;
  r.setDate(r.getDate() + offset);
  return r;
}

function startOfMonth(d: Date): Date {
  const r = startOfDay(d);
  r.setDate(1);
  return r;
}

function startOfYear(d: Date): Date {
  const r = startOfDay(d);
  r.setMonth(0, 1);
  return r;
}

