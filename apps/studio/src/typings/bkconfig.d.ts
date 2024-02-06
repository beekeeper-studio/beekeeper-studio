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
        main: {
            addRow: string;
            cloneSelection: string;
            copySelection: string;
            deleteSelection: string;
            openInSqlEditor: string;
            openQuickSearch: string;
            pasteSelection: string;
            refresh: {
                "0": string;
                "1": string;
            };
            save: string;
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
            altOpen: string;
            altOpenInBackground: string;
            close: string;
            focusSearch: {
                "0": string;
                "1": string;
            };
            open: string;
            openInBackground: string;
            selectDown: {
                "0": string;
                "1": string;
            };
            selectUp: {
                "0": string;
                "1": string;
            };
        };
        tab: {
            closeTab: string;
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
        tableTable: {
            focusOnFilterInput: string;
            nextPage: string;
            previousPage: string;
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

