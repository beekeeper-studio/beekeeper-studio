import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./SqlTextEditor.vue";

export const SqlTextEditor = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods: ["ls"],
}) as unknown as CustomElementConstructor;
