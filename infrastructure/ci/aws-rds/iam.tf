# IAM policy giving the test user permission to generate db-auth tokens for
# the two per-run RDS instances. The policy is scoped to the specific
# DbiResourceId values so a leaked key cannot pivot to other RDS instances
# in the account.

data "aws_iam_user" "test_user" {
  user_name = var.iam_test_user
}

data "aws_iam_policy_document" "rds_connect" {
  statement {
    sid       = "RDSDBConnect"
    effect    = "Allow"
    actions   = ["rds-db:connect"]
    resources = [
      "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.pg.resource_id}/${var.db_iam_user}",
      "arn:aws:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser:${aws_db_instance.mysql.resource_id}/${var.db_iam_user}",
    ]
  }
}

resource "aws_iam_policy" "rds_connect" {
  name        = "bks-ci-rds-connect-${var.run_id}"
  description = "Allows ${var.iam_test_user} to IAM-auth to the CI RDS instances for run ${var.run_id}"
  policy      = data.aws_iam_policy_document.rds_connect.json
}

resource "aws_iam_user_policy_attachment" "rds_connect" {
  user       = data.aws_iam_user.test_user.user_name
  policy_arn = aws_iam_policy.rds_connect.arn
}
