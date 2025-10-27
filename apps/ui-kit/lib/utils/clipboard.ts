let clipboard: Clipboard | null = null;

export async function writeClipboard(selection: string) {
  if (clipboard) {
    await clipboard.writeText(selection);
  } else {
    // FIXME may need permission
    await navigator.clipboard.writeText(selection);
  }
}

export async function readClipboard() {
  if (clipboard) {
    return await clipboard.readText();
  } else {
    // FIXME may need permission
    return await navigator.clipboard.readText();
  }
}

export function setClipboard(c: Clipboard) {
  clipboard = c;
}
