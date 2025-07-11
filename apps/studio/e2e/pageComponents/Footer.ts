import { Locator, Page } from '@playwright/test';

export class Footer {
  private page: Page;
  downloadButton: Locator;
  copyToClipboardToast: Locator;

  constructor(page: Page) {
    this.page = page;
    this.downloadButton = this.page.getByRole('button', { name: 'Download arrow_drop_down' });
    this.copyToClipboardToast = this.page.locator('text=Text copied to clipboard');

  }

  async downloadAsMenu(typeOfFile?: string) {
    return await this.page.locator(`x-menuitem >> text=Download as ${typeOfFile}`);
  }

  async copyFromDownloadMenu(typeOfFile?: string) {
    return await this.page.locator(`x-menuitem >> text=Copy to Clipboard (${typeOfFile})`);
  }

}
