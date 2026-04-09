import { Locator, Page } from '@playwright/test';

export class EntityRelationshipDiagram {
  private page: Page;
  erdTabHeader: Locator;
  erdIframe: Locator;

  constructor(page: Page) {
    this.page = page;
    this.erdTabHeader = this.page.getByText('account_treeactor - ERD close');
    this.erdIframe = this.page.locator('iframe');
  }

  async getIframeContent() {
    return this.erdIframe.contentFrame();
  }

  async actorTableText(): Promise<Locator> {
    const frame = await this.getIframeContent();
    if (!frame) throw new Error('Could not access iframe content');
    return frame.getByText('actor', { exact: true });
  }

  async actorTableIcon(): Promise<Locator> {
    const frame = await this.getIframeContent();
    if (!frame) throw new Error('Could not access iframe content');
    return frame.getByText('grid_on actor');
  }

  async schemaText(): Promise<Locator> {
    const frame = await this.getIframeContent();
    if (!frame) throw new Error('Could not access iframe content');
    return frame.getByText('public', { exact: true });
  }
}
