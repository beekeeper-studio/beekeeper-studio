export function monthAgo(): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - 1);
  return date;
}
