function handleInterrupt(controller: AbortController): void {
  if (controller.signal.aborted) {
    process.exit(130);
  }
  process.stderr.write("Cancelling... (press Ctrl+C again to quit)\n");
  controller.abort();
}

/**
 * - 1st Ctrl+C = Aborts gracefully
 * - 2nd Ctrl+C = Exits immediately
 */
export function abortOnInterrupt(): AbortSignal {
  const controller = new AbortController();
  process.on("SIGINT", handleInterrupt.bind(null, controller));
  return controller.signal;
}
