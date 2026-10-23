

///workingrunner file which will creaet a details json result 

import { chromium } from "playwright";
import { Test } from "./Test.js";

async function runnerFunction(vuUser, scenario) {

    let browser;


    const test = new Test(
        scenario,
        vuUser
    );


    try {

        browser = await chromium.launch({
            headless: false
        });


        const page = await browser.newPage();


        await test.step(
            "Login Flow",
            async () => {


                await page.goto(
                    "https://practice.expandtesting.com/login"
                );


                await page.fill(
                    "#username",
                    vuUser.username
                );


                await page.fill(
                    "#password",
                    vuUser.password
                );


                await page.click(
                    "button[type='submit']"
                );


            }
        );


        return test.getResult();


    }
    catch (err) {

        test.fail(err);

        return test.getResult();

    }
    finally {

        if (browser) {

            await browser.close();

        }

    }
}


const users = [

    {
        username: "practice",
        password: "SuperSecretPassword!"
    },

    {
        username: "practice",
        password: "SuperSecretPassword!"
    },

    {
        username: "practice",
        password: "SuperSecretPassword!"
    }

];


const scenario = "login";

const startTime = Date.now();

const userExecutionResults = await Promise.all(

    users.map(user =>
        runnerFunction(
            user,
            scenario
        )
    )

);

const finalResult = {

    scenario,

    startTime: new Date(
        startTime
    ).toISOString(),

    endTime: new Date().toISOString(),

    duration: Date.now() - startTime,

    status:
        userExecutionResults.every(
            user => user.status === "PASSED"
        )
        ? "PASSED"
        : "FAILED",


    users: userExecutionResults

};



console.log(
    JSON.stringify(
        finalResult,
        null,
        2
    )
);






------------------------------------------------------------------------------------------------------------------------------------------------------------------------------