# Cloud database tests (Redshift, BigQuery)

`.github/workflows/cloud-db-tests.yml` runs two specs against real cloud
databases, since neither has a container for the normal integration matrix:

| Job      | Spec                                                          | Start                              | Stop                         |
| -------- | ------------------------------------------------------------- | ---------------------------------- | ---------------------------- |
| Redshift | `apps/studio/tests/vitest/integration/lib/db/clients/redshift.spec.ts` | Resume a paused cluster            | Pause it again               |
| BigQuery | `apps/studio/tests/vitest/integration/lib/db/clients/bigquery.spec.ts` | Create a dataset for the run       | Delete the dataset           |

BigQuery has no instance to start or stop; the per-run dataset is the
equivalent. Each spec creates its own tables and drops them afterwards.

The workflow runs on pull requests and master pushes that touch either client,
every Monday, and on demand (Actions → Cloud database integration tests → Run
workflow). Each job is skipped until its repository variable is set, and on
pull requests from forks, which get no credentials.

Both clouds are reached with GitHub OIDC tokens, so no long-lived AWS or GCP
keys are stored in GitHub. The only stored secret is the Redshift password.

## 1. GitHub environment

Create an environment named `cloud-db-tests` (Settings → Environments). Both
jobs run in it, so the OIDC subject claim both clouds trust is:

```
repo:beekeeper-studio/beekeeper-studio:environment:cloud-db-tests
```

- Leave deployment branches unrestricted, or pull request runs can't use it.
- Don't add required reviewers unless every run should wait for approval.

## 2. Redshift

### Cluster

Create a provisioned cluster used only by CI (Serverless can't be paused):

- Single node, smallest node type available (e.g. `ra3.large`).
- Publicly accessible, so GitHub-hosted runners can reach it.
- Database `dev` (or set `REDSHIFT_DATABASE`).
- Security group: no inbound rule for port 5439 is needed. When
  `REDSHIFT_SECURITY_GROUP_ID` is set, the job adds the runner's IP for the run
  and removes it afterwards. Without it, the group must already allow the
  runners, e.g. `0.0.0.0/0` on 5439.
- Pause it once created. A paused cluster costs only its backup storage.

Create a user for the tests; it needs to create and drop schemas:

```sql
CREATE USER bks_ci PASSWORD '<password>';
GRANT CREATE ON DATABASE dev TO bks_ci;
```

Recommended safety net: a scheduled action that pauses the cluster nightly
(Redshift console → cluster → Actions → Schedule pause and resume), in case a
run dies before its pause step.

### IAM role

Add GitHub as an OIDC identity provider in IAM, if the account doesn't have it
yet: provider URL `https://token.actions.githubusercontent.com`, audience
`sts.amazonaws.com`.

Create a role with this trust policy:

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "Federated": "arn:aws:iam::<account-id>:oidc-provider/token.actions.githubusercontent.com" },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:beekeeper-studio/beekeeper-studio:environment:cloud-db-tests"
      }
    }
  }]
}
```

and this permission policy (drop the second statement if the security group
isn't managed by the workflow). Set the role's maximum session duration to at
least 1.5 hours; the job asks for 90 minutes.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["redshift:DescribeClusters", "redshift:ResumeCluster", "redshift:PauseCluster"],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": ["ec2:AuthorizeSecurityGroupIngress", "ec2:RevokeSecurityGroupIngress"],
      "Resource": "arn:aws:ec2:<region>:<account-id>:security-group/<sg-id>"
    }
  ]
}
```

`DescribeClusters` needs `"Resource": "*"`. To restrict resume and pause to the
CI cluster, put them in a separate statement with the cluster ARN
`arn:aws:redshift:<region>:<account-id>:cluster:<cluster-id>`.

## 3. BigQuery

In a GCP project used for CI:

1. Enable the BigQuery API.
2. Create a service account, e.g. `bks-ci-bigquery`, and grant it
   `roles/bigquery.user` on the project. That allows creating datasets and
   running query jobs; the creator of a dataset owns it, so the job can also
   delete it.
3. Create a workload identity pool and an OIDC provider for GitHub:

   ```sh
   gcloud iam workload-identity-pools create github --location=global
   gcloud iam workload-identity-pools providers create-oidc beekeeper-studio \
     --location=global --workload-identity-pool=github \
     --issuer-uri=https://token.actions.githubusercontent.com \
     --attribute-mapping=google.subject=assertion.sub,attribute.repository=assertion.repository \
     --attribute-condition="assertion.sub == 'repo:beekeeper-studio/beekeeper-studio:environment:cloud-db-tests'"
   ```

4. Let the GitHub identity impersonate the service account:

   ```sh
   gcloud iam service-accounts add-iam-policy-binding \
     bks-ci-bigquery@<project-id>.iam.gserviceaccount.com \
     --role=roles/iam.workloadIdentityUser \
     --member="principal://iam.googleapis.com/projects/<project-number>/locations/global/workloadIdentityPools/github/subject/repo:beekeeper-studio/beekeeper-studio:environment:cloud-db-tests"
   ```

Datasets are named `bks_ci_<run id>_<attempt>`. Their tables expire after a
day, in case a run dies before the delete step; the empty dataset left behind
costs nothing and can be removed with `bq rm -r -f -d <project>:<dataset>`.

## 4. Variables and secrets

Add these as **repository** variables (Settings → Secrets and variables →
Actions → Variables). They must be repository-level, not environment-level:
the jobs check them to decide whether to run, before the environment is
loaded.

| Variable                         | Example                                                                                   | Required |
| -------------------------------- | ----------------------------------------------------------------------------------------- | -------- |
| `AWS_REGION`                     | `us-east-1`                                                                               | Redshift |
| `AWS_ROLE_ARN`                   | `arn:aws:iam::123456789012:role/bks-ci-redshift`                                          | Redshift |
| `REDSHIFT_CLUSTER_IDENTIFIER`    | `bks-ci`                                                                                  | Redshift; enables the job |
| `REDSHIFT_USER`                  | `bks_ci`                                                                                  | Redshift |
| `REDSHIFT_DATABASE`              | `dev` (default)                                                                           | No       |
| `REDSHIFT_SECURITY_GROUP_ID`     | `sg-0123456789abcdef0`                                                                    | No       |
| `BIGQUERY_PROJECT_ID`            | `bks-ci`                                                                                  | BigQuery; enables the job |
| `BIGQUERY_LOCATION`              | `US` (default)                                                                            | No       |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/123456789/locations/global/workloadIdentityPools/github/providers/beekeeper-studio` | BigQuery |
| `GCP_SERVICE_ACCOUNT`            | `bks-ci-bigquery@bks-ci.iam.gserviceaccount.com`                                          | BigQuery |

Add this secret to the `cloud-db-tests` environment:

| Secret              | Value                          |
| ------------------- | ------------------------------ |
| `REDSHIFT_PASSWORD` | Password of `REDSHIFT_USER`    |

## Running the specs locally

Both specs skip themselves unless their variables are set. From `apps/studio`:

```sh
# Redshift (cluster must be available and reachable)
REDSHIFT_HOST=<endpoint> REDSHIFT_USER=bks_ci REDSHIFT_PASSWORD=... \
  yarn vitest:integration tests/vitest/integration/lib/db/clients/redshift.spec.ts

# BigQuery (uses Application Default Credentials, or BIGQUERY_KEY_FILE)
BIGQUERY_PROJECT_ID=<project> BIGQUERY_DATASET=<existing dataset> \
  yarn vitest:integration tests/vitest/integration/lib/db/clients/bigquery.spec.ts
```

`dev/cloud_db_tests/redshift-cluster.sh resume|pause` resumes or pauses the
cluster with your own AWS credentials (`REDSHIFT_CLUSTER_IDENTIFIER` must be
set). When running the workflow by hand, `keep_redshift_running` leaves the
cluster up afterwards for debugging; pause it when done.
