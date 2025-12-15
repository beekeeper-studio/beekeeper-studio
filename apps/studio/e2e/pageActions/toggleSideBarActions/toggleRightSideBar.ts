import { SideBarToggle } from "../../pageComponents/SideBarToggle";

export const toggleRightSideBar = async (sideBarToggle: SideBarToggle): Promise<void> => {
    (await sideBarToggle.leftSideBarToggle()).click();
};
