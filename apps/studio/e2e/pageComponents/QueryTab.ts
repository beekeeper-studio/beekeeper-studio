import { Locator, Page } from '@playwright/test';

export class QueryTab {
  private page: Page;
  queryTabTextArea: Locator;
  runQueryButton: Locator;
  openNewTabButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.queryTabTextArea = this.page.locator('#tab-0').getByRole('textbox');
    this.runQueryButton = this.page.getByRole('button', { name: 'Run' });
    this.openNewTabButton = this.page.locator('#add-tab-group a').filter({ hasText: 'add' });
  }

  async tabTextArea(tabNumber?: string) {
    const tab = tabNumber ? tabNumber : '0';
    return await this.page.locator(`#tab-${tab}`).getByRole('textbox');
  }

  async tabRunQueryButton(tabNumber?: string) {
    const tab = tabNumber ? tabNumber : '0';
    return await this.page.locator(`#tab-${tab}`).getByRole('button', { name: 'Run' });
  }


}
