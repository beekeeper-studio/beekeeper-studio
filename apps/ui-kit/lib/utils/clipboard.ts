export async function writeClipboard(selection: string) {
  // FIXME may need permission
  await navigator.clipboard.writeText(selection);
}

export async function readClipboard() {
  // FIXME may need permission
  return await navigator.clipboard.readText();
}
