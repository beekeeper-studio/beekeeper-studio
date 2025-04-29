import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./TextEditor.vue";
import { exposeMethods } from "./TextEditor";
import { PropsToType } from "../../types";
import props from "./props";
import { ExposedMethods } from "./types";

export * from "./types";

type TextEditorElement = HTMLElement &
  PropsToType<typeof props> &
  ExposedMethods;

export const TextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as TextEditorElement;
