import { test, expect } from '@playwright/test';
import users from '../user.json' with { type: 'json' };
import path from 'path';
import fs from 'fs';
console.log(users[0].username);
import { vuContext as configVuContext } from '../usersCofig.js';

export async function demo(page, test, vuContext) {

 // Use Artillery's vuContext when available.
  // Otherwise use the config imported from usersCofig.
  const username = vuContext?.username || configVuContext[0].username;
  const password = vuContext?.password || configVuContext[0].password;

  const { step } = test;

  await step("login actions", async () => {
    await page.goto('https://practice.expandtesting.com/login');
    await page.fill('#username', username);
    await page.fill('#password',password);
  });

  await step("submit performance", async () => {
    await page.click('#submit-login');
    await expect(page).toHaveURL(/secure|dashboard|account/i);
    // const filePath = path.resolve('./ShopFloorLayout.png')
  });

  // await step("just checking it working or not ", async () => {
  //   function delay(ms) {
  //     return new Promise(resolve => setTimeout(resolve, ms));
  //   }
  //   await delay(60000)
  // })

}

export async function fileUpload(page, test, vuContext) {

    const {step} = test;

    await page.goto('https://demo.testautomationtv.com/file-demo');

    await page.locator('#file-input').setInputFiles('./logo.png');

    await step("File Upload Performance ", async () => {

        await page.locator('#upload-btn').click();
        await expect(page.locator('.alert-success')).toContainText('uploaded successfully');

    })

}

export async function artilleryFileTest(page, test, vuContext) {

  const { step } = test;

  await step("Page loading performance ", async () => {

    await page.goto("https://testautomationcentral.com/demo/file_upload.html");
    const pageTitle = await page.locator("//a[contains(text(),'Test Automation Central')]/ancestor::div[1]");
    await pageTitle.waitFor({ state: 'visible' });

  })

  await page.locator("//input[@id='file-input']").setInputFiles('architect.png');

  const uploadFileBtn = await page.locator(`(//button[contains(text(),'Upload')])[2]`);


  await step("file upload perfomance", async () => {

    await uploadFileBtn.click();

    const validateMessage = await page.locator(`//p[contains(text(),'File "architect.png" uploaded successfully.')]`);

    await validateMessage.waitFor({ state: 'visible' })
  })


}

export async function lauchUrl(page, test, vuContext){
  const {step} = test;

  await step("lauch url perfomance ", async ()=>{
    await page.goto(`https://google.com`);
  })
}



export async function loginPerformance(page, test, vuContext) {

    const { step } = test;
    const url =`https://opcexcr014.coreperf.momoncloud.com:444/login.html`;
    const name = vuContext.vars?.Name ?? users.username;
    const pass = vuContext.vars?.Password ?? users.password;

    
    // Get maximum screen dimensions from inside the browser
    // Apply it to the current page
    
    await page.goto(url);
    
    //await page.setViewportSize({ width: 1920, height: 1080 });

    await page.getByRole('textbox', { name: 'User Name' }).click();
    await page.getByRole('textbox', { name: 'User Name' }).fill(`camstaradmin`);
    await page.getByRole('textbox', { name: 'Password' }).click();
    await page.getByRole('textbox', { name: 'Password' }).fill(`Cam1star`);
    await page.getByRole('textbox', { name: 'Domain' }).click();
    await page.getByRole('textbox', { name: 'Domain' }).fill(`.`);

    await step("Login Performance", async () => {

        await page.getByRole('button', { name: 'Log In' }).click();
        const LayoutTilePageXpath = `(//span[contains(@class,"application-header") and contains(text(),"Opcenter Execution Core")]/ancestor::div)[7]`;
        const LayoutTilePage = await page.locator(LayoutTilePageXpath);
        await LayoutTilePage.waitFor({ state: "visible" });
        await expect(LayoutTilePage).toBeVisible();

    })

}


export async function saveLayout(page, test, vuContext) {

    const { step } = test;

    const LayoutName = `ACPlant${Date.now()}`;

    await loginPerformance(page, test, vuContext); // assuming it uses `page` internally

    // Go to Layouts page
    await page.getByRole('button', { name: 'LAYOUTS' }).click();
    const layoutpageXpath = `//div[contains(@class,'mx-scrollcontainer-right')]/preceding-sibling::div[contains(@class,'mx-scrollcontainer-center')]/preceding-sibling::div[contains(@class,'mx-scrollcontainer-left ')]/parent::div`;
    const layoutpage = await page.locator(layoutpageXpath);
    await layoutpage.waitFor({ state: 'visible' });

    // Click "Add"
    await page.getByRole('button', { name: 'Add' }).click();
    const savelayoutpannel = await page.locator(`//div[contains(@class,'modal-body mx-window-body')]/parent::div/div/h4[contains(text(),"Create Layout")]`);
    await savelayoutpannel.waitFor({ state: 'visible' });

    // Upload
    // const path = require('path');
    //const filePath = path.join('C:', 'SASLayoutImage', 'ShopFloorLayout.png');
    const filePath = path.resolve('./ShopFloorLayout.png')
    await page.locator('input[type="file"]').setInputFiles(filePath);

    const layoutPannel = await page.locator('//div[contains(@class,"modal-header mx-window-header")]/h4[contains(text(),"Create Layout")]');
    await layoutPannel.click();

    // Fill name
    const layoutNametextBox = await page.locator('//div[@class="mx-name-layoutName_textBox mx-textbox form-group no-columns"]/input[contains(@id,"EXCR_ResourceManagement.Layout_New.layoutName_textBox")]');
    await layoutNametextBox.fill(LayoutName);

    // Fill description
    const discriptionTextBox = await page.locator('//div[contains(@class,"mx-name-layoutDescription_textArea mx-textarea form-group no-columns")]/textarea[contains(@id,"EXCR_ResourceManagement.Layout_New.layoutDescription_textArea")]');
    await discriptionTextBox.fill("Test Layout");

    // Wait for save button
    const saveLayoutBtn = await page.locator('//button[contains(@class,"btn mx-button mx-name-addLayout_save_btn btn-primary")]');
    await saveLayoutBtn.waitFor({ state: 'visible' });

  await step("Save Layout Performance", async () => {

    const start = performance.now();

    await saveLayoutBtn.click();

    console.log(
        `SAVE CLICK COMPLETED: ${(performance.now() - start).toFixed(2)} ms`
    );

    const successMessagePopup = page.locator(
        '//div[contains(@class,"swal2-icon swal2-success swal2-icon-show")]/following-sibling::h2'
    );

    await successMessagePopup.waitFor({ state: "visible" });

    console.log(
        `SUCCESS POPUP VISIBLE: ${(performance.now() - start).toFixed(2)} ms`
    );

    const message = await successMessagePopup.textContent();

    console.log(
        `TEXT CONTENT COMPLETE: ${(performance.now() - start).toFixed(2)} ms`
    );

    await expect(message).toContain(`Layout "${LayoutName}" added on`);

    console.log(
        `ASSERTION COMPLETE: ${(performance.now() - start).toFixed(2)} ms`
    );
});

    const successMessagePopup = await page.locator('//div[contains(@class,"swal2-icon swal2-success swal2-icon-show")]/following-sibling::h2');

    await successMessagePopup.waitFor({ state: 'detached' });

    const homeBtn = await page.locator(`(//a[contains(@class,'mx-name-Home')])[1]`);
    await homeBtn.waitFor({ state: 'visible' })
    await homeBtn.click();

    return LayoutName;


}

export async function performanceCopilet(page, test, vuContext){
   
    const { step } = test;

    await page.goto(`https://corex-nfr1.coreperf.momoncloud.com/`);

    await page.locator(`xpath=//h1[normalize-space()='Sign in to your account']`).waitFor({ state: 'visible' });

    await page.locator(`xpath=//h1[normalize-space()='Sign in to your account']`).waitFor({ state: 'visible' });

    await page.locator(`xpath=//label[normalize-space()='Username or email']`).waitFor({ state: 'visible' });

    await page.locator(`xpath=//input[@id='username']`).fill('testuser@siemens.com');

    await page.locator(`xpath=//label[normalize-space()='Password']`).waitFor({ state: 'visible' });

    await page.locator(`xpath=//input[@id='password']`).fill('1234');

    await page.locator(`xpath=//input[@id='kc-login']`).waitFor({ state: 'visible' });

    // Navigation happened after this step: https://keycloakcorexnfr1.coreperf.momoncloud.com/realms/modmom/login-actions/authenticate?session_code=QGhql0bEP_UcnyknDFkn_38lAezDkT5LLgY7HBqSHrg&execution=7ced5f6f-5d88-4332-883c-f301359394fc&client_id=corex01&tab_id=t1wz88IfQDs

    await step('Click Sign In', async () => {
    
    await page.locator(`xpath=//input[@type='submit' and @value='Sign In']`).click();
        
    await page.locator(`xpath=//h1[normalize-space()='Opcenter']`).waitFor({ state: 'visible' });
    
  });

    // Navigation happened after this step: https://keycloakcorexnfr1.coreperf.momoncloud.com/realms/modmom/login-actions/authenticate?session_code=lLygK8-TsUHsaaAaGowDZ4HvXk92snO1uzv06wLRkpA&execution=7ced5f6f-5d88-4332-883c-f301359394fc&client_id=corex01&tab_id=t1wz88IfQDs


    await page.locator(`xpath=//div[normalize-space()='MES']`).waitFor({ state: 'visible' });

    // Page content changed after this step: https://corex-nfr1.coreperf.momoncloud.com/#/LandingPage/home

    await page.locator(`xpath=//div[contains(@class,'mom-homepage-tile-title') and normalize-space()='MENDIX']`).waitFor({ state: 'visible' });

    // Navigation happened after this step: https://corex-nfr1.coreperf.momoncloud.com/mesbasemxui/

    await step('Click MENDIX performance', async () => { 

      
    await page.locator(`xpath=//div[contains(@class,'mom-homepage-tile-title') and normalize-space()='MENDIX']`).click();

    // Navigation happened after this step: https://corex-nfr1.coreperf.momoncloud.com/mesbasemxui/

    await page.locator(`//div[contains(@class,'mx-name-container74')]//h4[contains(text(),'Performance Copilot')]`).waitFor({ state: 'visible' });

    });


    await step('Click Performance Copilot', async () => {
        await page.locator(`//div[contains(@class,'mx-name-container74')]//h4[contains(text(),'Performance Copilot')]`).click();

        // Navigation happened after this step: https://corex-nfr1.coreperf.momoncloud.com/mesbasemxui/

        await page.locator(`xpath=//span[contains(normalize-space(),'Ask Copilot a question about production')]`).waitFor({ state: 'visible' });
    });
 

    const chatInput = page.getByRole('textbox', {
        name: 'How can I help you?',
        exact: true
    });
    const previousChatInput = await chatInput.elementHandle();

    await page.getByRole('button', { name: 'New Chat', exact: true }).click();
    await page.locator(`(//div[contains(@class,'chat-input-container')]/parent::div//div[contains(@class,'chat-listview')])[1]`).waitFor({ state: 'attached' }); 
    await previousChatInput.waitForElementState('hidden');

    await expect(chatInput).toBeEditable();
    await chatInput.click();
    await chatInput.fill('hi');
    await chatInput.press('Tab');
    await expect(chatInput).toHaveValue('hi');
    const sendButton = page.locator(
        `#panel-content button.mx-name-btnSendMessage`
    );
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Page content changed after this step: https://corex-nfr1.coreperf.momoncloud.com/mesbasemxui/

    await page.locator(`(//span[contains(text(),'Assistant')])[1]`).waitFor({ state: 'attached' });
}