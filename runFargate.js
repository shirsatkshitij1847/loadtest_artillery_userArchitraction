import dotenv from "dotenv";

import {
    ECSClient,
    RunTaskCommand,
    DescribeTasksCommand,
} from "@aws-sdk/client-ecs";

dotenv.config();

const ecs = new ECSClient({
    region: process.env.AWS_REGION,
});


/**
 * Wait until one Fargate task reaches STOPPED.
 *
 * Also checks the container exit code.
 *
 * exitCode 0 = success
 * non-zero   = failure
 */
async function waitForTask(taskArn, vuIds) {

    while (true) {

        const response = await ecs.send(
            new DescribeTasksCommand({
                cluster: process.env.ECS_CLUSTER,
                tasks: [taskArn],
            })
        );

        const task = response.tasks?.[0];

        if (!task) {
            throw new Error(
                `Fargate task not found: ${taskArn}`
            );
        }

        console.log(
            `[${vuIds.join(", ")}] Fargate status: ${task.lastStatus}`
        );

        // -----------------------------------------
        // Task finished
        // -----------------------------------------

        if (task.lastStatus === "STOPPED") {

            const container = task.containers?.find(
                (container) =>
                    container.name === process.env.CONTAINER_NAME
            );

            const exitCode = container?.exitCode;

            console.log(
                `[${vuIds.join(", ")}] Fargate STOPPED`,
                {
                    exitCode,
                    stoppedReason: task.stoppedReason,
                    stopCode: task.stopCode,
                }
            );

            // -----------------------------------------
            // Container failed
            // -----------------------------------------

            if (exitCode !== 0) {

                throw new Error(
                    `Fargate task failed for VUs [${vuIds.join(", ")}]. ` +
                    `Exit code: ${exitCode}. ` +
                    `Reason: ${task.stoppedReason || "unknown"}`
                );
            }

            // -----------------------------------------
            // Container succeeded
            // -----------------------------------------

            console.log(
                `[${vuIds.join(", ")}] Fargate completed successfully`
            );

            return {
                taskArn,
                exitCode,
            };
        }

        // -----------------------------------------
        // Check again after 5 seconds
        // -----------------------------------------

        await new Promise((resolve) =>
            setTimeout(resolve, 5000)
        );
    }
}


/**
 * Start ONE Fargate task.
 *
 * Then wait until that task finishes.
 */
export async function runFargate( users,  testExecutionId ) 
{

    if (!Array.isArray(users) || users.length === 0) {
        throw new Error(
            "No users provided to runFargate()"
        );
    }

    const vuIds = users.map(
        (user) => user.vuId
    );

    console.log(`Starting Fargate task`,
        {
            testExecutionId,
            users: vuIds,
        }
    );

    const usersJson = JSON.stringify(users);

    // -----------------------------------------
    // START FARGATE TASK
    // -----------------------------------------

    const response = await ecs.send(

        new RunTaskCommand({

            cluster: process.env.ECS_CLUSTER,

            taskDefinition: process.env.TASK_DEFINITION,

            launchType: "FARGATE",

            count: 1,

            networkConfiguration: {

                awsvpcConfiguration: {

                    subnets: [
                        process.env.SUBNET_ID
                    ],

                    securityGroups: [
                        process.env.SECURITY_GROUP_ID
                    ],

                    assignPublicIp: "ENABLED",
                },
            },

            overrides: {

                containerOverrides: [

                    {
                        name: process.env.CONTAINER_NAME,

                        environment: [

                            {
                                name: "AWS_REGION",
                                value: process.env.AWS_REGION,
                            },

                            {
                                name: "AWS_BUCKET_NAME",
                                value: process.env.AWS_BUCKET_NAME,
                            },

                            {
                                name: "LOADTEST_PROJECT_ZIP",
                                value: process.env.LOADTEST_PROJECT_ZIP,
                            },

                            {
                                name: "TEST_EXECUTION_ID",
                                value: testExecutionId,
                            },

                            {
                                name: "RUNNER_FILE_NAME",
                                value: process.env.RUNNER_FILE_NAME,
                            },

                            {
                                name: "USERS",
                                value: usersJson,
                            },
                        ],
                    },
                ],
            },
        })
    );

    // -----------------------------------------
    // AWS FAILED TO START TASK
    // -----------------------------------------

    if (response.failures?.length) {

        console.error(
            "Fargate failed to start:",
            response.failures
        );

        throw new Error(
            `Fargate failed to start: ${JSON.stringify(
                response.failures
            )}`
        );
    }

    // -----------------------------------------
    // GET TASK ARN
    // -----------------------------------------

    const taskArn =  response.tasks?.[0]?.taskArn;

    if (!taskArn) {

        throw new Error(
            "Fargate task started but no task ARN was returned"
        );
    }

    console.log(
        `Fargate task started`,
        {
            taskArn,
            testExecutionId,
            users: vuIds,
        }
    );

    // -----------------------------------------
    // WAIT UNTIL TASK FINISHES
    // -----------------------------------------

    const result = await waitForTask(
        taskArn,
        vuIds
    );

    // -----------------------------------------
    // RETURN ONLY AFTER CONTAINER FINISHES
    // -----------------------------------------

    return {
        taskArn,
        exitCode: result.exitCode,
        testExecutionId,
        users,
    };
}
