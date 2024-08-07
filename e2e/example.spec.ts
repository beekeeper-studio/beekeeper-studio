import { test } from "@playwright/test";
import testWithPlaywright from "./testWithPlaywright";

// TODO maybe remove this after we get a faster compiler?
test.setTimeout(180000);

test("example test", async () => {
    const { app, stop } = await testWithPlaywright();
    const page = await app.firstWindow();
    await page.getByLabel("Connection Type").selectOption("SQLite");
    await stop();
});
