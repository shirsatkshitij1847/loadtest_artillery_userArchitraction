import { chromium } from "playwright";
import { runnerFunction } from "./runnerFunction.js";

// -------------------- REAL USERS --------------------
// const users = [
//     { id: 1, username: "Rahul", state: "AVAILABLE" },
// ];

const users = (await import("./user.json", {
    with: { type: "json" }
})).default.map(user => ({
    ...user,
    state: "AVAILABLE"
}));

// Stores VU -> Real User mapping
const vuUserMap = new Map();

let vuCounter = 1;



// -------------------- CREATE BATCH --------------------
function createBatch(batchSize) {

    const availableUsers = users.filter(u => u.state === "AVAILABLE");

    const batch = [];

    while (batch.length < batchSize && availableUsers.length > 0) {

        const randomIndex = Math.floor(Math.random() * availableUsers.length);

        const realUser = availableUsers[randomIndex];

        realUser.state = "IN_USE";

        const vuUser = `VU_${String(vuCounter++).padStart(3, "0")}`;

        vuUserMap.set(vuUser, realUser);

        batch.push(vuUser);

        availableUsers.splice(randomIndex, 1);
    }

    return batch;
}

// -------------------- RELEASE --------------------
function releaseBatch(vuBatch) {

    vuBatch.forEach(vuUser => {

        const realUser = vuUserMap.get(vuUser);

        if (realUser) {
            realUser.state = "AVAILABLE";
            vuUserMap.delete(vuUser);
        }

    });

}

// -------------------- PLAYWRIGHT --------------------
// async function playwrightScript(vuUser) {

//     const realUser = vuUserMap.get(vuUser);

//     console.log(`Running ${vuUser} using ${realUser.username}`);

//     // Uncomment if you want to launch browser


//     const browser = await chromium.launch({
//         headless: false
//     });

//     const page = await browser.newPage();

//     await page.goto("https://practice.expandtesting.com/login");

//     await page.fill("#username", realUser.username);
//     await page.fill("#password", realUser.username);

//     await browser.close();


//     // Fake JSON result
//     const result = {
//         vuUser,
//         status: "PASSED",
//         timestamp: new Date().toISOString()
//     };

//     console.log("JSON Result:", result);

// }

// -------------------- DEMO --------------------
// (async () => {

//     console.log("Creating Batch...\n");

//     const batch = createBatch(3);

//     console.log("Batch:", batch);

//     console.log("\nCurrent Mapping");

//     console.table(
//         [...vuUserMap.entries()].map(([vu, user]) => ({
//             vuUser: vu,
//             realUser: user.username
//         }))
//     );

//     await Promise.all(
//         batch.map(vu => playwrightScript(vu))
//     );

//     releaseBatch(batch);

//     console.log("\nReleased Batch");

//     console.log(users);

// })();

//--------------------- Demo 2 ------------------

(async () => {
    const RUN_TIME_MS = 5 * 60 * 1000; // 5 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < RUN_TIME_MS) {
        console.log("Creating Batch...\n");

        const batch = createBatch(3);

        console.log("Batch:", batch);

        console.log("\nCurrent Mapping");

        console.table(
            [...vuUserMap.entries()].map(([vu, user]) => ({
                vuUser: vu,
                realUser: user.username
            }))
        );

        await Promise.all(
            batch.map(vu => {
                console.log(`Processing ${vu}`);
                return runnerFunction(vu);
            })
        );

        releaseBatch(batch);

        console.log("\nReleased Batch");
        console.log(users);
    }

    console.log("Finished running for 5 minutes.");
})();