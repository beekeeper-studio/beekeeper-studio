import Vue from "vue"
import wrap from "@vue/web-component-wrapper"
import Component from "./SuperFormatter.vue"
import { PropsToType, VueWrapper } from "../utilTypes"
import props from "./props"
import { SuperFormatterEventMap } from "./types"

export * from "./types"

export interface SuperFormatterElement
  extends PropsToType<typeof props>,
    VueWrapper<SuperFormatterElement, SuperFormatterEventMap> {}

// @ts-ignore - Third param is valid in our fork
export const SuperFormatterElement = wrap(Vue, Component, {
  disableShadowDom: true
}) as unknown as SuperFormatterElement