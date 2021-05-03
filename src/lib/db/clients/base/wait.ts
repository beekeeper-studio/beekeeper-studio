
const wait = (time: number) => new Promise((resolve) => setTimeout(resolve, time));

export async function waitFor(conditional: () => boolean) {
  while (!conditional()) {
    await wait(5)
  }
  return
}
