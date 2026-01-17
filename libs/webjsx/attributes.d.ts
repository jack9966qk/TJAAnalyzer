/**
 * Sets initial attributes and properties on a DOM element.
 * @param el Target element
 * @param props Properties to apply
 */
export declare function setAttributes(el: Element, props: {
    [key: string]: unknown;
}): void;
/**
 * Updates existing attributes and properties on a DOM element.
 * @param el Target element
 * @param newProps New properties to apply
 * @param oldProps Previous properties for comparison
 */
export declare function updateAttributes(el: Element, newProps: {
    [key: string]: unknown;
}, oldProps: {
    [key: string]: unknown;
}): void;
