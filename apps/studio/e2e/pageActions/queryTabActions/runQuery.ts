import { QueryTab } from "../../pageComponents/QueryTab";

export const runQuery = async (queryTab: QueryTab): Promise<void> => {
    await queryTab.runQueryButton.click();
};
