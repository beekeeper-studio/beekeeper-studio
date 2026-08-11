export default {
  name: '20260811_add_ai_shell_promo_dismissed_setting',
  async run(runner) {
    const queries = [
      `
        INSERT INTO user_setting(
          key,
          userValue,
          defaultValue,
          linuxDefault,
          macDefault,
          windowsDefault,
          valueType
        ) VALUES (
          'aiShellPromoDismissed',
          NULL,
          '',
          '',
          '',
          '',
          0
        )
      `
    ]
    for (let index = 0; index < queries.length; index++) {
      await runner.query(queries[index])
    }
  }
}
