import { clickOnFirstColumnHeader } from './clickOnFirstColumnHeader';
import { QueryResultPane } from "../../pageComponents/QueryResultPane";

export const userActions = (page) => {
    const resultPane = new QueryResultPane(page);

    return {
        clickOnFirstColumnHeader: () => clickOnFirstColumnHeader(resultPane)
    };
};
