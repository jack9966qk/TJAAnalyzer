import { Fragment, JSXChildTypes, NonBooleanPrimitive, VNode } from "./types.js";
/**
 * Creates a virtual element representing a DOM node or Fragment.
 * @param type Element type (tag name) or Fragment
 * @param props Properties and attributes for the element
 * @param children Child elements or content
 * @returns Virtual element representation
 */
export declare function createElement(type: string | typeof Fragment, props: {
    [key: string]: unknown;
} | null, ...children: JSXChildTypes[]): VNode | VNode[];
export declare function createElementJSX(type: string | typeof Fragment, props: {
    [key: string]: unknown;
} | null, key?: NonBooleanPrimitive): VNode | VNode[];
