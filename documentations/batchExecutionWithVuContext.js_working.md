import { chromium } from "playwright";
import { bundleProject } from "./bundler.js";
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config()
import { uploadZip } from "./uploadZipBuildToS3.js";
import { zipFolder } from "./createZipBundle.js";
// ----------------------------
// Read Artillery Config
// ----------------------------
const artilleryModule = await import("./artillery.js");
const { config } = artilleryModule;

const fargateWorkers = config.phases.workers || 0;
const duration = config.phases.duration || 0;
const rampUp = config.phases.rampUp || 1;

const projectZipFolderName = process.env.LOADTEST_PROJECT_ZIP;

// ----------------------------
// Read Users & Create Runtime Users
// ----------------------------
const rawUsers = (
    await import("./user.json", {
        with: { type: "json" },
    })
).default;

// Runtime users used for batching
const users = rawUsers.map((user) => {
    const runtimeUser = {};

    // Copy every field listed in artillery.js
    config.payload.field.forEach((field) => {
        runtimeUser[field] = user[field];
    });

    runtimeUser.vuId = `vu${crypto.randomUUID().slice(0, 8)}`;
    runtimeUser.state = "AVAILABLE";

    return runtimeUser;
});

// ----------------------------
// Batch Creation
// ----------------------------
function createBatch(batchSize) {
    const availableUsers = users.filter(
        (user) => user.state === "AVAILABLE"
    );

    if (availableUsers.length === 0) {
        return [];
    }

    const selectedUsers = [];

    while (
        selectedUsers.length < batchSize &&
        availableUsers.length > 0
    ) {
        const randomIndex = Math.floor(
            Math.random() * availableUsers.length
        );

        const selectedUser = availableUsers[randomIndex];

        selectedUser.state = "IN_USE";

        selectedUsers.push(selectedUser);

        availableUsers.splice(randomIndex, 1);
    }

    return selectedUsers;
}

// ----------------------------
// Release Users
// ----------------------------
function releaseUser(batch) {
    batch.forEach((user) => {
        user.state = "AVAILABLE";
    });
}

// ----------------------------
// Available Users
// ----------------------------
function getAvailableUsers() {
    return users.filter((user) => user.state === "AVAILABLE");
}

// ----------------------------
// Test Batch Creation
// ----------------------------
function testCreateBatch(numberOfBatches, batchSize) {
    const batches = [];

    for (let i = 1; i <= numberOfBatches; i++) {
        const batch = createBatch(batchSize);

        batches.push(batch);

        console.log(
            `Batch ${i}:`,
            batch.map((u) => ({
                username: u.username,
                vuId: u.vuId,
            }))
        );
    }

    console.log("\nIN_USE USERS");
    console.table(users.filter((u) => u.state === "IN_USE"));

    return batches;
}

// ----------------------------
// Playwright Script
// ----------------------------
async function playwrightScript(vuContext) {

    const { username, password } = vuContext;

    const browser = await chromium.launch({
        headless: false,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto("https://practice.expandtesting.com/login");

    await page.fill("#username", username);
    await page.fill("#password", password);

    console.log(
        `VU ${vuContext.vuId} logged in as ${vuContext.username}`
    );

    await browser.close();
}

// ----------------------------
// Simulate Fargate Pod
// ----------------------------
async function runFargatePod(batch) {

    //call fargate restAPI from pod creation and pass then array of batch as env variable 

    console.log("\nRunning Fargate Pod");
    console.log(batch);


    batch.forEach((user) => {
        console.log({
            vuId: user.vuId,
            username: user.username,
            state: user.state,
        });
    });

    //scriptExecutor(scenarioName, test, vuContext)
    const faragateTask = batch.map((vuContext) => playwrightScript(vuContext))
    //   // Example:
    await Promise.all(faragateTask);

    await new Promise((resolve) => setTimeout(resolve, 5000));
}

// ----------------------------
// Runtime
// ----------------------------
const RUN_TIME_MS = duration * 1000;
const startTime = Date.now();

// ----------------------------
// Fargate Workers
// ----------------------------
export async function runFargateWorkersArchrestraction() {
    while (Date.now() - startTime < RUN_TIME_MS) {
        const workers = [];

        for (let workerId = 1; workerId <= fargateWorkers; workerId++) {
            const batch = createBatch(rampUp);

            if (batch.length < rampUp) { break; }

            workers.push(
                (async (workerId, batch) => {
                    console.log(`\nFargate-${workerId} Started`);

                    //   console.table(
                    //     batch.map((u) => ({
                    //       vuId: u.vuId,
                    //       username: u.username,
                    //       state: u.state,
                    //     }))
                    //   );
                    try {
                        await runFargatePod(batch);
                    } finally {
                        releaseUser(batch);

                        console.log(`Fargate-${workerId} Released Users`);
                    }
                })(workerId, batch)
            );
        }

        if (workers.length === 0) {
            console.log("Waiting for available users...");
            await new Promise((r) => setTimeout(r, 1000));
            continue;
        }

        console.log(
            "\n================ START EXECUTION ================\n"
        );

        await Promise.all(workers);

        console.log(
            "\n================ END EXECUTION ==================\n"
        );
    }

    console.log("\nExecution Completed");
}

// await runFargateWorkers();
const usersbatch = createBatch(3);
console.log(usersbatch);

// await runFargatePod(usersbatch)

export async function main(fileName) {
    
    //this function move to onorther folder and call before the run userarchistartion in commander js in --runfargate

    try {

        let filePath = fileName;

        if (!filePath.startsWith("./")) {
            filePath = "./" + filePath;
        }

        const artilleryModule = await import(filePath);
        const { config, scenarios } = artilleryModule;
        console.log(config.media);
        
        // Important : Read Bundle the processor file using bundle funciton beac for testrunner it reading the scenario from that ./bundle.processor.js
        // Read the Path of Processor file and extract the filename from that and pass to bundle function 
        //sending file patha as well beac need to copy artillery file
        
        await bundleProject(config.processor,config.media,filePath);

        // Folder to zip
        await zipFolder("bundle", projectZipFolderName).catch(console.error);
        //upload zip to aws s3 bucket "playwright-runner-artifacts"
        await uploadZip(projectZipFolderName);


    }
    catch (err) {
        console.log(err.message);

    }


}

