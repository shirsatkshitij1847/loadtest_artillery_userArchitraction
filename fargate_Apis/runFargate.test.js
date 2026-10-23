import assert from "node:assert/strict";
import { test } from "node:test";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { startFargateTask } from "./runFargate.js";

function mockSettings(t) {
    for (const name of [
        "AWS_REGION", "ECS_CLUSTER", "TASK_DEFINITION", "SUBNET_ID",
        "SECURITY_GROUP_ID", "CONTAINER_NAME", "AWS_BUCKET_NAME",
        "LOADTEST_PROJECT_ZIP", "RUNNER_FILE_NAME",
    ]) {
        const original = process.env[name];
        process.env[name] = name === "AWS_REGION" ? "eu-north-1" : `test-${name}`;
        t.after(() => {
            if (original === undefined) delete process.env[name];
            else process.env[name] = original;
        });
    }
}

test("sends required task resources without changing container settings", async (t) => {
    mockSettings(t);
    let request;
    t.mock.method(ECSClient.prototype, "send", async (command) => {
        assert.ok(command instanceof RunTaskCommand);
        request = command.input;
        return { tasks: [{ taskArn: "test-task" }] };
    });
    const destroy = t.mock.method(ECSClient.prototype, "destroy", () => {});
    const users = [{ vuId: "test-vu" }];

    for (const resources of [{ cpu: 2048, memory: "4096" }, { cpu: "1024", memory: 2048 }]) {
        assert.deepEqual(await startFargateTask(users, "test-execution", resources), {
            taskArn: "test-task",
            testExecutionId: "test-execution",
        });
        assert.equal(request.launchType, "FARGATE");
        assert.equal(request.count, 1);
        for (const name of ["cpu", "memory"]) {
            assert.equal(Object.hasOwn(request.overrides, name), Object.hasOwn(resources, name));
            if (name in resources) assert.equal(request.overrides[name], String(resources[name]));
        }
        const container = request.overrides.containerOverrides[0];
        assert.equal(container.name, process.env.CONTAINER_NAME);
        assert.equal(Object.hasOwn(container, "cpu"), false);
        assert.equal(Object.hasOwn(container, "memory"), false);
        assert.equal(container.environment.find((item) => item.name === "USERS").value, JSON.stringify(users));
        assert.equal(container.environment.find((item) => item.name === "TEST_EXECUTION_ID").value, "test-execution");
    }
    assert.equal(destroy.mock.callCount(), 2);
});

test("rejects invalid inputs before AWS submission", async (t) => {
    mockSettings(t);
    const send = t.mock.method(ECSClient.prototype, "send", async () => assert.fail("Unexpected AWS call"));
    const resources = { cpu: 2048, memory: 4096 };
    await assert.rejects(startFargateTask([{}], "test"), /CPU and memory are required/);
    for (const name of ["cpu", "memory"]) {
        for (const value of [undefined, null, "", "   "]) {
            await assert.rejects(startFargateTask([{}], "test", { ...resources, [name]: value }), /CPU and memory are required/);
        }
        for (const value of ["2 vCPU", "4 GB", "1.5", " 2048 ", 0, -1, NaN, Infinity, true, Number.MAX_SAFE_INTEGER + 1]) {
            await assert.rejects(startFargateTask([{}], "test", { ...resources, [name]: value }), /positive integer/);
        }
    }
    await assert.rejects(startFargateTask([], "test", resources), /non-empty users/);
    await assert.rejects(startFargateTask([{}], "", resources), /testExecutionId/);
    delete process.env.TASK_DEFINITION;
    await assert.rejects(startFargateTask([{}], "test", resources), /Missing required environment variable: TASK_DEFINITION/);
    assert.equal(send.mock.callCount(), 0);
});

test("propagates AWS errors and startup failures and releases the client", async (t) => {
    mockSettings(t);
    const send = t.mock.method(ECSClient.prototype, "send");
    const destroy = t.mock.method(ECSClient.prototype, "destroy", () => {});
    send.mock.mockImplementation(async () => {
        throw new Error("Invalid Fargate CPU/memory combination");
    });
    await assert.rejects(startFargateTask([{}], "test", { cpu: 2048, memory: 1024 }), /Invalid Fargate/);
    send.mock.mockImplementation(async () => ({ failures: [{ reason: "RESOURCE:MEMORY" }] }));
    await assert.rejects(startFargateTask([{}], "test", { cpu: 2048, memory: 4096 }), /RESOURCE:MEMORY/);
    send.mock.mockImplementation(async () => ({ tasks: [] }));
    await assert.rejects(startFargateTask([{}], "test", { cpu: 2048, memory: 4096 }), /no task ARN/);
    assert.equal(destroy.mock.callCount(), 3);
});
