import { Locator, Page } from '@playwright/test';

export class EntityRelationshipDiagram {
  private page: Page;
  erdTab: Locator;
  erdIframe: Locator;
  erdCanvas: Locator;
  erdToolbar: Locator;

  constructor(page: Page) {
    this.page = page;

    // ERD plugin tab container (look for tab with "ERD" in the text)
    this.erdTab = this.page.locator('[id^="tab-"]').filter({ hasText: 'ERD' });

    // ERD iframe - the plugin content is loaded in an iframe
    this.erdIframe = this.erdTab.locator('iframe');

    // ERD canvas/diagram area (inside iframe)
    this.erdCanvas = this.erdTab.locator('canvas, svg, .erd-diagram');

    // ERD toolbar/controls
    this.erdToolbar = this.erdTab.locator('.toolbar, .controls');
  }

  async erdTabHeader(tabName?: string): Promise<Locator> {
    // The tab header shows text like "account_tree actor - ERD close"
    // We just need to find text containing "ERD"
    return this.page.getByText(/.*ERD.*close/, { exact: false });
  }

  async isErdTabVisible(): Promise<boolean> {
    return await this.erdTab.isVisible();
  }

  async isErdIframeLoaded(): Promise<boolean> {
    return await this.erdIframe.isVisible();
  }
}
