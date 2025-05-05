import Vue from "vue";
import wrap from "@vue/web-component-wrapper";
import Component from "./EntityList.vue";
import { props } from "./entity-list";
import { PropsToType, VueWrapper } from "../utilTypes";
import { EntityListEventMap } from "./types";

export * from "./types";

export interface EntityListElement
  extends PropsToType<typeof props>,
    VueWrapper<EntityListElement, EntityListEventMap> {}

export const EntityListElement = wrap(Vue, Component, {
  disableShadowDom: true,
}) as unknown as EntityListElement;
