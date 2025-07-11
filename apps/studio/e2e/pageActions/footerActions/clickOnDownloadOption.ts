import { Footer } from "../../pageComponents/Footer";

export const clickOnDownloadOption = async (footer: Footer, fileType: string): Promise<void> => {
    await (await footer.copyFromDownloadMenu(fileType)).click();
};
