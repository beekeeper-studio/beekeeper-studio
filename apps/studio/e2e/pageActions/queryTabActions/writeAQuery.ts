import { QueryTab } from "../../pageComponents/QueryTab";

export const writeAQuery = async (queryTab: QueryTab, queryString: string, tabNumber?: string): Promise<void> => {
    const currentTab = await queryTab.tabTextArea(tabNumber);
    await currentTab.fill(queryString);
};
