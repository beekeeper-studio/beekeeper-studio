import { createConnection, Connection } from 'mysql2/promise'

const config = {
  host: 'localhost',
  user: 'root',
  password: 'password',
  port: 3306,
  database: 'meubanco'
}

describe('MySQL User Management Backend (Direct)', () => {
  let connection: Connection;

  beforeAll(async () => {
    connection = await createConnection(config);
    await connection.query(`DROP DATABASE IF EXISTS test_priv_schema`);
    await connection.query(`CREATE DATABASE test_priv_schema`);
    await connection.query(`DROP USER IF EXISTS 'test_priv_user'@'%'`);
    await connection.query(`DROP USER IF EXISTS 'test_priv_user_renamed'@'%'`);
    await connection.query(`DROP USER IF EXISTS 'test_priv_user'@'localhost'`);
  });

  afterAll(async () => {
    await connection.query(`DROP USER IF EXISTS 'test_priv_user'@'%'`);
    await connection.query(`DROP USER IF EXISTS 'test_priv_user_renamed'@'%'`);
    await connection.query(`DROP USER IF EXISTS 'test_priv_user'@'localhost'`);
    await connection.query(`DROP DATABASE IF EXISTS test_priv_schema`);
    await connection.end();
  });

  it('should create a user', async () => {
    await connection.query(`CREATE USER 'test_priv_user'@'%' IDENTIFIED BY 'abc123'`);
    const [rows] = await connection.query(`SELECT User, Host FROM mysql.user WHERE User='test_priv_user'`);
    expect((rows as any[]).length).toBeGreaterThan(0);
  });

  it('should list users', async () => {
    const [rows] = await connection.query(`SELECT User, Host FROM mysql.user`);
    expect(Array.isArray(rows)).toBeTruthy();
    expect(Array.isArray(rows) && rows.some((u: any) => u.User === 'test_priv_user')).toBeTruthy();
  });

  it('should get user authentication details', async () => {
    const [rows] = await connection.query(
      `SELECT plugin AS Authentication_Type, authentication_string FROM mysql.user WHERE User='test_priv_user' AND Host='%'`
    );
    expect(rows[0]).toHaveProperty('Authentication_Type');
  });

  it('should get user resource limits', async () => {
    const [rows] = await connection.query(
      `SELECT max_questions, max_updates, max_connections, max_user_connections FROM mysql.user WHERE User='test_priv_user' AND Host='%'`
    );
    expect(rows[0]).toHaveProperty('max_questions');
    expect(rows[0]).toHaveProperty('max_updates');
    expect(rows[0]).toHaveProperty('max_connections');
    expect(rows[0]).toHaveProperty('max_user_connections');
  });

  it('should get user privileges via getUserPrivileges', async () => {
    const [rows] = await connection.query(
      `SELECT Super_priv, Create_priv, Drop_priv, Grant_priv, Insert_priv, Update_priv, Delete_priv FROM mysql.user WHERE User='test_priv_user' AND Host='%'`
    );
    expect(rows[0]).toHaveProperty('Super_priv');
  });

  it('should show grants for user', async () => {
    const [rows]: any = await connection.query(
      `SHOW GRANTS FOR 'test_priv_user'@'%'`
    );
    expect(Array.isArray(rows)).toBeTruthy();
  });

  it('should set and update password', async () => {
    await connection.query(
      `ALTER USER 'test_priv_user'@'%' IDENTIFIED BY 'def456'`
    );
    const [rows] = await connection.query(
      `SELECT User, Host, authentication_string FROM mysql.user WHERE User='test_priv_user'`
    );
    expect(rows[0].authentication_string).not.toBeNull();
  });

  it('should change host', async () => {
    await connection.query(
      `RENAME USER 'test_priv_user'@'%' TO 'test_priv_user'@'localhost'`
    );
    const [rows] = await connection.query(`SELECT User, Host FROM mysql.user WHERE User='test_priv_user'`);
    expect(rows[0].Host).toBe('localhost');
  });

  it('should rename user', async () => {
    await connection.query(
      `RENAME USER 'test_priv_user'@'localhost' TO 'test_priv_user_renamed'@'localhost'`
    );
    const [rows] = await connection.query(`SELECT User, Host FROM mysql.user WHERE User='test_priv_user_renamed'`);
    expect(rows[0].User).toBe('test_priv_user_renamed');
  });

  it('should set limits', async () => {
    await connection.query(
      `CREATE USER 'test_priv_user'@'%' WITH MAX_QUERIES_PER_HOUR 10 MAX_UPDATES_PER_HOUR 20 MAX_CONNECTIONS_PER_HOUR 30 MAX_USER_CONNECTIONS 40`
    );
    const [rows] = await connection.query(
      `SELECT * FROM mysql.user WHERE User='test_priv_user'`
    );
    expect(rows[0].max_questions).toBe(10);
    expect(rows[0].max_updates).toBe(20);
    expect(rows[0].max_connections).toBe(30);
    expect(rows[0].max_user_connections).toBe(40);
  });

  it('should grant privileges on schema', async () => {
    await connection.query(
      `GRANT SELECT, INSERT ON test_priv_schema.* TO 'test_priv_user_renamed'@'localhost'`
    );
    const [rows]: any = await connection.query(
      `SHOW GRANTS FOR 'test_priv_user_renamed'@'localhost'`
    );
    expect(
      Array.isArray(rows) &&
      rows.some((row: any) => String(Object.values(row)[0]).includes('SELECT'))
    ).toBeTruthy();
    expect(
      Array.isArray(rows) &&
      rows.some((row: any) => String(Object.values(row)[0]).includes('INSERT'))
    ).toBeTruthy();
  });

  it('should revoke all privileges', async () => {
    await connection.query(
      `REVOKE ALL PRIVILEGES, GRANT OPTION FROM 'test_priv_user_renamed'@'localhost'`
    );
    const [rows]: any = await connection.query(
      `SHOW GRANTS FOR 'test_priv_user_renamed'@'localhost'`
    );
    expect(
      Array.isArray(rows) &&
      rows.every((row: any) =>
        String(Object.values(row)[0]).startsWith('GRANT USAGE')
      )
    ).toBeTruthy();
  });

  it('should expire password', async () => {
    await connection.query(
      `ALTER USER 'test_priv_user_renamed'@'localhost' PASSWORD EXPIRE`
    );
    const [rows] = await connection.query(
      `SELECT password_expired FROM mysql.user WHERE User = 'test_priv_user_renamed' AND Host = 'localhost'`
    );
    expect(rows[0].password_expired === 'Y' || rows[0].password_expired === 1).toBeTruthy();
  });

  it('should delete a user', async () => {
    await connection.query(
      `DROP USER 'test_priv_user_renamed'@'localhost'`
    );
    const [rows] = await connection.query(`SELECT User, Host FROM mysql.user WHERE User='test_priv_user_renamed'`);
    expect((rows as any[]).length).toBe(0);
  });
});
