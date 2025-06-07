import { TablesSideBar } from "../../pageComponents/TablesSideBar";

export const expandTableOnSideBar = async (tableSideBar: TablesSideBar, tableName: string): Promise<void> => {
    const expandTableSideBarButton = await tableSideBar.expandTableOnSideBarButton(tableName);
    await expandTableSideBarButton.click();
};
