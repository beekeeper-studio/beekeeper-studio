export default {
  name: '20251008_add_onboarding_noty_shown_setting',
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
          'onboardingNotyShown',
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
