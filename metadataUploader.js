import { S3Client , PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv'
dotenv.config();


const s3 = new S3Client({
    region: process.env.AWS_REGION || "eu-north-1"
});

export async function uploadMetadata({
    bucket,
    testExecutionId,
    metadata
}) {
    const key = `metadata_db/${testExecutionId}.json`;

    const command = new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: JSON.stringify(metadata, null, 2),
        ContentType: "application/json"
    });

    await s3.send(command);

    console.log(`Metadata uploaded to s3://${bucket}/${key}`);

    return {
        bucket,
        key
    };
}


// const data ={
//   "testExecutionId": "test-exec-12345",
//   "region": "ap-south-1",
//   "worker": 4,
//   "cpu": 2048,
//   "memory": 4096,
//   "user": "load-test-user",
//   "startTime": "2026-08-20T08:00:00.000Z",
//   "endTime": "2026-08-20T08:15:30.000Z",
//   "file": "/tests/scenarios/order-flow.js",
//   "scenarioName": "Login_Perfomacne",
//   "flowFunction": "Login_Perfomacne",
//   "duration": 930,
//   "batchSize": 100,
//   "service": "Fargate-ECS",
//   "status": "COMPLETED"
// }

// await uploadMetadata({
//     bucket: "sas-metadata-db",
//     testExecutionId: "testexecutionId12345",
//     metadata: data
// });