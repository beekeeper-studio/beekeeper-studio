import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./SqlTextEditor.vue";
import { PropsToType, VueWrapper } from "../../utilTypes";
import baseProps from "../../text-editor/v2/props";
import props from "./props";
import { ExposedMethods } from "../../text-editor/v2/types";
import { exposeMethods } from "../../text-editor/v2/TextEditor";
import { SqlTextEditorEventMap } from "./types";

export * from "./types";

export interface SqlTextEditorElement
  extends PropsToType<typeof baseProps>,
    PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<SqlTextEditorElement, SqlTextEditorEventMap> {}

export const SqlTextEditorElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as SqlTextEditorElement;
