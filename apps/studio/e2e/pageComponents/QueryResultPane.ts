import { Locator, Page } from '@playwright/test';

export class QueryResultPane {
  private page: Page;
  resultFirstRow: Locator;

  constructor(page: Page) {
    this.page = page;
    this.resultFirstRow = page.getByRole('gridcell', { name: '1' });
  }
}
