import dotenv from "dotenv";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";

dotenv.config();

export async function startFargateTask(users, testExecutionId, { cpu, memory } = {}) {
    if (cpu == null || String(cpu).trim() === "" ||
        memory == null || String(memory).trim() === "") {
        throw new Error("CPU and memory are required. No Fargate task was started.");
    }

    if (!Array.isArray(users) || users.length === 0) {
        throw new Error("Provide a non-empty users array.");
    }
    if (typeof testExecutionId !== "string" || !testExecutionId.trim()) {
        throw new Error("Provide a non-empty testExecutionId.");
    }

    for (const [name, value] of Object.entries({ cpu, memory })) {
        if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) {
            throw new Error(`${name} must be a positive integer in ${name === "cpu" ? "CPU units" : "MiB"}.`);
        }
    }

    const requiredSettings = [
        "AWS_REGION",
        "ECS_CLUSTER",
        "TASK_DEFINITION",
        "SUBNET_ID",
        "SECURITY_GROUP_ID",
        "CONTAINER_NAME",
        "AWS_BUCKET_NAME",
        "LOADTEST_PROJECT_ZIP",
        "RUNNER_FILE_NAME",
    ];
    for (const name of requiredSettings) {
        if (!process.env[name]?.trim()) {
            throw new Error(`Missing required environment variable: ${name}`);
        }
    }

    const environment = [
        "AWS_REGION",
        "AWS_BUCKET_NAME",
        "LOADTEST_PROJECT_ZIP",
        "RUNNER_FILE_NAME",
    ].map((name) => ({ name, value: process.env[name] }));
    environment.push(
        { name: "TEST_EXECUTION_ID", value: testExecutionId },
        { name: "USERS", value: JSON.stringify(users) },
    );

    const ecs = new ECSClient({ region: process.env.AWS_REGION });
    try {
        const response = await ecs.send(new RunTaskCommand({
            cluster: process.env.ECS_CLUSTER,
            taskDefinition: process.env.TASK_DEFINITION,
            launchType: "FARGATE",
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    subnets: [process.env.SUBNET_ID],
                    securityGroups: [process.env.SECURITY_GROUP_ID],
                    assignPublicIp: "ENABLED",
                },
            },
            overrides: {
                cpu: String(cpu),
                memory: String(memory),
                containerOverrides: [{
                    name: process.env.CONTAINER_NAME,
                    environment,
                }],
            },
        }));

        if (response.failures?.length) {
            throw new Error(`Fargate failed to start: ${JSON.stringify(response.failures)}`);
        }

        const taskArn = response.tasks?.[0]?.taskArn;
        if (!taskArn) {
            throw new Error("Fargate returned no task ARN.");
        }

        console.log("Fargate task submitted", { taskArn, testExecutionId, cpu, memory });
        return { taskArn, testExecutionId };
    } finally {
        ecs.destroy();
    }
}
