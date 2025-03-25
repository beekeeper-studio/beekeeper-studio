import { Locator, Page } from '@playwright/test';

export class QueryTab {
  private page: Page;
  queryTabTextArea: Locator;
  runQueryButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.queryTabTextArea = page.locator('#tab-0').getByRole('textbox');
    this.runQueryButton = page.getByRole('button', { name: 'Run' });
  }
}
