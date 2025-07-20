import { NewDatabaseConnection } from "../../pageComponents/NewDatabaseConnection";

export const insertDatabaseDetails = async (newDatabaseConnection: NewDatabaseConnection, connectionObject: object): Promise<void> => {
    const { user, password, defaultDatabase, port } = connectionObject;
    await newDatabaseConnection.portInputField.fill(port);
    await newDatabaseConnection.userInputField.fill(user);
    await newDatabaseConnection.passwordInputField.fill(password);
    await newDatabaseConnection.defaultDatabaseInputField.fill(defaultDatabase);
};
