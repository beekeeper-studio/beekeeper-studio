import { PluginObject } from "vue";
import { driver as createDriver, DriveStep } from "driver.js";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";
import type store from "@/store";

type Context = {
  store: typeof store;
  utility: UtilityConnection;
};

type FlowId = "connectedScreen";

type FlowStep = DriveStep & {
  shouldShow: (context: Context) => boolean | Promise<boolean>;
  onFinished: (context: Context) => void | Promise<void>;
};

const flows: Record<
  FlowId,
  {
    steps: FlowStep[];
  }
> = {
  connectedScreen: {
    steps: [
      {
        element: "#add-tab-dropdown",
        popover: {
          title: `<div class="main-title"><i class="material-icons ai-shell-icon">auto_awesome</i> AI Shell</div><div class="subtitle">Included in your paid plan</div>`,
          description: `Use <b>AI Shell</b> from this menu to ask questions and generate queries.`,
          side: "bottom",
          showButtons: ["next"],
          doneBtnText: "Okay",
        },
        async shouldShow(context: Context) {
          if (context.store.getters.isCommunity) {
            return false;
          }

          const settings = context.store.getters["settings/settings"];
          if (settings["tabDropdownAIShellHintShown"]) {
            return false;
          }

          // Dont show it if the plugin is not in the dropdown menu (disabled or not installed)
          if (
            !context.store.getters["tabs/newTabDropdownItems"].find(
              (t) => t.config.pluginId === "bks-ai-shell"
            )
          ) {
            return false;
          }

          const tabs = await context.utility.send("appdb/tabs/find", {
            where: {
              connectionId: context.store.getters["connection/id"],
              workspaceId: context.store.getters["workspace/id"],
              pluginId: "bks-ai-shell",
            },
          });

          if (tabs.length > 0) {
            context.store.dispatch("settings/save", {
              key: "tabDropdownAIShellHintShown",
              value: new Date(),
            });
            return false;
          }

          return true;
        },
        onFinished(context) {
          context.store.dispatch("settings/save", {
            key: "tabDropdownAIShellHintShown",
            value: new Date(),
          });
        },
      },
    ],
  },
};

const tour = {
  async start(context: Context, flow: FlowId) {
    const allSteps = flows[flow].steps;
    const steps: FlowStep[] = [];
    const finishedSteps: FlowStep[] = [];

    for (const step of allSteps) {
      if (await step.shouldShow(context)) {
        steps.push(step);
      }
    }

    if (steps.length === 0) {
      return;
    }

    createDriver({
      steps,
      overlayOpacity: 0.4,
      onNextClick(_el, _step, { state, driver }) {
        const step = steps[state.activeIndex];
        step.onFinished(context);
        finishedSteps.push(step);
        driver.moveNext();
      },
      onDestroyStarted(_el, _step, { state, driver }) {
        // Finish the rest of the steps
        for (let i = state.activeIndex; i < steps.length; i++) {
          const step = steps[i];
          if (finishedSteps.includes(step)) {
            continue;
          }
          steps[i].onFinished(context);
        }
        driver.destroy();
      },
    }).drive();
  },
};

const ProductTourPlugin: PluginObject<Context> = {
  install(Vue, context) {
    Vue.prototype.$tour = tour;
    tour.start = tour.start.bind(tour, context);
  },
};

export default ProductTourPlugin;
