import { PluginObject } from "vue";
import { driver as createDriver, DriveStep, PopoverDOM } from "driver.js";
import { UtilityConnection } from "@/lib/utility/UtilityConnection";
import type store from "@/store";

type Context = {
  store: typeof store;
  utility: UtilityConnection;
};

type FlowId = "ranQuerySuccessfully" | "startedEditingResult";

type FlowStep = DriveStep & {
  shouldShow?: (context: Context) => boolean | Promise<boolean>;
  onFinished?: (context: Context) => void | Promise<void>;
  onRender?: (popover: PopoverDOM, context: Context) => void;
};

const flows: Record<
  FlowId,
  {
    steps: FlowStep[];
  }
> = {
  /**
   * This is triggered after the user runs their first successful query.
   **/
  ranQuerySuccessfully: {
    steps: [
      {
        element: ".global-status-bar #edit-data-btn",
        popover: {
          title: `<div class="main-title"><i class="material-icons">edit</i> Edit Query Results</div>`,
          description: `Click <strong>Edit Data</strong> to change rows directly from your query results.`,
          side: "top",
          showButtons: ["next"],
          doneBtnText: "Okay",
        },
        shouldShow(context) {
          if (window.platformInfo.testMode) {
            return false;
          }

          if (context.store.state.usedConfig.readOnlyMode) {
            return false;
          }

          if (context.store.getters.isCommunity) {
            return false;
          }

          if (context.store.getters["settings/editResultsHintShown"]) {
            return false;
          }

          return true;
        },
        onFinished(context) {
          context.store.dispatch("settings/setEditResultsHintShown");
        },
      },
    ],
  },

  startedEditingResult: {
    steps: [
      {
        element: ".tab-pane.active .result-table .tabulator-tableholder",
        popover: {
          title: `<div class="main-title">Edit Cells</div>`,
          description: `Double-click a cell to change its value.`,
          side: "top",
          showButtons: ["next"],
          doneBtnText: "Okay",
        },
        shouldShow(context) {
          if (window.platformInfo.testMode) {
            return false;
          }

          if (context.store.getters.isCommunity) {
            return false;
          }

          if (context.store.getters["settings/startedEditingResult"]) {
            return false;
          }

          return true;
        },
        onFinished(context) {
          context.store.dispatch("settings/setStartedEditingResult");
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
        step.onFinished?.(context);
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
          steps[i].onFinished?.(context);
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
