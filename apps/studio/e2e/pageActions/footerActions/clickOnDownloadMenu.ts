import { Footer } from "../../pageComponents/Footer";

export const clickOnDownloadMenu = async (footer: Footer): Promise<void> => {
    await footer.downloadButton.click();
};
