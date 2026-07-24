export default {
  name: '20260724_add_data_type_colors',
  async run(runner) {
    await runner.query(`
      INSERT OR IGNORE INTO user_setting (key, defaultValue, valueType) VALUES
        ('dataTypeColors', '{"enabled":true,"light":{"text":"#15803D","number":"#1D4ED8","dateTime":"#7E22CE","boolean":"#C2410C","binary":"#BE123C","other":"#475569"},"dark":{"text":"#86EFAC","number":"#93C5FD","dateTime":"#D8B4FE","boolean":"#FDBA74","binary":"#FDA4AF","other":"#CBD5E1"}}', 3)
    `)
  }
}
