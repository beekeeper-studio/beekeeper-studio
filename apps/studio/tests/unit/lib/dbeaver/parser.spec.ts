import { parseDBeaverJSON, parseDBeaverXML } from '@/lib/dbeaver/parser'
import { ParsedConnection } from '@/lib/dbeaver/types'

const SAMPLE_JSON = {
  folders: {},
  connections: {
    'postgres-jdbc-abc123': {
      provider: 'postgresql',
      driver: 'postgres-jdbc',
      name: 'My Postgres',
      'save-password': true,
      'read-only': false,
      configuration: {
        host: 'db.example.com',
        port: '5432',
        database: 'mydb',
        url: 'jdbc:postgresql://db.example.com:5432/mydb',
        type: 'dev',
        handlers: {}
      }
    },
    'mysql-jdbc-def456': {
      provider: 'mysql',
      driver: 'mysql8',
      name: 'My MySQL',
      'save-password': false,
      'read-only': true,
      configuration: {
        host: 'mysql.example.com',
        port: '3306',
        database: 'appdb',
        url: 'jdbc:mysql://mysql.example.com:3306/appdb',
        type: 'dev',
        handlers: {}
      }
    },
    'unknown-driver-ghi789': {
      provider: 'db2',
      driver: 'db2-jdbc',
      name: 'Unsupported DB',
      'save-password': false,
      'read-only': false,
      configuration: {
        host: 'db2.example.com',
        port: '50000',
        database: 'sample',
        url: 'jdbc:db2://db2.example.com:50000/sample',
        type: 'dev',
        handlers: {}
      }
    }
  }
}

const SAMPLE_JSON_SSH = {
  folders: {},
  connections: {
    'postgres-ssh-test': {
      provider: 'postgresql',
      driver: 'postgres-jdbc',
      name: 'Postgres via SSH',
      'save-password': true,
      'read-only': false,
      configuration: {
        host: 'localhost',
        port: '5432',
        database: 'mydb',
        url: 'jdbc:postgresql://localhost:5432/mydb',
        type: 'dev',
        handlers: {
          ssh_tunnel: {
            type: 'ssh_tunnel',
            enabled: true,
            properties: {
              host: 'bastion.example.com',
              port: '22',
              user: 'sshuser',
              keyFile: '/home/user/.ssh/id_rsa'
            }
          }
        }
      }
    }
  }
}

describe('DBeaver JSON parser', () => {
  it('parses connections with correct types and fields', () => {
    const result = parseDBeaverJSON(JSON.stringify(SAMPLE_JSON))
    expect(result).toHaveLength(3)

    const pg = result.find(c => c.dbeaverId === 'postgres-jdbc-abc123')!
    expect(pg.name).toBe('My Postgres')
    expect(pg.connectionType).toBe('postgresql')
    expect(pg.host).toBe('db.example.com')
    expect(pg.port).toBe(5432)
    expect(pg.defaultDatabase).toBe('mydb')
    expect(pg.readOnlyMode).toBe(false)
    expect(pg.unsupportedDriver).toBeNull()

    const mysql = result.find(c => c.dbeaverId === 'mysql-jdbc-def456')!
    expect(mysql.connectionType).toBe('mysql')
    expect(mysql.readOnlyMode).toBe(true)

    const unsupported = result.find(c => c.dbeaverId === 'unknown-driver-ghi789')!
    expect(unsupported.connectionType).toBeNull()
    expect(unsupported.unsupportedDriver).toBe('db2')
  })

  it('parses SSH tunnel configuration', () => {
    const result = parseDBeaverJSON(JSON.stringify(SAMPLE_JSON_SSH))
    const conn = result[0]
    expect(conn.sshEnabled).toBe(true)
    expect(conn.sshHost).toBe('bastion.example.com')
    expect(conn.sshPort).toBe(22)
    expect(conn.sshUsername).toBe('sshuser')
    expect(conn.sshKeyfile).toBe('/home/user/.ssh/id_rsa')
    expect(conn.sshMode).toBe('keyfile')
  })

  it('returns empty array for invalid JSON', () => {
    expect(parseDBeaverJSON('not json')).toEqual([])
  })
})

const SAMPLE_XML = `<?xml version="1.0" encoding="UTF-8"?>
<data-sources>
  <data-source id="pg-xml-1" provider="postgresql" driver="postgres-jdbc" name="XML Postgres">
    <connection host="xmlhost.example.com" port="5432" database="xmldb" user="xmluser" type="dev"/>
  </data-source>
  <data-source id="mysql-xml-2" provider="mysql" driver="mysql8" name="XML MySQL">
    <connection host="mysqlhost.example.com" port="3306" database="mysqldb" user="root" type="dev"/>
  </data-source>
</data-sources>`

describe('DBeaver XML parser', () => {
  it('parses legacy XML connections', () => {
    const result = parseDBeaverXML(SAMPLE_XML)
    expect(result).toHaveLength(2)

    const pg = result.find(c => c.dbeaverId === 'pg-xml-1')!
    expect(pg.name).toBe('XML Postgres')
    expect(pg.connectionType).toBe('postgresql')
    expect(pg.host).toBe('xmlhost.example.com')
    expect(pg.port).toBe(5432)
    expect(pg.defaultDatabase).toBe('xmldb')
    expect(pg.username).toBe('xmluser')
  })

  it('returns empty array for invalid XML', () => {
    expect(parseDBeaverXML('not xml')).toEqual([])
  })
})
