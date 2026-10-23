# Required environment variable names

| Variable | What it is required for |
| --- | --- |
| `AWS_ACCESS_KEY_ID` | AWS access key used by the local ZIP uploader. |
| `AWS_SECRET_ACCESS_KEY` | Secret key paired with `AWS_ACCESS_KEY_ID` for the local ZIP uploader. |
| `AWS_REGION` | AWS region used by the S3, ECS, and CloudWatch Logs clients. |
| `AWS_BUCKET_NAME` | S3 bucket name passed to the Fargate container for load-test artifacts. |
| `METADATA_BUCKET` | S3 bucket where the runner stores test execution metadata. |
| `ECS_CLUSTER` | ECS cluster in which the Fargate task is launched and monitored. |
| `TASK_DEFINITION` | ECS task definition (including revision) used to start the Fargate task. |
| `SUBNET_ID` | VPC subnet where the Fargate task runs. |
| `SECURITY_GROUP_ID` | VPC security group attached to the Fargate task. |
| `LOADTEST_PROJECT_ZIP` | Name of the project ZIP archive bundled and supplied to the Fargate runner. |
| `RUNNER_FILE_NAME` | Runner script filename the Fargate container executes. |
| `CONTAINER_NAME` | Container name in the ECS task definition, used for overrides and exit-status checks. |

Set these names in the local `.env` file with values for your AWS account and deployment. Do not commit `.env` or put credential values in this document.
