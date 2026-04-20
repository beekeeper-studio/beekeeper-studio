expect.extend({
  async resolvesWithin(received, ms) {
    const error = new Error(`Expected promise to resolve within ${ms}ms`);
    error.stack = error.stack
      ?.split("\n")
      .filter((line) => !line.includes("resolvesWithin"))
      .join("\n");

    try {
      await Promise.race([
        received,
        new Promise((_, reject) => setTimeout(() => reject(error), ms)),
      ]);
      return {
        pass: true,
        message: () => `Expected promise not to resolve within ${ms}ms`,
      };
    } catch (e) {
      if (e === error) {
        return { pass: false, message: () => error.message };
      }
      throw e;
    }
  },
});
