import {
    CloudWatchLogsClient,
    GetLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";

import dotenv from "dotenv";
import fs from "fs/promises";

dotenv.config();

const cloudwatch = new CloudWatchLogsClient({
    region: process.env.AWS_REGION,
});

const LOG_GROUP_NAME = "/ecs/sas_loadtest_cluster_new";

const LOG_STREAM_NAME =
    "ecs/Main/a07e20d7b665461882b308be20d2e895";

const OUTPUT_FILE = "./public/live-logs.json";

let nextToken = undefined;


// -----------------------------------------
// Get new CloudWatch logs
// -----------------------------------------

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


// -----------------------------------------
// Write logs to JSON
// -----------------------------------------

async function writeLogs(events) {

    if (!events.length) {
        return;
    }

    const logs = events.map((event) => ({
        timestamp: new Date(
            event.timestamp
        ).toISOString(),

        message: event.message,
    }));

    await fs.writeFile(
        OUTPUT_FILE,

        JSON.stringify(
            {
                logs,
            },
            null,
            2
        ),

        "utf8"
    );

    console.log(
        `Wrote ${logs.length} logs`
    );
}


// -----------------------------------------
// Start
// -----------------------------------------

async function start() {

    console.log(
        "Starting CloudWatch log stream..."
    );

    while (true) {

        try {

            const events =
                await getNewLogs();

            await writeLogs(events);

        } catch (error) {

            console.error(
                "Log error:",
                error.message
            );

        }

        await new Promise(
            (resolve) =>
                setTimeout(resolve, 1000)
        );
    }
}


start();