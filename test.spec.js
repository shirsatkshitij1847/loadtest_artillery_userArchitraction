import { test, expect } from 'playwright/test'
// import { artilleryFileTest, demo, fileUpload, loginPerformance, performanceCopilet } from './ShpFLoorFunction/shopfloorTranaction';
import { vuContext as configVuContext } from './usersCofig.js';
// test('Login Test', async ({ page }) => {

//     await artilleryFileTest(page, test);

// });


// test('Test 2', async ({ page }) => {

//     await demo(page, test, configVuContext);

// });


// test("File Upload Performance Test ", async ({page})=>{

//     await artilleryFileTest(page, test, configVuContext);

// })



// test("performance copilet test", async ({ page, context }) => {
//     context.tracing.start({ screenshots: true, snapshots: true });
    
//     await performanceCopilet(page, test, configVuContext);
//     context.tracing.stop({ path: 'trace.zip' });
// }); 

// test("another test", async ({ page, context }) => {
//     context.tracing.start({ screenshots: true, snapshots: true });
    
//     // Your test steps here

//     context.tracing.stop({ path: 'trace-another.zip' });
// });