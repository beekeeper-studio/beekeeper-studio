import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./DataEditor.vue";
import { props, exposeMethods, ExposedMethods } from "./data-editor";
import { PropsToType, VueWrapper } from "../utilTypes";
import { DataEditorEventMap } from "./types";

export * from "./types";

export interface DataEditorElement
  extends PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<DataEditorElement, DataEditorEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const DataEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as DataEditorElement;
