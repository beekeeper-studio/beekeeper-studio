import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./EntityList.vue";
import { props } from "./entity-list";
import { PropsToType } from "../types";

type EntityListElement = HTMLElement & PropsToType<typeof props>;

export const EntityListElement = wrap(Vue, Component, {
  disableShadowDom: true,
}) as unknown as EntityListElement;
