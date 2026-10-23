# User Pool Validation Fix

Detailed write-up of why `--runfargate` appeared to "do nothing", and the changes made to
[batchExecutionWithVuContext.js](../batchExecutionWithVuContext.js).

---

## 1. The command that failed

```powershell
node commander.js --runfargate artillery.js --workerpod 10 --region ap-south-1 --cpu 2048 --memory 4096 --tag kshitij.shirsat
```

**Observed behaviour**

- The process ran.
- No Fargate task was ever started.
- No error was shown.
- Exit code was `0` (success).
- `commander.js` printed `LOAD TEST FINISHED SUCCESSFULLY`.
- Metadata was uploaded to S3 with `status: "COMPLETED"`.

In short: a silent, false success.

---

## 2. Root cause

### 2.1 How many users does a run need?

Two numbers decide the size of the user pool required:

| Value | Source | Meaning |
| --- | --- | --- |
| `workers` | CLI flag `--workerpod` | Number of Fargate tasks started per round |
| `batchSize` | `config.phases.rampUp` in [artillery.js](../artillery.js) | Number of VUs (users) handed to **each** Fargate task |

The formula is:

```
usersRequired = workers x batchSize
```

### 2.2 The actual numbers

| Item | Value |
| --- | --- |
| `--workerpod` | `10` |
| `config.phases.rampUp` | `3` |
| Users required | `10 x 3 = 30` |
| Users present in `user.json` | `24` |
| Shortfall | `6` |

There were not enough users to fill even the **first** round.

### 2.3 Why users cannot be reused inside a round

Every runtime user carries a `state` field:

```js
runtimeUser.vuId  = `vu${crypto.randomUUID().slice(0, 8)}`;
runtimeUser.state = "AVAILABLE";
```

`createBatch()` only picks users whose `state === "AVAILABLE"`, and immediately flips the
picked user to `"IN_USE"`. Users are only released back to `"AVAILABLE"` by `releaseUser()`
**after the whole round finishes**.

So within a single round, the 10 workers cannot share the same 24 users — each of the
30 required slots needs a distinct, currently-available user.

### 2.4 The code path that swallowed the failure

Inside `runBatch()`, the loop that builds one batch per worker looked like this:

```js
for (let i = 0; i < workers; i++) {
    const batch = createBatch(batchSize);

    if (batch.length !== batchSize) {
        tasks.forEach((task) => {
            releaseUser(task.batch);
        });

        console.log(`Not enough users for ${workers} workers.`);

        return;                     // <-- silent exit
    }

    tasks.push({ batch, executionId });
}
```

What happened step by step:

1. Workers 1 to 8 each grabbed 3 users. 24 users consumed, 0 remaining.
2. Worker 9 called `createBatch(3)`. `availableUsers.length` was `0`, which is `< 3`,
   so `createBatch` returned `[]`.
3. `batch.length !== batchSize` was true, so already-reserved users were released and the
   function did a **bare `return`**.

A bare `return` produces `undefined`. It is **not** an exception. Therefore:

- `runBatch()` resolved successfully with `undefined`.
- `await runBatch(...)` in `main()` did not throw.
- `main()` carried on to step 20 onwards, built the "success" metadata block with
  `status: "COMPLETED"`, and uploaded it.
- `main()` returned normally.
- The `try` block in `commander.js` never entered its `catch`, so it printed
  `LOAD TEST FINISHED SUCCESSFULLY` and left `process.exitCode` at `0`.

### 2.5 Wasted work before the failure

Because the user-count problem was only discovered at step 19 (`RUNNING_FARGATE`),
everything before it had already executed:

| Step | Stage | Side effect |
| --- | --- | --- |
| 15 | `BUNDLING_PROJECT` | esbuild bundle written to `bundle/` |
| 16 | `CREATING_PROJECT_ZIP` | ZIP archive created on disk |
| 17 | `UPLOADING_PROJECT_ZIP` | ZIP uploaded to S3 |
| — | — | Initial metadata uploaded to S3 |

All of that was thrown away for a problem that is knowable from two integers.

---

## 3. Changes made

All changes are in [batchExecutionWithVuContext.js](../batchExecutionWithVuContext.js).

### Change 1 — Fail fast, before any AWS work

A new validation stage `VALIDATING_USER_POOL` was inserted in `main()`, immediately after
the existing batch-size validation (step 11) and **before** step 15 (`BUNDLING_PROJECT`):

```js
stage = "VALIDATING_USER_POOL";

if (workers * batchSize > users.length) {
    throw new Error(
        `Not enough users: --workerpod ${workers} x rampUp ${batchSize} requires ` +
            `${workers * batchSize} users, but ${config.payload?.path ?? "user.json"} has ${users.length}. ` +
            `Reduce --workerpod to ${Math.floor(users.length / batchSize)} or add more users.`,
    );
}
```

Effects:

- No bundling, no ZIP, no S3 upload, no metadata write when the pool is too small.
- The message states the required count, the actual count, the file it came from, and the
  **largest `--workerpod` value that will work** (`floor(users.length / batchSize)`).
- Because it `throw`s inside the existing `try`, the standard `catch` block runs: the
  `TEST EXECUTION FAILED` banner is printed with the failing stage, and `FAILED` metadata
  is recorded.

`config.payload?.path` uses optional chaining so that building the error message can never
itself throw when `payload` is absent from the Artillery config.

### Change 2 — `runBatch()` throws instead of returning silently

The bare `return` was replaced with a thrown error:

```js
if (batch.length !== batchSize) {
    tasks.forEach((task) => {
        releaseUser(task.batch);
    });

    throw new Error(
        `Not enough users: ${workers} workers x batch size ${batchSize} requires ` +
            `${workers * batchSize} users, but user.json has ${users.length}.`,
    );
}
```

Effects:

- Users reserved so far are still released first, so no user is left stuck in `"IN_USE"`.
- The failure now propagates instead of masquerading as success.
- `status: "COMPLETED"` metadata can no longer be written for a run that never started.
- The process exits with code `1`.

This second guard matters even with Change 1 in place. Change 1 only checks the pool at
startup; Change 2 protects later rounds, where a user could still be unavailable for other
reasons.

---

## 4. Behaviour before vs after

| Aspect | Before | After |
| --- | --- | --- |
| Where the problem is detected | Step 19, `RUNNING_FARGATE` | Step 11a, `VALIDATING_USER_POOL` |
| Bundle / ZIP / S3 upload performed | Yes, all wasted | No |
| Console output | One `console.log` line | `TEST EXECUTION FAILED` banner with stage and reason |
| Metadata `status` written | `COMPLETED` | `FAILED` |
| Exit code | `0` | `1` |
| Message content | Worker count only | Required vs available, source file, suggested `--workerpod` |

---

## 5. How to run successfully

Pick any one of these.

### Option A — Reduce the worker count (no data changes)

```powershell
node commander.js --runfargate artillery.js --workerpod 8 --region ap-south-1 --cpu 2048 --memory 4096 --tag kshitij.shirsat
```

`8 x 3 = 24`, which exactly matches the 24 users in `user.json`.

### Option B — Add more users

Add 6 more entries to `user.json` (total 30) to keep `--workerpod 10`. Each entry must
contain every field listed in `config.payload.field`:

```json
{
  "username": "...",
  "password": "...",
  "resource": "..."
}
```

### Option C — Reduce `rampUp`

Lower `config.phases.rampUp` in [artillery.js](../artillery.js) from `3` to `2`. Then
`10 x 2 = 20`, which fits inside 24 users.

### Quick reference table (24 users available)

| `rampUp` | Max `--workerpod` |
| --- | --- |
| 1 | 24 |
| 2 | 12 |
| 3 | 8 |
| 4 | 6 |
| 6 | 4 |

---

## 6. Related note: CLI flags that are metadata only

`--region`, `--cpu`, and `--memory` are recorded in the metadata document but are **not**
applied to the Fargate task. The real values come from environment variables and the ECS
task definition, read in [runFargate.js](../runFargate.js):

| Setting | Actual source |
| --- | --- |
| Region | `process.env.AWS_REGION` |
| Cluster | `process.env.ECS_CLUSTER` |
| Task definition | `process.env.TASK_DEFINITION` |
| CPU / memory | The ECS task definition |
| Container name | `process.env.CONTAINER_NAME` |
| Subnet / security group | `process.env.SUBNET_ID`, `process.env.SECURITY_GROUP_ID` |

Passing `--region ap-south-1` will not move the run to `ap-south-1` if `.env` says
otherwise. Change `AWS_REGION` in `.env` instead.

---

## 7. Verifying the user count quickly

```powershell
node -e "const u=require('./user.json'); console.log('users:', u.length)"
```

Compare the result against `--workerpod x rampUp` before starting a run.
