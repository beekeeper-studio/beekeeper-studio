import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TableList.vue";

const CustomElement = wrap(Vue, Component, { disableShadowDom: true }) as unknown as CustomElementConstructor;
window.customElements.define("bks-table-list", CustomElement);
