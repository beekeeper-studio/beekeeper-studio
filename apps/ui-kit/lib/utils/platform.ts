// Ref: https://stackoverflow.com/a/11752084/10012118
export const isMacLike = /(Mac|iPhone|iPod|iPad)/i.test(navigator.platform);

export function ctrlOrCmd(key: string) {
  if (isMacLike) return `meta+${key}`;
  return `ctrl+${key}`;
}

// For codemirror
export function cmCtrlOrCmd(key: string) {
  if (isMacLike) return `Cmd-${key}`;
  return `Ctrl-${key}`;
}
