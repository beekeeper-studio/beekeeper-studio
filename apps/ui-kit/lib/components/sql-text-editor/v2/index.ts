import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./SqlTextEditor.vue";
import { SQLContextAnalyzer } from './SQLContextAnalyzer';

export const SqlTextEditor = wrap(Vue, Component, { disableShadowDom: true }) as unknown as CustomElementConstructor;
export { SQLContextAnalyzer };
