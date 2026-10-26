-- Map the Samba/AD Kerberos principal to a SQL Server login. SQL Server on Linux
-- recognizes domain principals with the NetBIOS-qualified form DOMAIN\user.
-- sysadmin so the integration test can query DMVs and list databases.
IF NOT EXISTS (SELECT 1 FROM sys.server_principals WHERE name = N'BKS\testuser')
BEGIN
    CREATE LOGIN [BKS\testuser] FROM WINDOWS;
END
GO
ALTER SERVER ROLE [sysadmin] ADD MEMBER [BKS\testuser];
GO
