import { QueryTab } from "../../pageComponents/QueryTab";

export const writeAQuery = async (queryTab: QueryTab, queryString: string): Promise<void> => {
    await queryTab.queryTabTextArea.fill(queryString);
};
