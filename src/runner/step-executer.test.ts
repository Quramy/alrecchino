import { Page, Browser } from "puppeteer";

// browser and page are exposed by jest-puppeteer
declare var browser: Browser;
declare var page: Page;

describe("hoge", () => {
  it("run test", () => {
    console.log(page);
  });
});