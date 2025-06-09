import { Locator, Page } from '@playwright/test';

export class TablesSideBar {
  private page: Page;
  resultFirstRow: Locator;
  resultSecondRow: Locator;
  resultThridRow: Locator;
  firstItemAndFirstColumn: Locator;
  noResults: Locator;
  firstColumnHeader: Locator;
  createTableResults: Locator;

  constructor(page: Page) {
    this.page = page;

    // probably there are better ways to do this but this is good enough for our tests
    this.resultFirstRow = this.page.getByRole('gridcell', { name: '1', exact: true }).first();
    this.resultSecondRow = this.page.getByRole('gridcell', { name: '2', exact: true }).first();
    this.resultThridRow = this.page.getByRole('gridcell', { name: '3', exact: true }).first();
    this.firstItemAndFirstColumn = this.page.getByRole('gridcell').nth(1);
    this.firstItemAndFirstColumn = this.page.getByRole('gridcell').nth(1);
    this.noResults = this.page.getByText('No Results');
    // right now it needs to be an id
    this.firstColumnHeader = this.page.getByRole('columnheader', { name: 'id' }).locator('div').nth(3);
    this.createTableResults = this.page.getByText('Query 1/1: No Results. 0 rows');
  }

  async tableSideBarButton(tableName): Promise<Locator> {
    return this.page.getByRole('button', { name: tableName });
  }

  async expandTableOnSideBarButton(tableName): Promise<Locator> {
    return this.page.locator('span.table-name.truncate', {
      hasText: tableName
    }).locator('xpath=ancestor::a//span[contains(@class, "open-close")]');
  }

  async columnInTable(columnName) {
    return await this.page.locator('#tab-tables').getByText(columnName, { exact: true });
  }

}
