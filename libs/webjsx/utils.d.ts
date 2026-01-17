import { ElementProps, JSXChildTypes, NonBooleanPrimitive, Ref, VElement, VNode } from "./types.js";
/**
 * Flattens nested virtual nodes by replacing Fragments with their children.
 * @param vnodes Virtual nodes to flatten
 * @returns Array of flattened virtual nodes
 */
export declare function flattenVNodes(vnodes: JSXChildTypes, result?: VNode[]): VNode[];
export declare function isValidVNode(vnode: VNode | boolean | null | undefined): vnode is VNode;
export declare function getChildNodes(parent: Node): Node[];
/**
 * Assigns a ref to a DOM node.
 * @param node Target DOM node
 * @param ref Reference to assign (function or object with current property)
 */
export declare function assignRef(node: Node, ref: Ref): void;
export declare function isVElement(vnode: VNode): vnode is VElement;
export declare function isNonBooleanPrimitive(vnode: VNode): vnode is NonBooleanPrimitive;
export declare function getNamespaceURI(node: Node): string | undefined;
export declare function setWebJSXProps(element: Element | ShadowRoot, props: ElementProps): void;
export declare function getWebJSXProps(element: Element | ShadowRoot): ElementProps;
export declare function setWebJSXChildNodeCache(element: Element | ShadowRoot, childNodes: Node[]): void;
export declare function getWebJSXChildNodeCache(element: Element | ShadowRoot): Node[] | undefined;
