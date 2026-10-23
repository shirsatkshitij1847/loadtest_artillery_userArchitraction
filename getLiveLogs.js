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


async function getRecentLogs() {

    const response = await cloudwatch.send(
        new GetLogEventsCommand({
            logGroupName: LOG_GROUP_NAME,
            logStreamName: LOG_STREAM_NAME,

            startFromHead: true,

            limit: 100,
        })
    );

    const logs = response.events || [];

    const logText = logs
        .map((event) => event.message)
        .join("\n");

    return {
        logs: logText
    };
}


const result = await getRecentLogs();
console.log(result);

console.log(
    JSON.stringify(result, null, 2)
);