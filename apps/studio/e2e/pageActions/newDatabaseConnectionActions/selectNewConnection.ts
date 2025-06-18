import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const selectNewConnection = async (newDatabaseConnection: NewDatabaseConnection, connectionType: string): Promise<void> => {
    await newDatabaseConnection.newConnectionDropdown.click();
    await newDatabaseConnection.newConnectionDropdown.selectOption(connectionType);
}