import {
    CloudWatchLogsClient,
    GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

import dotenv from "dotenv";

dotenv.config();

const cloudwatch = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
});

const LOG_GROUP_NAME = "/ecs/sas_loadtest_cluster_new";

const LOG_STREAM_NAME =
    "ecs/Main/a07e20d7b665461882b308be20d2e895";

let nextToken;


function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}


async function getNewLogs() {

    const response = await cloudwatch.send(
        new GetLogEventsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamName: LOG_STREAM_NAME,

            nextToken,
            startFromHead: true,

            limit: 100,
        })
    );

    nextToken = response.nextForwardToken;

    return response.events || [];
}


async function streamCharacters(message) {

    for (const character of message) {

        process.stdout.write(character);

        // Adjust speed
        await sleep(20);
    }

    process.stdout.write("\n");
}


async function start() {

    console.log("Starting log stream...\n");

    while (true) {

        const events = await getNewLogs();

        for (const event of events) {

            await streamCharacters(
                event.message
            );

        }

        await sleep(1000);
    }
}


start().catch(console.error);