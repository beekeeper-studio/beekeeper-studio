import { wait } from "@shared/lib/wait"

export async function waitFor(conditional: () => boolean) {
  while (!conditional()) {
    await wait(5)
  }
  return
}
