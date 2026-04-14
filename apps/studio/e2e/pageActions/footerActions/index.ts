import { Footer } from '../../pageComponents/Footer';
import { clickOnCopyToClipboardOption } from './clickOnCopyToClipboardOption';
import { clickOnDownloadOption } from './clickOnDownloadOption';
import { clickOnDownloadMenu } from './clickOnDownloadMenu';
import { downloadFileAs } from './downloadFileAs';

export const userActions = (page) => {
    const footer = new Footer(page);

    return {
        clickOnCopyToClipboardOption: (fileType) => clickOnCopyToClipboardOption(footer, fileType),
        clickOnDownloadOption: (fileType) => clickOnDownloadOption(footer, fileType),
        clickOnDownloadMenu: () => clickOnDownloadMenu(footer),
        downloadFileAs: (fileType) => downloadFileAs(footer, fileType)
    };
};
