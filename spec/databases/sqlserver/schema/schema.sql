IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'users' AND type = 'U')
BEGIN
CREATE TABLE dbo.users
   (id int PRIMARY KEY IDENTITY(1,1) NOT NULL,
    username varchar(45) NULL,
    email varchar(150) NULL,
    password varchar(45) NULL)
END;

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'roles' AND type = 'U')
BEGIN
CREATE TABLE dbo.roles
   (id int PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name varchar(100) NULL)
END;

IF OBJECT_ID('dbo.email_view', 'V') IS NOT NULL
  DROP VIEW dbo.email_view
GO

CREATE VIEW dbo.email_view AS
SELECT dbo.users.email, dbo.users.password
FROM dbo.users;

IF OBJECT_ID('dbo.users_count', 'P') IS NOT NULL
  DROP PROCEDURE dbo.users_count
GO

CREATE PROCEDURE dbo.users_count
(
  @Count int OUTPUT
)
AS
  BEGIN
    SELECT @Count = COUNT(*) FROM dbo.users
  END
