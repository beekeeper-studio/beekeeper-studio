import { Locator, Page } from '@playwright/test';

export class NewDatabaseConnection {
  private page: Page;
  newConnectionButton: Locator;
  connectionTypePickerNextButton: Locator;
  userInputField: Locator;
  passwordInputField: Locator;
  defaultDatabaseInputField: Locator;
  testConnectionButton: Locator;
  connectButton: Locator;
  testConnectionPositiveToast: Locator;
  portInputField: Locator;

  constructor(page: Page) {
    this.page = page;
    this.newConnectionButton = this.page.getByTestId('new-connection');
    this.connectionTypePickerNextButton = this.page.getByTestId('connection-type-picker-next');
    //this one feels wrong but works :(
    this.portInputField = this.page.locator('div').getByRole('spinbutton');
    this.userInputField = this.page.locator('div').filter({ hasText: /^UserPasswordvisibility$/ }).locator('input[type="text"]');
    this.passwordInputField = this.page.locator('div').filter({ hasText: /^Passwordvisibility$/ }).getByRole('textbox');
    this.defaultDatabaseInputField = this.page.locator('div').filter({ hasText: /^Default Database$/ }).getByRole('textbox');
    this.testConnectionButton = this.page.getByRole('button', { name: 'Test' });
    this.connectButton = this.page.getByRole('button', { name: 'Connect' });
    this.testConnectionPositiveToast = this.page.getByText('Connection looks good!');
  }

  connectionTypeOption(connectionType: string): Locator {
    return this.page.getByTestId(`connection-type-${connectionType}`);
  }
}
