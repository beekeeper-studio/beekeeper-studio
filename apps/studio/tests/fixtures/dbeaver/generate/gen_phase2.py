#!/usr/bin/env python3
"""Phase 2: settings the -con spec can't express. DBeaver is stopped while this runs; it re-reads and
re-serializes everything on the next start + save, so the final files are still DBeaver's own output."""
import json, os
from dbcrypt import decrypt, encrypt

from dbcon import WS
D = os.path.join(WS, 'General', '.dbeaver')
ds_path, cred_path = os.path.join(D, 'data-sources.json'), os.path.join(D, 'credentials-config.json')
ds, creds = json.load(open(ds_path)), decrypt(cred_path)
by_name = {v['name']: (k, v) for k, v in ds['connections'].items()}

def conn(name):
    return by_name[name][1]

def cid(name):
    return by_name[name][0]

# connection types / colors / flags
conn('Prod Postgres (SSH password)')['configuration']['type'] = 'prod'
conn('Prod Postgres (SSH password)')['read-only'] = True
conn('Prod Postgres (SSH password)')['description'] = 'Primary production database'
conn('Prod Postgres (SSH password)')['configuration']['bootstrap'] = {
    'defaultSchema': 'public', 'query': ['SET statement_timeout = 30000']}
conn('EU Postgres (SSH key + SSL)')['configuration']['type'] = 'prod'
conn('Postgres SSL require')['configuration']['type'] = 'test'
conn('Staging MySQL (password not saved)')['configuration']['type'] = 'qa'
conn('Redshift Warehouse')['configuration']['color'] = '128,0,255'
conn('Snowflake')['read-only'] = True
ds.setdefault('connection-types', {})['qa'] = {
    'name': 'QA', 'color': '255,200,0', 'colorDark': '255,200,0', 'description': 'QA environment',
    'auto-commit': True, 'confirm-execute': False, 'confirm-data-change': False}
ds['folders']['Production'] = {'description': 'Live systems'}
ds['folders']['Team'] = {}

# URL-mode connections (the "URL" radio in DBeaver's connection dialog)
for name in ['Postgres via URL', 'MySQL via URL', 'SQL Server via URL', 'Oracle custom URL', 'SQLite via URL']:
    conn(name)['configuration']['configurationType'] = 'URL'

# SSH jump host in front of the tunnel host
jh = conn('Postgres via jump host')['configuration']['handlers']['ssh_tunnel']['properties']
jh.update({'jumpServer.count': '1', 'jumpServer0.enabled': 'true', 'jumpServer0.host': 'jump.example.com',
           'jumpServer0.port': '2200', 'jumpServer0.name': 'jumper', 'jumpServer0.authType': 'PUBLIC_KEY',
           'jumpServer0.keyPath': '/home/me/.ssh/jump_key'})
creds[cid('Postgres via jump host')]['network/ssh_tunnel']['jumpServer0.password'] = 'jump-key-pass'

# project network profile referenced by a connection
ds['network-profiles'] = {'corp-bastion': {'name': 'corp-bastion', 'handlers': {'ssh_tunnel': {
    'type': 'TUNNEL', 'enabled': True, 'save-password': True,
    'properties': {'host': 'corp-bastion.example.com', 'port': '22', 'authType': 'PASSWORD'}}}}}
creds['profile:corp-bastion'] = {'network/ssh_tunnel/profile/corp-bastion': {'user': 'corp', 'password': 'corp-ssh-secret'}}
conn('Postgres via network profile')['configuration']['config-profile'] = 'corp-bastion'

# SOCKS proxy (not supported by Beekeeper)
conn('MySQL via SOCKS proxy')['configuration']['handlers'] = {'socks_proxy': {
    'type': 'PROXY', 'enabled': True, 'save-password': True,
    'properties': {'socks-host': 'proxy.corp.local', 'socks-port': '1080'}}}
creds[cid('MySQL via SOCKS proxy')]['network/socks_proxy'] = {'user': 'proxyuser', 'password': 'proxy-secret'}

json.dump(ds, open(ds_path, 'w'), indent='\t')
encrypt(cred_path, creds)

# secondary storage file in the same project (DBeaver loads every data-sources*.json)
team_id = 'postgres-jdbc-1a0cc4f0000-1111111111111111'
team = {'connections': {team_id: {
    'provider': 'postgresql', 'driver': 'postgres-jdbc', 'name': 'Team Shared Postgres', 'save-password': True,
    'folder': 'Team', 'configuration': {'host': 'team-db.example.com', 'port': '5432', 'database': 'team',
                                        'configurationType': 'MANUAL', 'type': 'dev'}}}}
json.dump(team, open(os.path.join(D, 'data-sources-team.json'), 'w'), indent='\t')
encrypt(os.path.join(D, 'credentials-config-team.json'), {team_id: {'#connection': {'user': 'team', 'password': 'team-secret'}}})
print('phase 2 edits applied')
