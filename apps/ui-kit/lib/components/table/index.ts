import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./Table.vue";

export const Table = wrap(Vue, Component, {
    disableShadowDom: true,
    exposeMethods: ["getTabulator"],
}) as unknown as CustomElementConstructor;
