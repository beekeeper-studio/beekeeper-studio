import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import { webComponentCustomElement } from "vite-plugin-vue-wc-styles/custom-element";
import Component from "./SqlTextEditor.vue";

if (import.meta.env.WEB_COMPONENTS) {
  const VueCustomElement = wrap(Vue, Component) as unknown as CustomElementConstructor;
  const CustomElement = webComponentCustomElement(VueCustomElement);

  window.customElements.define("bks-sql-text-editor", CustomElement);
}
