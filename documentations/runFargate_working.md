import dotenv from "dotenv";
import {
    ECSClient,
    RunTaskCommand
} from "@aws-sdk/client-ecs";

dotenv.config();

const ecs = new ECSClient({
    region: process.env.AWS_REGION
});

/**
 * Start one Fargate task and pass the selected users
 * as the USERS environment variable.
 */
export async function runFargate(users,testExecutionId) {

    if (!Array.isArray(users) || users.length === 0) {
        throw new Error("No users provided to runFargate()");
    }

    console.log(`Starting Fargate task with ${users.length} users`);

    const usersJson = JSON.stringify(users);

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

                    assignPublicIp: "ENABLED"
                }
            },

            overrides: {
                containerOverrides: [
                    {
                        name: process.env.CONTAINER_NAME,

                        environment: [
                            {
                                name: "AWS_REGION",
                                value: process.env.AWS_REGION
                            },

                            {
                                name: "AWS_BUCKET_NAME",
                                value: process.env.AWS_BUCKET_NAME
                            },

                            {
                                name: "LOADTEST_PROJECT_ZIP",
                                value: process.env.LOADTEST_PROJECT_ZIP
                            },

                            {
                                name: "TEST_EXECUTION_ID",
                                value: testExecutionId
                            },

                            {
                                name: "RUNNER_FILE_NAME",
                                value: process.env.RUNNER_FILE_NAME
                            },

                            {
                                name: "USERS",
                                value: usersJson
                            }
                        ]
                    }
                ]
            }
        })
    );

    console.log("Fargate response:");
    console.log(
        JSON.stringify(response, null, 2)
    );

    return response;
    
}


// export async function runFargate(users,testExecutionId){
//     function wait() {
//   return new Promise(resolve => {
//     setTimeout(resolve, 5000);
//   });
// }

// // Usage:
// await wait();
// console.log("5 seconds completed");
// }