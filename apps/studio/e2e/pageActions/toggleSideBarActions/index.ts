import { SideBarToggle } from "../../pageComponents/SideBarToggle";
import { toggleRightSideBar } from './toggleRightSideBar';
import { toggleLeftSideBar } from './toggleLeftSideBar';

export const userActions = (page) => {
    const sideBarToggle = new SideBarToggle(page);

    return {
        toggleRightSideBar: () => toggleRightSideBar(sideBarToggle),
        toggleLeftSideBar: () => toggleLeftSideBar(sideBarToggle),
    };
};
