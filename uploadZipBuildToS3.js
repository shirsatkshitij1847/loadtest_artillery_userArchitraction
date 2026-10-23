

import dotenv from "dotenv";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";

dotenv.config();

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function uploadZip(zipfileName) {
  
    console.log(zipfileName);
    
  try {
    const filePath = "./loadtest-playwright-project.zip";

    const command = new PutObjectCommand({
    //   Bucket: process.env.AWS_BUCKET_NAME,
    Bucket: `playwright-runner-artifacts`,
      Key: zipfileName,
      Body: fs.createReadStream(filePath),
      ContentType: "application/zip",
    });

    await s3Client.send(command);

    console.log("ZIP uploaded successfully!");
  } catch (err) {
    console.error("Upload failed:", err);
  }
}

// uploadZip();
