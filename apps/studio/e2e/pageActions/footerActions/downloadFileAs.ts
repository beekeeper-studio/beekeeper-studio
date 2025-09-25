import { Footer } from "../../pageComponents/Footer";

export const downloadFileAs = async (footer: Footer, fileType: string): Promise<void> => {
    await (await footer.downloadAsMenu(fileType)).click();
};
