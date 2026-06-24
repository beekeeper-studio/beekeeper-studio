import Vue from "vue";
import Component from "./MergeTextEditor.vue";
import { PropsToType, VueWrapper } from "../utilTypes";
import props from "./props";
import wrap from "@vue/web-component-wrapper";

export interface MergeTextEditorElement
  extends PropsToType<typeof props>,
    VueWrapper<MergeTextEditorElement, HTMLElementEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const MergeTextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
}) as unknown as MergeTextEditorElement;
