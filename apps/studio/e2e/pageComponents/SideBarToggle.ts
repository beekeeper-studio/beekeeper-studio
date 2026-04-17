import { Locator, Page } from '@playwright/test';

export class SideBarToggle {
  private page: Page;
  rightSideBarButton: Locator;
  leftSideBarButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.rightSideBarButton = this.page.getByRole('button', { name: 'dock_to_right' });
    this.leftSideBarButton = this.page.getByRole('button', { name: 'dock_to_left' });
  }

  async rightSideBarToggle() {
    return await this.rightSideBarButton;
  }

  async leftSideBarToggle() {
    return await this.leftSideBarButton;
  }
}
