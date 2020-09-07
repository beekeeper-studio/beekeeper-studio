import { SavedConnection } from "../common/appdb/models/saved_connection";
import { TableColumn } from 'typeorm';

export default {
  name: "20200907-add_encrypted-columns",
  async run(runner) {
    try {
      const temp_columns = [
        new TableColumn({
          name: 'password_decrypted',
          type: 'varchar',
          isNullable: true
        }),
        new TableColumn({
          name: 'sshKeyfilePassword_decrypted',
          type: 'varchar',
          isNullable: true
        }),
        new TableColumn({
          name: 'sshPassword_decrypted',
          type: 'varchar',
          isNullable: true
        }),
      ]

      await runner.startTransaction()
      await runner.addColumns('saved_connection', temp_columns)
      await runner.query('UPDATE saved_connection SET password_decrypted = password, sshKeyfilePassword_decrypted = sshKeyfilePassword, sshPassword_decrypted = sshPassword;')
      await runner.query('UPDATE saved_connection SET password = NULL, sshKeyfilePassword = NULL, sshPassword = NULL;')

      const connections = await runner.query('SELECT * from saved_connection;')

      const entities = await SavedConnection.find();
      entities.forEach(e => {
        e.password = connections.find(c => c.id == e.id).password_decrypted
        e.sshKeyfilePassword = connections.find(c => c.id == e.id).sshKeyfilePassword_decrypted
        e.sshPassword = connections.find(c => c.id == e.id).sshPassword_decrypted
      });
      SavedConnection.save(entities);

      await runner.dropColumns('saved_connection', temp_columns)
      await runner.commitTransaction()
    } catch (e) {
      await runner.rollbackTransaction()
      throw e;
    }
  }
}
