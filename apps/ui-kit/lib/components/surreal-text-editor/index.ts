import Vue from "vue";
import Component from "./SurrealTextEditor.vue";
import { PropsToType, VueWrapper } from "../utilTypes";
import baseProps from "../text-editor/v2/props";
import props from "./props";
import { ExposedMethods } from "../text-editor";
import { SurrealTextEditorEventMap } from "./types";
import wrap from "@vue/web-component-wrapper";
import { exposeMethods } from "../text-editor/v2/TextEditor";

export interface SurrealTextEditorElement
  extends PropsToType<typeof baseProps>,
    PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<SurrealTextEditorElement, SurrealTextEditorEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const SurrealTextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods
});
