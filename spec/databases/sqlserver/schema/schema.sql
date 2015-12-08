IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'users' AND type = 'U')
BEGIN
CREATE TABLE dbo.users
   (id int PRIMARY KEY IDENTITY(1,1) NOT NULL,
    username varchar(45) NULL,
    email varchar(150) NULL,
    password varchar(45) NULL)
END

IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = N'roles' AND type = 'U')
BEGIN
CREATE TABLE dbo.roles
   (id int PRIMARY KEY IDENTITY(1,1) NOT NULL,
    name varchar(100) NULL)
END
