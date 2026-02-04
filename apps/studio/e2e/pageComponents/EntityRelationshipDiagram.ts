import { Locator, Page } from '@playwright/test';

export class EntityRelationshipDiagram {
  private page: Page;
  erdTab: Locator;
  erdCanvas: Locator;
  erdToolbar: Locator;

  constructor(page: Page) {
    this.page = page;

    // ERD plugin tab container
    this.erdTab = this.page.locator('[data-plugin-id="bks-er-diagram"]');

    // ERD canvas/diagram area
    this.erdCanvas = this.erdTab.locator('canvas, svg, .erd-diagram');

    // ERD toolbar/controls
    this.erdToolbar = this.erdTab.locator('.toolbar, .controls');
  }

  async erdTabHeader(tabName?: string): Promise<Locator> {
    const name = tabName || 'ER Diagram';
    return this.page.getByRole('tab', { name });
  }

  async isErdTabVisible(): Promise<boolean> {
    return await this.erdTab.isVisible();
  }
}
