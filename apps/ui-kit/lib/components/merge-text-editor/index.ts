import Vue from "vue";
import Component from "./MergeTextEditor.vue";
import { PropsToType, VueWrapper } from "../utilTypes";
// import baseProps from "../text-editor/props";
import props from "./props";
// import { ExposedMethods } from "../text-editor";
// import { SurrealTextEditorEventMap } from "./types";
import wrap from "@vue/web-component-wrapper";
// import { exposeMethods } from "../text-editor/TextEditor";

export interface MergeTextEditorElement
  extends PropsToType<typeof props>,
    VueWrapper<MergeTextEditorElement, HTMLElementEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const MergeTextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  // exposeMethods
}) as unknown as MergeTextEditorElement;
