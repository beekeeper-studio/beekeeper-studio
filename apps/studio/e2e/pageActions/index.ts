import { userActions as newDatabaseConnectionActions } from './newDatabaseConnectionActions';
import { userActions as queryTabActions } from './queryTabActions';

export const userActions = (page) => {
    return {
        ...newDatabaseConnectionActions(page),
        ...queryTabActions(page)
    };
};
