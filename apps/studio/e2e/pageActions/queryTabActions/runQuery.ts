import { QueryTab } from "../../pageComponents/QueryTab";

export const runQuery = async (queryTab: QueryTab, tabNumber?: string): Promise<void> => {
    await (await queryTab.tabRunQueryButton(tabNumber)).click();

};
