import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./DataEditor.vue";

const CustomElement = wrap(Vue, Component, { disableShadowDom: true, exposeMethods: ["setTable"] }) as unknown as CustomElementConstructor;
window.customElements.define("bks-data-editor", CustomElement);
