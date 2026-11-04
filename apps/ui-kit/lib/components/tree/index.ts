import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./Tree.vue";
import props from "./props";
import { PropsToType, VueWrapper } from "../utilTypes";
import { TreeEventMap } from "./types";

export * from "./types";

export interface TreeElement
  extends PropsToType<typeof props>,
  VueWrapper<TreeElement, TreeEventMap> { }

// @ts-ignore - Third param is valid in our fork
export const TreeElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods: [],
}) as unknown as TreeElement;
