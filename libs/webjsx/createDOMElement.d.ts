import { VElement } from "./types.js";
/**
 * Creates a real DOM node from a virtual node representation.
 * @param velement Virtual node to convert
 * @param parentNamespaceURI Namespace URI from parent element, if any
 * @returns Created DOM node
 */
export declare function createDOMElement(velement: VElement, parentNamespaceURI?: string): Node;
