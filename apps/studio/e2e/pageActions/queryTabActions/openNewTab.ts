import { QueryTab } from "../../pageComponents/QueryTab";

export const openNewTab = async (queryTab: QueryTab): Promise<void> => {
    await queryTab.openNewTabButton.click();
};
