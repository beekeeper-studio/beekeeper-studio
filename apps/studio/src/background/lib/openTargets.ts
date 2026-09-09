interface ParsedCommandLine {
  _: unknown[]
  url?: unknown
  u?: unknown
}

function stringValues(value: unknown): string[] {
  const values = Array.isArray(value) ? value : [value]
  return values.filter((item): item is string => typeof item === 'string' && item.length > 0)
}

export function openTargetsFromParsedArgs(args: ParsedCommandLine): string[] {
  return [
    ...stringValues(args._),
    ...stringValues(args.url),
    ...stringValues(args.u),
  ]
}
