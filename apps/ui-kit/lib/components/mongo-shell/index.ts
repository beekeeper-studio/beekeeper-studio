import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import { PropsToType, VueWrapper } from "../utilTypes"; 
import Component from "./MongoShell.vue";
import baseProps from "./props";
import { ExposedMethods } from "../text-editor/v2/types";
import { MongoShellEventMap } from "./types";
// idk if we care about this
import { exposeMethods } from "../text-editor/v2/TextEditor";


export interface MongoShellElement
  extends PropsToType<typeof baseProps>,
    // PropsToType<typeof props>,
    ExposedMethods,
    VueWrapper<MongoShellElement, MongoShellEventMap> {}
  
// @ts-ignore - Third param is valid in our fork
export const MongoShellElement = wrap(Vue, Component, {
  disableShadowDom: true,
  exposeMethods
}) as unknown as MongoShellElement;
