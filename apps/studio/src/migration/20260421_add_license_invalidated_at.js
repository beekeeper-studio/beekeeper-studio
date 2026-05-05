export default {
  name: "20260421-add-license-invalidated-at",
  async run(runner) {
    await runner.query(
      `ALTER TABLE license_keys ADD COLUMN invalidatedAt datetime NULL`
    )
  }
}
