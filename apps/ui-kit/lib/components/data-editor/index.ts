import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./DataEditor.vue";
import { props, exposeMethods, ExposedMethods } from "./data-editor";
import { PropsToType } from "../types";

type DataEditorElement = HTMLElement &
  PropsToType<typeof props> &
  ExposedMethods;

export const DataEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as DataEditorElement;
