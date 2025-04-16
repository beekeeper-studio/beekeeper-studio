import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./Table.vue";
import { props, exposeMethods, ExposedMethods } from "./table";
import { PropsToType } from "../types";

export type TableElement = HTMLElement & PropsToType<typeof props> & ExposedMethods;

export const TableElement = wrap(Vue, Component, {
    disableShadowDom: true,
    exposeMethods,
}) as unknown as TableElement;
