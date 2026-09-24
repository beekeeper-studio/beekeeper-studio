import { mount, createLocalVue } from "@vue/test-utils";
import Vue from "vue";
import { AppEvent, AppEventMixin } from "@/common/AppEvent";
import BaseModal from "@/components/common/modals/BaseModal.vue";
import ConfirmationModal from "@/components/common/modals/ConfirmationModal.vue";
import ConfirmationModalManager from "@/components/common/modals/ConfirmationModalManager.vue";
import { MODAL_CLOSE_EVENT } from "@/components/common/modals/utils";

// The app installs this globally in renderer.ts. Both the manager and the
// modal rely on `trigger` / `registerHandlers` from it.
Vue.mixin(AppEventMixin);

const MODAL_ID = "test-close-confirmation";

describe("ConfirmationModal.vue", () => {
  let wrapper;
  let modalMock;

  // Mirrors how CoreTabs uses this: the manager lives in App.vue, and the
  // <confirmation-modal> with a fixed id is declared in the consumer's
  // template. `$confirmById` then shows that existing modal by id.
  const Harness = {
    components: { ConfirmationModalManager, ConfirmationModal },
    template: `
      <div>
        <confirmation-modal-manager />
        <confirmation-modal :id="modalId" />
      </div>
    `,
    data() {
      return { modalId: MODAL_ID };
    },
  };

  function mountHarness() {
    modalMock = { show: jest.fn(), hide: jest.fn() };
    return mount(Harness, {
      localVue: createLocalVue(),
      // <modal> (vue-js-modal) and <portal> (portal-vue) are globally
      // registered in the app but not in the test environment.
      stubs: { modal: true, portal: true, "x-progressbar": true },
      mocks: { $modal: modalMock },
    });
  }

  // This is what `$confirmById` (BeekeeperPlugin) does.
  function confirmById(id: string): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      wrapper.vm.$root.$emit(AppEvent.showConfirmModal, {
        id,
        onConfirm: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }

  /** Resolves to `settled` if the promise settles, `pending` otherwise. */
  function settlesWith(promise: Promise<unknown>) {
    return Promise.race([
      promise.then((v) => ({ settled: true, value: v })),
      Promise.resolve().then(() => ({ settled: false, value: undefined })),
    ]);
  }

  beforeEach(() => {
    wrapper = mountHarness();
  });

  afterEach(() => {
    wrapper.destroy();
  });

  // The bug: dismissing the modal via the header ✕, Escape, or an overlay
  // click only calls `$modal.hide()`. Nothing fires MODAL_CLOSE_EVENT, so the
  // promise handed back by `$confirmById` never settles. In CoreTabs that
  // leaves `closingTab` pinned forever and every later tab close becomes a
  // silent no-op.
  it("settles a pending confirmation as cancelled when dismissed without a button", async () => {
    const pending = confirmById(MODAL_ID);
    await wrapper.vm.$nextTick();

    // vue-js-modal emits `closed` however the modal was dismissed, and
    // BaseModal forwards it.
    wrapper.findComponent(BaseModal).vm.$emit("closed");
    await wrapper.vm.$nextTick();

    await expect(settlesWith(pending)).resolves.toEqual({
      settled: true,
      value: false,
    });
  });

  it("resolves true when confirmed", async () => {
    const pending = confirmById(MODAL_ID);
    await wrapper.vm.$nextTick();

    wrapper.findComponent(ConfirmationModal).vm.confirm();
    await wrapper.vm.$nextTick();

    await expect(pending).resolves.toBe(true);
  });

  it("resolves false when cancelled", async () => {
    const pending = confirmById(MODAL_ID);
    await wrapper.vm.$nextTick();

    wrapper.findComponent(ConfirmationModal).vm.cancel();
    await wrapper.vm.$nextTick();

    await expect(pending).resolves.toBe(false);
  });

  // `confirm()` fires the event and then hides the modal, which makes
  // vue-js-modal emit `closed`. That must not report a second, contradictory
  // cancel for the same confirmation.
  it("does not report a cancel after confirming", async () => {
    const onConfirm = jest.fn();
    const onCancel = jest.fn();
    wrapper.vm.$root.$emit(AppEvent.showConfirmModal, {
      id: MODAL_ID,
      onConfirm,
      onCancel,
    });
    await wrapper.vm.$nextTick();

    wrapper.findComponent(ConfirmationModal).vm.confirm();
    wrapper.findComponent(BaseModal).vm.$emit("closed");
    await wrapper.vm.$nextTick();

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  // A second confirmation on the same modal id must work after the first one
  // was dismissed.
  it("can be reused after a dismissal", async () => {
    const first = confirmById(MODAL_ID);
    await wrapper.vm.$nextTick();
    wrapper.findComponent(BaseModal).vm.$emit("closed");
    await expect(first).resolves.toBe(false);

    const second = confirmById(MODAL_ID);
    await wrapper.vm.$nextTick();
    wrapper.findComponent(ConfirmationModal).vm.confirm();
    await expect(second).resolves.toBe(true);
  });

  it("ignores close events for modals it isn't tracking", async () => {
    expect(() => {
      wrapper.vm.$root.$emit(MODAL_CLOSE_EVENT, {
        modalId: "not-a-modal-we-know-about",
        confirmed: false,
      });
    }).not.toThrow();
  });
});
