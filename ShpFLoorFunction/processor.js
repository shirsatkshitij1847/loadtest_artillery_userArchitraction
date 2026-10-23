import { test, expect } from '@playwright/test';
import users from '../user.json' with { type: 'json' };


console.log(users[0].username);

export async function demo(page, test) {


  const { step } = test;

  await step("login actions", async () => {
    await page.goto('https://practice.expandtesting.com/login');
    await page.fill('#username', users[0].username);
    await page.fill('#password', users[0].password);
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