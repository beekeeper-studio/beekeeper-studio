import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./ContextMenuRoot.vue";
import props from "./props";
import { PropsToType, VueWrapper } from "../utilTypes";
import { ContextMenuEventMap } from "./types";

export interface ContextMenuElement
  extends PropsToType<typeof props>,
    VueWrapper<ContextMenuElement, ContextMenuEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const ContextMenuElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods: [],
}) as unknown as ContextMenuElement;
