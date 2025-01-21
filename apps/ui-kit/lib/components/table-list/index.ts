import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TableList.vue";

export const TableList = wrap(Vue, Component, { disableShadowDom: true }) as unknown as CustomElementConstructor;
