import { Fragment, NonBooleanPrimitive } from "./types.js";
export * from "./jsx.js";
export { Fragment };
/**
 * JSX transform factory function.
 * @param type Element type or component
 * @param props Element properties
 * @param key Optional key for element identification
 * @returns Virtual element
 */
export declare function jsx(type: string | typeof Fragment, props: {
    [key: string]: unknown;
} | null, key: NonBooleanPrimitive): import("./types.js").VNode | import("./types.js").VNode[];
/**
 * JSX transform factory for elements with multiple children.
 * Functionally identical to jsx() in this implementation.
 */
export declare function jsxs(type: string | typeof Fragment, props: {
    [key: string]: unknown;
} | null, key: NonBooleanPrimitive): import("./types.js").VNode | import("./types.js").VNode[];
/**
 * Development mode JSX transform factory.
 * Currently identical to jsx() in this implementation.
 */
export declare function jsxDEV(type: string | typeof Fragment, props: {
    [key: string]: unknown;
} | null, key: NonBooleanPrimitive): import("./types.js").VNode | import("./types.js").VNode[];
export declare const JSXFragment: (props: {
    children?: import("./types.js").JSXChildTypes;
}) => import("./types.js").VNode[];
