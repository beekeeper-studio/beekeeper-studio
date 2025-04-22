---
title: Backup & Restore
summary: "Backup your whole database (or just a slice) - schemas, data, or both."
old_url: "https://docs.beekeeperstudio.io/docs/backup-restore"
icon: material/backup-restore
---

Beekeeper Studio provides an interface to native tools to easily backup and restore your databases.

## Supported Tools
- Postgres
	- `pg_dump` and `pg_restore`
- MySQL/MariaDb
	- `mysqldump` and `mysql`
- SQLite
	- `sqlite3`

## Backup or Restore a Database
Backup and Restore can both be found in the tools section of the app menu:
![The tools section of the app menu](../assets/images/backup-restore-89.png)

After selecting either Backup or Restore, you will be guided through a series of steps to generate the command for the vendor provided database tool.

The Backup tab:
1. Choose Entities
2. Configure Backup
3. Review & Execute

The Restore tab:
1. Configure Restore
2. Review & Execute

### Choose Entities
Here you can choose what you want to back up from your database. For all supported dialects, not selecting any entities will result in a full database backup.

![The first step of the backup wizard: selecting objects to backup](../assets/images/backup-restore-91.png)

### Configure Backup/Restore
This is where you will configure exactly how the native backup/restore tool will behave. We have a selection of commonly used settings that we can place for you with the click of a checkbox or a selection from a dropdown.

![The second step of the backup wizard: configuring command line flags](../assets/images/backup-restore-92.png)

### Custom Arguments
If an option you need is not supported, we also provide you with the ability to add custom flags to the command.

![The box for setting custom command line flags for backup/restore](../assets/images/backup-restore-93.png)

### Review & Execute
Finally you get to see the generated command that will be run (minus any sensitive information, which is provided in environment variables).

![The review of the command that has been generated for backup/restore.](../assets/images/backup-restore-94.png)

If you would prefer to run this command in the terminal yourself, you can copy it to your clipboard here as well! You may have to set some environment variables to allow the tool to properly connect to your database.

Otherwise, you can let us run the command for you and watch it happen in-app.

## Monitoring Backup/Restore Progress
If you choose to run the process in-app, you can monitor the command's progress as it executes from this screen:
![Command Progress screen](../assets/images/backup-restore-154.png)

We show the last 100 or so lines of the logs for you to read through as the tool does its thing, but if something goes very wrong, we also dump all of the logs to a temporary file for all your debugging needs.

