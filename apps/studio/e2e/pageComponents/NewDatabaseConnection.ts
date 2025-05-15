import { Locator, Page } from '@playwright/test';

export class NewDatabaseConnection {
  private page: Page;
  newConnectionDropdown: Locator;
  userInputField: Locator;
  passwordInputField: Locator;
  defaultDatabaseInputField: Locator;
  testConnectionButton: Locator;
  connectButton: Locator;
  testConnectionPositiveToast: Locator;

  constructor(page: Page) {
    this.newConnectionDropdown = page.getByLabel('Connection Type');
    this.userInputField = page.locator('div').filter({ hasText: /^UserPasswordvisibility$/ }).locator('input[name="user"]');
    this.passwordInputField = page.locator('div').filter({ hasText: /^Passwordvisibility$/ }).getByRole('textbox');
    this.defaultDatabaseInputField = page.locator('div').filter({ hasText: /^Default Database$/ }).getByRole('textbox');
    this.testConnectionButton = page.getByRole('button', { name: 'Test' });
    this.connectButton = page.getByRole('button', { name: 'Connect' });
    this.testConnectionPositiveToast = page.getByText('Connection looks good!');
  }
}
