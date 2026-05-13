import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TreeList.vue";
import { props } from "./tree-list";
import { PropsToType, VueWrapper } from "../utilTypes";
import { TreeListEventMap } from "./types";

export * from "./types";

export interface TreeListElement
  extends PropsToType<typeof props>,
    VueWrapper<TreeListElement, TreeListEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const TreeListElement = wrap(Vue, Component, {
  disableShadowDom: true,
}) as unknown as TreeListElement;
