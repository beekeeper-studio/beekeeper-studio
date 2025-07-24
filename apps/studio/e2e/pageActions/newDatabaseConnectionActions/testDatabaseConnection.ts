import { Page } from '@playwright/test';
import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const testDatabaseConnection = async (newDatabaseConnection: NewDatabaseConnection): Promise<void> => {
    await newDatabaseConnection.testConnectionButton.click();
}
