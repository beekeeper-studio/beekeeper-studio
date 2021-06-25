import { SavedConnection } from "../common/appdb/models/saved_connection";

export default {
  name: "20200917-encrypt-passwords",
  async run(runner) {
    try {
      await runner.startTransaction()
      const original_connections = await runner.query('SELECT * from saved_connection;')
      await runner.query('UPDATE saved_connection SET password = NULL, sshKeyfilePassword = NULL, sshPassword = NULL;')

      const entities = await SavedConnection.find();
      entities.forEach(e => {
        const match = original_connections.find(c => c.id === e.id)
        if (match) {
          e.password = match.password
          e.sshKeyfilePassword = match.sshKeyfilePassword
          e.sshPassword = match.sshPassword
        }
      });
      await SavedConnection.save(entities);

      await runner.commitTransaction()
    } catch (e) {
      await runner.rollbackTransaction()
      throw e;
    }
  }
}