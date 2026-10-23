import { chromium } from 'playwright';

//testRunner(scenarioName,test,vuContext,event)  you can add later event which will record the
//  fcp etc for browser and add more metrix reated to the execution and ui performaance 

// scenario from --scenarion read from cli and map from config 

export async function scriptExecutor(scenarioName, test, vuContext) {

    //const buildFilePath =  path.basename(filePath);

    const processorFunctionModul = await import(`./bundle/shopfloorTranaction.js`)

    console.log(processorFunctionModul[scenarioName]);

    const { username, password } = vuContext;

    const browser = await chromium.launch({
        headless: true
    });

    // Create a new browser context
    const context = await browser.newContext();

    // Create a new page
    const page = await context.newPage();

    try {
        await processorFunctionModul[scenarioName](page, test)
    }
    catch (err) {
        console.log(err);

    }
    await context.close();
    await browser.close();
}

