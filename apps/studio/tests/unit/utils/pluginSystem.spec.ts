import { ManifestV0 } from "@/services/plugin";
import { mapViewsAndMenuFromV0ToV1 } from "@/services/plugin/utils";

const manifestV0: ManifestV0 = {
  id: "test-plugin",
  name: "Test Plugin",
  author: "qa",
  description: "for testing",
  version: "1.0.0",
  capabilities: {
    views: {
      tabTypes: [
        {
          id: "testTab",
          name: "testTab",
          entry: "index.html",
          kind: "shell",
        },
      ],
    },
    menu: [],
  },
};

describe("Plugin System", () => {
  describe("Manifest V0 compatibility", () => {
    it("translates tabTypes to pluginViews", () => {
      const { views } = mapViewsAndMenuFromV0ToV1(manifestV0);
      expect(views).toStrictEqual([
        {
          id: "testTab",
          name: "testTab",
          entry: "index.html",
          type: "shell-tab",
        },
      ]);
    });

    it("creates newTabDropdown item if menu is not specified", () => {
      const { menu } = mapViewsAndMenuFromV0ToV1(manifestV0);
      expect(menu).toStrictEqual([
        {
          command: "testTab-new-tab-dropdown",
          name: "New Test Plugin",
          view: "testTab",
          placement: "newTabDropdown",
        },
      ]);
    });

    it("leaves menu as is if menu is specified", () => {
      const manifestV0WithMenu = {
        ...manifestV0,
        capabilities: {
          ...manifestV0.capabilities,
          menu: [
            {
              command: "testTab",
              name: "Test this query",
              view: "testTab",
              placement: "editor.query.context" as const,
            },
          ],
        },
      };
      const { menu } = mapViewsAndMenuFromV0ToV1(manifestV0WithMenu);
      expect(menu).toStrictEqual([
        {
          command: "testTab",
          name: "Test this query",
          view: "testTab",
          placement: "editor.query.context",
        },
      ]);
    });
  });
});
