#!/usr/bin/env python3
"""Phase 1b: base connections that phase 2 will extend with settings -con can't express."""
import time
from dbcon import call

COMMON = 'save=true|connect=false'
specs = [
    'driver=postgresql:postgres-jdbc|name=Postgres via URL|url=jdbc:postgresql://url-host.example.com:5433/urldb?sslmode=require&ApplicationName=bks|user=url_user|password=url-secret',
    'driver=mysql:mysql8|name=MySQL via URL|url=jdbc:mysql://mysql-url.example.com:3310/urldb?useSSL=true|user=url_mysql|password=url-mysql-secret',
    'driver=sqlserver:microsoft|name=SQL Server via URL|url=jdbc:sqlserver://sqlurl.example.com:1444;databaseName=UrlDb;encrypt=true;trustServerCertificate=true|user=url_sa|password=Url-Secret1',
    'driver=oracle:oracle_thin|name=Oracle custom URL|url=jdbc:oracle:thin:@//ora-url.example.com:1522/URLPDB|user=url_ora|password=url-ora-secret|advProp.@dbeaver-connection-type@=CUSTOM',
    'driver=sqlite:sqlite_jdbc|name=SQLite via URL|url=jdbc:sqlite:/data/from-url.db',
    'driver=postgresql:postgres-jdbc|name=Postgres via jump host|host=inner-db.internal|port=5432|database=inner|user=inner_app|password=inner-secret|folder=Production'
    '|netHandler.ssh.host=inner-ssh.internal|netHandler.ssh.port=22|netHandler.ssh.user=inner|netHandler.ssh.password=inner-ssh-secret|netHandler.ssh.authType=PASSWORD',
    'driver=postgresql:postgres-jdbc|name=Postgres via network profile|host=profiled-db.internal|port=5432|database=profiled|user=profiled|password=profiled-secret',
    'driver=mysql:mysql8|name=MySQL via SOCKS proxy|host=proxied-mysql.internal|port=3306|database=proxied|user=proxied|password=proxied-secret',
]
for spec in specs:
    status, _ = call('openConnection', {'spec': f'{spec}|{COMMON}'})
    print(status, spec.split('|')[1])
    time.sleep(0.3)
