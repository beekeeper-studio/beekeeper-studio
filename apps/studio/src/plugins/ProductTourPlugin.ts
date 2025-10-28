import { PluginObject } from "vue";
import { driver as createDriver, DriveStep, PopoverDOM } from "driver.js";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";
import type store from "@/store";
import { DialectData } from "@/shared/lib/dialects/models";

type Context = {
  store: typeof store;
  utility: UtilityConnection;
};

type FlowId = "connectedScreen";

type FlowStep = DriveStep & {
  shouldShow: (context: Context) => boolean | Promise<boolean>;
  onFinished: (context: Context) => void | Promise<void>;
  onRender?: (popover: PopoverDOM, context: Context) => void;
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
        element: "#add-tab-group",
        popover: {
          title: `<div class="main-title"><i class="material-icons ai-shell-icon">auto_awesome</i> AI Shell</div><div class="subtitle">Included in your paid plan</div>`,
          description: `AI can explore your database and run <span class="token">SQL</span> to answer your questions. Integrates with your favorite LLM.`,
          side: "bottom",
          showButtons: ["next"],
          doneBtnText: "Okay",
        },
        onRender(popover, context) {
          const learnMore = document.createElement("a");
          learnMore.innerText = "Learn more";
          learnMore.classList.add("btn", "btn-flat");
          learnMore.href = "https://beekeeperstudio.io/features/sql-ai";
          popover.footerButtons.prepend(learnMore);
          const dialect: DialectData = context.store.getters.dialectData;
          if (dialect) {
            const token: HTMLSpanElement =
              popover.wrapper.querySelector(".token");
            token.innerText = dialect.sqlLabel;
          }
        },
        async shouldShow(context: Context) {
          if (context.store.getters.isCommunity) {
            return false;
          }

          if (context.store.getters.aiShellHintShown) {
            return false;
          }

          // Dont show it if the plugin is not in the dropdown menu (disabled or not installed)
          if (!context.store.getters.aiShellAvailable) {
            return false;
          }

          // Dont show it if the plugin is already open
          const tabCount = await context.utility.send("appdb/tabs/count", {
            where: { generatedPluginId: "bks-ai-shell" },
            withDeleted: true,
          });

          if (tabCount > 0) {
            context.store.dispatch("setAiShellHintShown");
            return false;
          }

          return true;
        },
        onFinished(context) {
          context.store.dispatch("setAiShellHintShown");
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
        steps.push({
          ...step,
          popover: {
            ...step.popover,
            onPopoverRender(popover) {
              popover.footerButtons
                .querySelector(".driver-popover-next-btn")
                .classList.add("btn", "btn-primary");

              if (typeof step.element === "string") {
                document.body.dataset.driverStepElement = step.element;
              } else if (document.body.dataset.driverStepElement) {
                delete document.body.dataset.driverStepElement;
              }

              step.onRender?.(popover, context);
            },
          },
        });
      }
    }

    if (steps.length === 0) {
      return;
    }

    createDriver({
      steps,
      overlayOpacity: 0.25,
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
        delete document.body.dataset.driverStepElement;
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
