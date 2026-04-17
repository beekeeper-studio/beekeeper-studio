export default {
  name: '20251003_add_tab_dropdown_ai_shell_hint_shown_setting',
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
          'tabDropdownAIShellHintShown',
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
