import { Page } from "@playwright/test";
import { NewDatabaseConnection } from "../pageComponents/NewDatabaseConnection";
import { QueryTab } from "../pageComponents/QueryTab";
import { Footer } from "../pageComponents/Footer";
import { QueryResultPane } from "../pageComponents/QueryResultPane";
import { TablesSideBar } from "../pageComponents/TablesSideBar";
import { SideBarToggle } from "../pageComponents/SideBarToggle";
import { ServerMigration } from "../pageComponents/ServerMigration";
import { selectNewConnection } from "./newDatabaseConnectionActions/selectNewConnection";
import { insertDatabaseDetails } from "./newDatabaseConnectionActions/insertDatabaseDetails";
import { testDatabaseConnection } from "./newDatabaseConnectionActions/testDatabaseConnection";
import { connectWithDatabase } from "./newDatabaseConnectionActions/connectWithDatabase";
import { openNewTab } from "./queryTabActions/openNewTab";
import { writeAQuery } from "./queryTabActions/writeAQuery";
import { runQuery } from "./queryTabActions/runQuery";
import { clickOnDownloadMenu } from "./footerActions/clickOnDownloadMenu";
import { clickOnDownloadOption } from "./footerActions/clickOnDownloadOption";
import { downloadFileAs } from "./footerActions/downloadFileAs";
import { clickOnCopyToClipboardOption } from "./footerActions/clickOnCopyToClipboardOption";
import { clickOnFirstColumnHeader } from "./resultPanelActions/clickOnFirstColumnHeader";
import { expandTableOnSideBar } from "./tableSideBarActions/expandTableOnSideBar";
import { toggleLeftSideBar } from "./toggleSideBarActions/toggleLeftSideBar";
import { toggleRightSideBar } from "./toggleSideBarActions/toggleRightSideBar";
import { 
  openMigrationTab, 
  configureMigration, 
  selectAllTables,
  deselectAllTables,
  selectSpecificTables,
  proceedToReview,
  reviewAndStart,
  waitForCompletion,
  cancelMigration,
  closeMigration,
  type MigrationConfig
} from "./serverMigrationActions";

export const userActions = (page: Page) => {
  const newDatabaseConnection = new NewDatabaseConnection(page);
  const queryTab = new QueryTab(page);
  const footer = new Footer(page);
  const queryResultPane = new QueryResultPane(page);
  const tablesSideBar = new TablesSideBar(page);
  const sideBarToggle = new SideBarToggle(page);
  const serverMigration = new ServerMigration(page);

  return {
    selectNewConnection: (connectionType: string) => selectNewConnection(newDatabaseConnection, connectionType),
    insertDatabaseDetails: (data: any) => insertDatabaseDetails(newDatabaseConnection, data),
    testDatabaseConnection: () => testDatabaseConnection(newDatabaseConnection),
    connectWithDatabase: () => connectWithDatabase(newDatabaseConnection),
    openNewTab: () => openNewTab(queryTab),
    writeAQuery: (query: string, tabNumber?: string) => writeAQuery(queryTab, query, tabNumber),
    runQuery: (tabNumber?: string) => runQuery(queryTab, tabNumber),
    clickOnDownloadMenu: () => clickOnDownloadMenu(footer),
    clickOnDownloadOption: (option: string) => clickOnDownloadOption(footer, option),
    downloadFileAs: (fileName: string) => downloadFileAs(footer, fileName),
    clickOnCopyToClipboardOption: () => clickOnCopyToClipboardOption(footer),
    clickOnFirstColumnHeader: () => clickOnFirstColumnHeader(queryResultPane),
    expandTableOnSideBar: (tableName: string) => expandTableOnSideBar(tablesSideBar, tableName),
    toggleLeftSideBar: () => toggleLeftSideBar(sideBarToggle),
    toggleRightSideBar: () => toggleRightSideBar(sideBarToggle),
    
    // Server Migration actions
    openMigrationTab: () => openMigrationTab(page),
    configureMigration: (config: MigrationConfig) => configureMigration(serverMigration, config),
    selectAllTables: () => selectAllTables(serverMigration),
    deselectAllTables: () => deselectAllTables(serverMigration),
    selectSpecificTables: (tables: string[]) => selectSpecificTables(serverMigration, tables),
    proceedToReview: () => proceedToReview(serverMigration),
    reviewAndStart: () => reviewAndStart(serverMigration),
    waitForMigrationCompletion: () => waitForCompletion(serverMigration),
    cancelMigration: () => cancelMigration(serverMigration),
    closeMigration: () => closeMigration(serverMigration),
  };
};
