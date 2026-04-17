import { SideBarToggle } from "../../pageComponents/SideBarToggle";

export const toggleLeftSideBar = async (sideBarToggle: SideBarToggle): Promise<void> => {
    (await sideBarToggle.leftSideBarToggle()).click();
};
