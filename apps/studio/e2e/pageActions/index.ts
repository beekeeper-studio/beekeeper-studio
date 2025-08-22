import { userActions as newDatabaseConnectionActions } from './newDatabaseConnectionActions';
import { userActions as queryTabActions } from './queryTabActions';
import { userActions as resultPaneActions } from './resultPanelActions';
import { userActions as tableSideBarActions } from './tableSideBarActions';
import { userActions as footerActions } from './footerActions';
export const userActions = (page) => {
    return {
        ...newDatabaseConnectionActions(page),
        ...queryTabActions(page),
        ...resultPaneActions(page),
        ...tableSideBarActions(page),
        ...footerActions(page)
    };
};
