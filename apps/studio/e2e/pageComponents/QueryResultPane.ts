import { Locator, Page } from '@playwright/test';

export class QueryResultPane {
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
    this.resultFirstRow = page.getByRole('gridcell', { name: '1', exact: true }).first();
    this.resultSecondRow = page.getByRole('gridcell', { name: '2', exact: true }).first();
    this.resultThridRow = page.getByRole('gridcell', { name: '3', exact: true }).first();
    this.firstItemAndFirstColumn = page.getByRole('gridcell').nth(1);
    this.firstItemAndFirstColumn = page.getByRole('gridcell').nth(1);
    this.noResults = page.getByText('No Results');
    // right now it needs to be an id
    this.firstColumnHeader = page.getByRole('columnheader', { name: 'id' }).locator('div').nth(3);
    this.createTableResults = page.getByText('Query 1/1: No Results. 0 rows');
  }
}
