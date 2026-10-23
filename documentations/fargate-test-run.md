# Running a load test on Fargate

## Where the test is defined

The Fargate CLI reads the configuration exported by [`artillery.js`](../artillery.js). In that file:

- `config.processor` points to `ShpFLoorFunction/shopfloorTranaction.js`, where the browser-flow functions are implemented.
- `config.payload.path` points to `user.json`, and `config.payload.field` names the user fields copied into each worker's runtime context.
- `config.phases.duration` sets the total run duration in seconds (`360`, or 6 minutes).
- `config.phases.rampUp` is used by this project's batch runner as the number of users assigned to each worker (`3`). It is not being interpreted here as a standard Artillery ramp-up duration.
- `scenarios.name` and `scenarios.flowFunction` select the flow (`fileUpload`).

The flow itself is implemented by the exported `fileUpload` function in [`ShpFLoorFunction/shopfloorTranaction.js`](../ShpFLoorFunction/shopfloorTranaction.js). The separate [`test.spec.js`](../test.spec.js) is a Playwright Test spec; this Fargate CLI does not run that spec directly.

## Command

From the project root in PowerShell, run:

```powershell
node .\commander.js --runfargate artillery.js --workerpod 1
```

`--workerpod` is required and must be a positive integer. For example, to use two workers:

```powershell
node .\commander.js --runfargate artillery.js --workerpod 2
```

The runner assigns `rampUp` users to each worker, so the user pool must contain at least `workerpod * rampUp` records. With the current `rampUp` value of 3, one worker needs 3 user records and two workers need 6. The runner repeats worker batches for the configured duration.

## Prerequisites

1. Run the command from the project root so the relative paths in the configuration resolve.
2. Make sure `user.json` contains enough usable user records for the chosen worker count.
3. Configure AWS credentials and the following settings in the local `.env` file:
   - `AWS_REGION`
   - `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`
   - `ECS_CLUSTER` and `TASK_DEFINITION`
   - `SUBNET_ID` and `SECURITY_GROUP_ID`
   - `CONTAINER_NAME`
   - `LOADTEST_PROJECT_ZIP`
   - `METADATA_BUCKET`
   - `RUNNER_FILE_NAME`
4. Confirm the configured ECS task definition, network, S3 access, and runner container are set up for the project.

Do not commit or share the secret values in `.env`.

## CLI option notes

- `--region` is logged and included in metadata; the AWS SDK region is taken from `AWS_REGION` in `.env`.
- `--cpu` and `--memory` are logged and included in metadata, but the current ECS request does not use them to override the task definition.
- `--tag` is stored as test metadata.
- `--output` and `--key` are accepted by the CLI but are not currently wired into the run.
- `--solo` currently prints a message; it does not run the test locally.

The ZIP uploader currently reads the local archive from `loadtest-playwright-project.zip` and uploads it to the hard-coded S3 bucket `playwright-runner-artifacts`. Ensure the bundle/ZIP setup and bucket permissions match those values before launching a run.
