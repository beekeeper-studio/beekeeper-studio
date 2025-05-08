import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const insertDatabaseDetails = async (newDatabaseConnection: NewDatabaseConnection, connectionObject: object): Promise<void> => {
    const { databaseUser, databasePassword, defaultDatabase } = connectionObject;
    await newDatabaseConnection.userInputField.fill(databaseUser);
    await newDatabaseConnection.passwordInputField.fill(databasePassword);
    await newDatabaseConnection.defaultDatabaseInputField.fill(defaultDatabase);
};
