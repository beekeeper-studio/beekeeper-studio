// actions/connectWithDatabase.ts
import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const connectWithDatabase = async (newDatabaseConnection: NewDatabaseConnection): Promise<void> => {
    await newDatabaseConnection.connectButton.click();
};
