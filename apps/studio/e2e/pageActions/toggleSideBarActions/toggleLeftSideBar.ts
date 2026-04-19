import { SideBarToggle } from "../../pageComponents/SideBarToggle";

export const toggleLeftSideBar = async (sideBarToggle: SideBarToggle): Promise<void> => {
    const toggleSideBar = await sideBarToggle.leftSideBarToggle();
    console.log('EITTAA', toggleSideBar)
    await toggleSideBar.click();
};
