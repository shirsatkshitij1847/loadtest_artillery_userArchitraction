# Starting a Fargate task with CPU and memory overrides

## Simple explanation

The ECS task definition holds the default settings. The ECS `RunTask` API accepts
an `overrides` object that changes CPU and memory for the task being started.
It does not edit the saved task definition or resize a task that is already running.

This folder provides a separate JavaScript module, `runFargate.js`, exporting
`startFargateTask`. The existing CLI and batch runner are unchanged and do not
automatically use this module.

## Where the values go

CPU and memory are inputs to the single `startFargateTask` function. The lines
that pass them to AWS are:

```javascript
overrides: {
    cpu: String(cpu),
    memory: String(memory),
    // Existing containerOverrides go here.
}
```

The module builds this structure in the AWS API request:

```javascript
overrides: {
    cpu: "2048",
    memory: "4096",
    containerOverrides: [
        // Container name and existing worker environment variables
    ],
}
```

CPU and memory are task-level fields, alongside `containerOverrides`. They are
not environment variables.

| Parameter | Unit | Example |
| --- | --- | --- |
| `cpu` | CPU units | `2048` = 2 vCPU |
| `memory` | MiB | `4096` = 4 GiB |

Both strings and numbers are accepted. Values must be positive whole numbers;
labels such as `"2 vCPU"` and `"4 GB"` are rejected.

Both parameters are required. If either is missing, null, empty, or whitespace,
the function throws an error before calling AWS, so no new task is started.
The caller must treat this error as a failed test; it does not stop tasks already running.
AWS validates the effective CPU/memory combination, operating system, and
platform requirements. For example, 2 vCPU with 4 GiB is a supported Linux
Fargate size.

Container-level CPU and memory settings are not changed by this module. In
particular, an existing container hard memory limit still applies even if task
memory increases. Check your task definition's container limits before scaling.

## Calling it from JavaScript

Example for a caller in the project root:

```javascript
import { startFargateTask } from "./fargate_Apis/runFargate.js";

// Use your existing runtime users and execution ID.
const result = await startFargateTask(users, testExecutionId, {
    cpu: "2048",
    memory: "4096",
});

console.log(result.taskArn);
```

Each call submits one task. These resources apply to that one worker, not to the
whole load test. Ten workers with 2 vCPU each request 20 vCPU in total and incur
charges for each task.

**Submission is not test completion.** This function returns the task ARN once
ECS accepts the request; the task may still be pending and can fail later.
Unlike the original runner, this module does not poll until `STOPPED`. Use ECS
`DescribeTasks` or the AWS console to monitor startup and execution, and check
the runner container's exit code after it stops. Do not mark a test successful
only because this function returned.

## Required setup

Run from the project root so `dotenv` reads the root `.env` file. Configure:

- `AWS_REGION`
- `ECS_CLUSTER`
- `TASK_DEFINITION`
- `SUBNET_ID`
- `SECURITY_GROUP_ID`
- `CONTAINER_NAME`
- `AWS_BUCKET_NAME`
- `LOADTEST_PROJECT_ZIP`
- `RUNNER_FILE_NAME`

Use your existing AWS credential setup. The SDK uses its default credential
provider chain, including environment credentials, profiles, or an IAM role.
Never put credentials in this JavaScript file or commit `.env`.

The task definition must support Fargate. IAM permissions must allow task
submission and passing the task's roles. Network settings, quota, artifact
access, and the container image must already be configured. This module uses
the same single-subnet, single-security-group, public-IP approach as the
existing runner.

Upload the test ZIP before submitting the task. This module does not bundle
files or upload artifacts. Users are passed through the existing `USERS`
environment variable format; very large batches can exceed the ECS task
override payload limit.

Missing settings, invalid resource values, AWS API errors, and returned ECS
startup failures reject the function's promise. Handle that rejection in your
calling code.

## Optional future CLI integration

To connect the existing `--cpu` and `--memory` options to the original runner:

1. Pass the options from `main()` into `runBatch()`.
2. Pass them from each batch into the original `runFargate()` call.
3. Add the validated values to that runner's task-level `overrides`.
4. Keep its existing polling and exit-code checks.

Those integration changes have **not** been made.

## Local verification

From the project root:

```powershell
node --test ".\fargate_Apis\runFargate.test.js"
```

The tests mock AWS SDK calls: they do not create tasks or generate AWS charges.
