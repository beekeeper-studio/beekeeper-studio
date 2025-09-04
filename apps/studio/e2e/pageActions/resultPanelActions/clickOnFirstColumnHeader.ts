import { QueryResultPane } from "../../pageComponents/QueryResultPane";

export const clickOnFirstColumnHeader = async (resultPane: QueryResultPane): Promise<void> => {
    await resultPane.firstColumnHeader.click();
};
