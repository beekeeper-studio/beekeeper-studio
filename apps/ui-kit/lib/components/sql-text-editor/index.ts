import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./SqlTextEditor.vue";
import { PropsToType } from "../types";
import { props } from "./sql-text-editor";
import mixin from "../text-editor/mixin";

export type SqlTextEditorElement = HTMLElement & PropsToType<typeof props> & PropsToType<typeof mixin['props']>;

export const SqlTextEditorElement = wrap(Vue, Component, { disableShadowDom: true }) as unknown as SqlTextEditorElement;
