import dateFormat from "dateformat";

export const DEFAULT_FILENAME_TEMPLATE = "{YYYY}-{MM}-{DD}_{HH}{mm}{SS}";

const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]/g;

export function sanitizeFilename(value: string): string {
  return value.replace(INVALID_FILENAME_CHARS, "_");
}

function templateValues(date: Date, dbName: string): Record<string, string> {
  return {
    "{dbname}": dbName ?? "",
    "{YYYY}": dateFormat(date, "yyyy"),
    "{YY}": dateFormat(date, "yy"),
    "{MM}": dateFormat(date, "mm"),
    "{DD}": dateFormat(date, "dd"),
    "{HH}": dateFormat(date, "HH"),
    "{mm}": dateFormat(date, "MM"),
    "{SS}": dateFormat(date, "ss"),
  };
}

export function resolveFilenameTemplate(
  template: string,
  dbName: string,
  date = new Date()
): string {
  if (!template || template.trim() === "") {
    return dateFormat(date, "yyyy-mm-dd_HHMMss");
  }

  let result = template;
  for (const [token, value] of Object.entries(templateValues(date, dbName))) {
    result = result.replaceAll(token, value);
  }

  return sanitizeFilename(result);
}
