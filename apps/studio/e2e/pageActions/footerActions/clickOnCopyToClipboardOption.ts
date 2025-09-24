import { Footer } from "../../pageComponents/Footer";

export const clickOnCopyToClipboardOption = async (footer: Footer, fileType: string): Promise<void> => {
    return await (await footer.copyFromDownloadMenu(fileType)).click();
};
