import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const selectNewConnection = async (newDatabaseConnection: NewDatabaseConnection, connectionType: string): Promise<void> => {
    await newDatabaseConnection.newConnectionButton.click();
    await newDatabaseConnection.connectionTypeOption(connectionType).click();
    await newDatabaseConnection.connectionTypePickerNextButton.click();
}
