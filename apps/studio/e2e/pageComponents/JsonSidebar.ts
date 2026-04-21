import { Locator, Page } from '@playwright/test';

export class JsonSidebar {
  private page: Page;
  jsonViewerLabel: Locator;

  constructor(page: Page) {
    this.page = page;
    this.jsonViewerLabel = this.page
      .locator('x-label')
      .filter({ hasText: 'JSON Viewer' });
  }
}
