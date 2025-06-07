import { TablesSideBar } from "../../pageComponents/TablesSideBar";
import { expandTableOnSideBar } from './expandTableOnSideBar';

export const userActions = (page) => {
    const tableSideBar = new TablesSideBar(page);

    return {
        expandTableOnSideBar: (tableName: string) => expandTableOnSideBar(tableSideBar, tableName)
    };
};
