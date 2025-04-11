import { runQuery } from './runQuery';
import { writeAQuery } from './writeAQuery';
import { QueryTab } from "../../pageComponents/QueryTab";

export const userActions = (page) => {
    const queryTab = new QueryTab(page);

    return {
        runQuery: () => runQuery(queryTab),
        writeAQuery: (queryString) => writeAQuery(queryTab, queryString)
    };
};
