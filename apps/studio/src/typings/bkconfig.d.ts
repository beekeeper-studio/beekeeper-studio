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

