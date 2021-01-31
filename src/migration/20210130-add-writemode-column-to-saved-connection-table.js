export default {
    name: '20210130-add-writemode-column-to-saved-connection-table',
    async run(runner) {
      await runner.query('ALTER TABLE saved_connection ADD COLUMN writeMode varchar default "enabled"')
    }
  }