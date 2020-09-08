import { SavedConnection } from "../common/appdb/models/saved_connection";
import { TableColumn } from 'typeorm';

export default {
  name: "20200907-add_encrypted-columns",
  async run(runner) {
    try {
      await runner.startTransaction()
      const original_connections = await runner.query('SELECT * from saved_connection;')
      await runner.query('UPDATE saved_connection SET password = NULL, sshKeyfilePassword = NULL, sshPassword = NULL;')

      const entities = await SavedConnection.find();
      entities.forEach(e => {
        e.password = original_connections.find(c => c.id == e.id).password
        e.sshKeyfilePassword = original_connections.find(c => c.id == e.id).sshKeyfilePassword
        e.sshPassword = original_connections.find(c => c.id == e.id).sshPassword
      });

      SavedConnection.save(entities);

      await runner.commitTransaction()
    } catch (e) {
      await runner.rollbackTransaction()
      throw e;
    }
  }
}
