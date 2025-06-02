import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./Table.vue";
import { props, exposeMethods, ExposedMethods } from "./table";
import { PropsToType, VueWrapper } from "../utilTypes";
import { TableEventMap } from "./types";

export * from "./types";

export interface TableElement
  extends PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<TableElement, TableEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const TableElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods,
}) as unknown as TableElement;
