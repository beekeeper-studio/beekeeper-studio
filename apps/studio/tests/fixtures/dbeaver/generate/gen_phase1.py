#!/usr/bin/env python3
"""Phase 1: create connections through DBeaver's own -con spec parser (via the instance REST API)."""
import time
from dbcon import call

COMMON = 'save=true|connect=false'

specs = [
    # --- PostgreSQL family -------------------------------------------------
    # (Local Postgres already created in the smoke test)
    'driver=postgresql:postgres-jdbc|name=Prod Postgres (SSH password)|host=db.internal|port=5432|database=app|user=app|password=app-secret|folder=Production'
    '|netHandler.ssh.host=bastion.example.com|netHandler.ssh.port=22|netHandler.ssh.user=deploy|netHandler.ssh.password=ssh-secret|netHandler.ssh.authType=PASSWORD',
    'driver=postgresql:postgres-jdbc|name=EU Postgres (SSH key + SSL)|host=eu-db.internal|port=6543|database=eu_app|user=eu_app|password=eu-secret|folder=Production/EU'
    '|netHandler.ssh.host=eu-bastion.example.com|netHandler.ssh.port=2222|netHandler.ssh.user=ubuntu|netHandler.ssh.password=key-passphrase|netHandler.ssh.authType=PUBLIC_KEY|netHandler.ssh.keyPath=/home/me/.ssh/id_ed25519|netHandler.ssh.aliveInterval=30000'
    '|netHandler.ssl.method=CERTIFICATES|netHandler.ssl.sslMode=verify-full|netHandler.ssl.ca.cert=/certs/eu/ca.pem|netHandler.ssl.client.cert=/certs/eu/client.crt|netHandler.ssl.client.key=/certs/eu/client.key',
    'driver=postgresql:postgres-jdbc|name=Postgres SSL require|host=ssl-db.example.com|port=5432|database=secure|user=ssl_user|password=ssl-secret|folder=Development'
    '|netHandler.ssl.sslMode=require',
    'driver=postgresql:postgres-jdbc|name=Postgres pgpass|host=pgpass.local|port=5432|database=pgpass_db|user=pgpass_user|auth=postgres_pgpass|savePassword=false',
    'driver=postgresql:postgres-redshift-jdbc|name=Redshift Warehouse|host=my-cluster.abc123.us-east-1.redshift.amazonaws.com|port=5439|database=dev|user=awsuser|password=redshift-secret|folder=Analytics',
    'driver=postgresql:postgres-cockroach-jdbc|name=CockroachDB|host=crdb.local|port=26257|database=defaultdb|user=root|password=crdb-secret',
    'driver=greengage:greengage-jdbc|name=Greengage|host=gg.local|port=5432|database=gg|user=gpadmin|password=gg-secret',
    'driver=postgresql:postgres-timescale-jdbc|name=TimescaleDB|host=tsdb.local|port=5432|database=metrics|user=tsdb|password=tsdb-secret',
    # --- MySQL family ------------------------------------------------------
    'driver=mysql:mysql8|name=MySQL Shop|host=mysql.local|port=3306|database=shop|user=root|password=mysql-secret|folder=Development'
    '|netHandler.ssl.require=true|netHandler.ssl.verify.server=false|netHandler.ssl.ca.cert=/certs/mysql/ca.pem',
    'driver=mysql:mariaDB|name=MariaDB Blog (SSH agent)|host=maria.local|port=3307|database=blog|user=maria|password=maria-secret'
    '|netHandler.ssh.host=jump.example.com|netHandler.ssh.user=tunnel|netHandler.ssh.authType=AGENT',
    'driver=mysql:mysql8|name=Staging MySQL (password not saved)|host=staging-mysql.local|port=3306|database=staging|user=stage|savePassword=false|folder=Development',
    'driver=tidb:tidb|name=TiDB|host=tidb.local|port=4000|database=test|user=root|password=tidb-secret',
    'driver=starrocks:starrocks|name=StarRocks|host=sr.local|port=9030|database=sr_db|user=root|password=sr-secret|folder=Analytics',
    # --- SQL Server --------------------------------------------------------
    'driver=sqlserver:microsoft|name=SQL Server|host=mssql.local|port=1433|database=master|user=sa|password=Mssql-Secret1|advProp.sslTrustServerCertificate=true',
    'driver=sqlserver:microsoft|name=SQL Server (Windows auth)|host=winsql.corp.local|port=1433|database=Sales|auth=sqlserver_windows',
    'driver=sqlserver:microsoft|name=SQL Server (NTLM)|host=ntlm-sql.corp.local|port=1433|database=HR|user=jdoe@CORP|password=ntlm-secret|auth=sqlserver_ntlm',
    'driver=sqlserver:microsoft|name=Azure SQL (AD password)|host=myserver.database.windows.net|port=1433|database=appdb|user=admin@contoso.com|password=azure-secret|auth=sqlserver_ad_password',
    # --- Oracle ------------------------------------------------------------
    'driver=oracle:oracle_thin|name=Oracle Service Name|host=ora.local|port=1521|database=ORCLPDB1|user=scott|password=tiger|advProp.@dbeaver-sid-service@=SERVICE',
    'driver=oracle:oracle_thin|name=Oracle SID|host=ora-sid.local|port=1521|database=XE|user=system|password=oracle-secret|advProp.@dbeaver-sid-service@=SID',
    'driver=oracle:oracle_thin|name=Oracle TNS|database=PRODDB|user=app_ro|password=tns-secret|advProp.@dbeaver-connection-type@=TNS|advProp.@dbeaver-tns-path@=/opt/oracle/network/admin',
    # --- File based --------------------------------------------------------
    'driver=sqlite:sqlite_jdbc|name=SQLite App DB|database=/data/app.sqlite3',
    'driver=duckdb:duckdb_jdbc|name=DuckDB Analytics|database=/data/analytics.duckdb|folder=Analytics',
    'driver=sqlite:libsql_jdbc|name=Turso LibSQL|server=libsql://my-db-acme.turso.io|password=libsql-token|auth=libsql_token_jdbc',
    # --- Other supported ---------------------------------------------------
    'driver=jaybird:jaybird|name=Firebird Employee|host=fb.local|port=3050|database=/var/lib/firebird/data/employee.fdb|user=SYSDBA|password=masterkey',
    'driver=clickhouse:com_clickhouse|name=ClickHouse Events|host=ch.local|port=8123|database=events|user=default|password=ch-secret|folder=Analytics',
    'driver=snowflake:snowflake_jdbc|name=Snowflake|host=acme-xy12345.snowflakecomputing.com|port=443|database=ANALYTICS|server=COMPUTE_WH|user=SNOWUSER|password=snow-secret|advProp.@dbeaver-schema@=PUBLIC|folder=Analytics',
    'driver=bigquery:google_bigquery_jdbc|name=BigQuery|host=https://www.googleapis.com/bigquery/v2|port=443|database=my-gcp-project|user=svc@my-gcp-project.iam.gserviceaccount.com|prop.OAuthType=0|prop.OAuthPvtKeyPath=/keys/bigquery.json|folder=Analytics',
    'driver=generic:trino_jdbc|name=Trino|host=trino.local|port=8080|database=hive|user=analyst|password=trino-secret',
    # --- Unsupported in Beekeeper -----------------------------------------
    'driver=db2:db2|name=DB2 Legacy|host=db2.local|port=50000|database=SAMPLE|user=db2inst1|password=db2-secret',
    'driver=h2:h2_embedded_v3|name=H2 Embedded|database=/data/h2/test',
]

for spec in specs:
    status, body = call('openConnection', {'spec': f'{spec}|{COMMON}'})
    print(status, spec.split('|')[1])
    time.sleep(0.3)
