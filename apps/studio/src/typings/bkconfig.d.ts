declare interface IBkConfig {
    db: {
        postgres: {
            idleTimeout: number;
            timeout: number;
        };
    };
    export: {
        errorNoticeTimeout: number;
    };
    keybindings: {
        core: {
            quickSearch: string;
        };
        coreTabs: {
            nextTab: string;
            previousTab: string;
            switchTab1: string;
            switchTab2: string;
            switchTab3: string;
            switchTab4: string;
            switchTab5: string;
            switchTab6: string;
            switchTab7: string;
            switchTab8: string;
            switchTab9: string;
        };
        queryEditor: {
            copyResultSelection: string;
            selectEditor: string;
            selectNextResult: string;
            selectPreviousResult: string;
            submitCurrentQueryToFile: string;
            submitQueryToFile: string;
        };
        quickSearch: {
            altSubmit: string;
            closeSearch: string;
            openSearch: string;
            persistAltSubmit: string;
            persistSubmit: string;
            selectDown: string;
            selectUp: string;
            submit: string;
        };
        rowFilterBuilder: {
            focusOnInput: string;
        };
        tableBuilder: {
            addRow: string;
            copyToSql: string;
            create: string;
        };
        tablePartitions: {
            addRow: string;
            refresh: string;
            submitApply: string;
            submitSql: string;
        };
        tableRelations: {
            addRow: string;
            refresh: string;
            submitApply: string;
            submitSql: string;
        };
        tableTable: {
            addRow: string;
            cloneSelection: string;
            copySelection: string;
            copyToSql: string;
            deleteSelection: string;
            nextPage: string;
            pasteSelection: string;
            previousPage: string;
            refresh: string;
            saveChanges: string;
        };
    };
    process: {
        dataCheckInterval: number;
        updateCheckInterval: number;
        workspaceCheckInterval: number;
    };
    ui: {
        tableList: {
            itemHeight: number;
        };
        tableTable: {
            defaultColumnWidth: number;
            largeFieldWidth: number;
            maxColumnWidth: number;
            maxInitialWidth: number;
            minColumnWidth: number;
            pageSize: number;
        };
        tableTriggers: {
            maxColumnWidth: number;
        };
    };
};

