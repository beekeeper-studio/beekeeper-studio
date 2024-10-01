import Connection from "@/common/appdb/Connection";


export const TestOrmConnection = {
  connection: new Connection(':memory:'),

  async connect() {
    await this.connection.connect({ synchronize: true })
  },

  async disconnect() {
    await this.connection.disconnect()
  }

}
