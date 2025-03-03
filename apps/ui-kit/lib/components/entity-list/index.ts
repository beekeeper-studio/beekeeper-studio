import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./EntityList.vue";

export const EntityList = wrap(Vue, Component, { disableShadowDom: true }) as unknown as CustomElementConstructor;
