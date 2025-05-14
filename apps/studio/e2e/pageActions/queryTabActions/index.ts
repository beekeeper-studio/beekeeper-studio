import { runQuery } from './runQuery';
import { writeAQuery } from './writeAQuery';
import { openNewTab } from './openNewTab';
import { QueryTab } from "../../pageComponents/QueryTab";

export const userActions = (page) => {
    const queryTab = new QueryTab(page);

    return {
        runQuery: (tabNumber?) => runQuery(queryTab, tabNumber),
        writeAQuery: (queryString, queryTabNumber?) => writeAQuery(queryTab, queryString, queryTabNumber),
        openNewTab: () => openNewTab(queryTab)
    };
};
