export default {
  name: '20220307-default-theme-system',
  async run(runner) {
    const queries = [
      `UPDATE user_setting SET macDefault='system', windowsDefault='system', linuxDefault='system' WHERE key='theme'`
    ]
    for (let i = 0; i < queries.length; i++) {
      const query = queries[i];
      await runner.query(query)
    }
  }
}