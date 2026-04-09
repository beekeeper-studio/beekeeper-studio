import { QueryResultPane } from "../../pageComponents/QueryResultPane";

export const clickFirstResultRow = async (resultPane: QueryResultPane): Promise<void> => {
    await resultPane.resultFirstRow.click();
};
