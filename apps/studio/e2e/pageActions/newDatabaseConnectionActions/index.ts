import { NewDatabaseConnection } from '../../pageComponents/NewDatabaseConnection';
import { connectWithDatabase } from './connectWithDatabase';
import { insertDatabaseDetails } from './insertDatabaseDetails';
import { selectNewConnection } from './selectNewConnection';
import { testDatabaseConnection } from './testDatabaseConnection';

export const userActions = (page) => {
    const newDatabaseConnection = new NewDatabaseConnection(page);

    return {
        connectWithDatabase: () => connectWithDatabase(newDatabaseConnection),
        insertDatabaseDetails: (connectionObj) => insertDatabaseDetails(newDatabaseConnection, connectionObj),
        selectNewConnection: (connectionType) => selectNewConnection(newDatabaseConnection, connectionType),
        testDatabaseConnection: () => testDatabaseConnection(newDatabaseConnection)
    };
};
