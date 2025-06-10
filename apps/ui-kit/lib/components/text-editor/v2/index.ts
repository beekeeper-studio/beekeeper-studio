import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TextEditor.vue";
import { exposeMethods } from "./TextEditor";
import { PropsToType, VueWrapper } from "../../utilTypes";
import props from "./props";
import {
  ExposedMethods,
  TextEditorEventMap,
} from "./types";

export * from "./types";

export interface TextEditorElement
  extends PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<TextEditorElement, TextEditorEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const TextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as TextEditorElement;
