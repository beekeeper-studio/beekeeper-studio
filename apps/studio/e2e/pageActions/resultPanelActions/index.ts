import { clickOnFirstColumnHeader } from './clickOnFirstColumnHeader';
import { clickFirstResultRow } from './clickFirstResultRow';
import { QueryResultPane } from "../../pageComponents/QueryResultPane";

export const userActions = (page) => {
    const resultPane = new QueryResultPane(page);

    return {
        clickOnFirstColumnHeader: () => clickOnFirstColumnHeader(resultPane),
        clickFirstResultRow: () => clickFirstResultRow(resultPane)
    };
};
