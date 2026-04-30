output "pg_host" {
  value = aws_db_instance.pg.address
}

output "pg_port" {
  value = aws_db_instance.pg.port
}

output "pg_master_user" {
  value = aws_db_instance.pg.username
}

output "pg_master_password" {
  value     = random_password.pg_master.result
  sensitive = true
}

output "pg_iam_user" {
  value = var.db_iam_user
}

output "pg_instance_id" {
  value = aws_db_instance.pg.identifier
}

output "mysql_host" {
  value = aws_db_instance.mysql.address
}

output "mysql_port" {
  value = aws_db_instance.mysql.port
}

output "mysql_master_user" {
  value = aws_db_instance.mysql.username
}

output "mysql_master_password" {
  value     = random_password.mysql_master.result
  sensitive = true
}

output "mysql_iam_user" {
  value = var.db_iam_user
}

output "mysql_instance_id" {
  value = aws_db_instance.mysql.identifier
}
