import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TextEditor.vue";

export const TextEditor = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods: ["ls"],
}) as unknown as CustomElementConstructor;
