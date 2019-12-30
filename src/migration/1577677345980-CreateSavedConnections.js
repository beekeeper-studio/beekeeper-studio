import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateSavedConnections1577677345980 extends MigrationInterface {

    async up(queryRunner) {
      await queryRunner.createTable(new Table({
        name: "saved_connections",
        columns: [
          { name: 'id', type: 'int', isPrimary: true },
          { name: 'connectionType', type: 'varchar' },
          { name: 'host', type: 'varchar' },
          { name: 'port', type: 'int' },
          { name: 'user', type: 'varchar' },
          { name: 'password', type: 'varchar' },
          { name: 'defaultDatabase', type: 'varchar' }
        ]
      }))
    }

    async down(queryRunner) {
      await queryRunner.dropTable("saved_connections")
    }

}
