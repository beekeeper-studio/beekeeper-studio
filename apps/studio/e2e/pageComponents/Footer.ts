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
    return await this.page.locator('x-menuitem', { hasText: `Download as ${typeOfFile}` });
  }

  async copyFromDownloadMenu(typeOfFile?: string) {
    return await this.page.locator('x-menuitem', { hasText: `Copy to Clipboard (${typeOfFile})` });

  }

}
