import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./SqlTextEditor.vue";
import { PropsToType } from "../../types";
import baseProps from "../../text-editor/v2/props";
import props from "./props";
import { ExposedMethods } from "../../text-editor/v2/types";
import { exposeMethods } from "../../text-editor/v2/TextEditor";

type SqlTextEditorElement = HTMLElement &
  PropsToType<typeof baseProps> &
  PropsToType<typeof props> &
  ExposedMethods;

export const SqlTextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as SqlTextEditorElement;
