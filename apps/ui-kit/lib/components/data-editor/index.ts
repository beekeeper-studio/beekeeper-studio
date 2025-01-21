import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./DataEditor.vue";

export const DataEditor = wrap(Vue, Component, {
    disableShadowDom: true,
    exposeMethods: ["setTable"],
}) as unknown as CustomElementConstructor;
