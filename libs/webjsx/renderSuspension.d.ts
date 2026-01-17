export declare function definesRenderSuspension(el: Element): boolean;
/**
 * Executes a callback with render suspension handling.
 * @param el Element that may have render suspension
 * @param callback Function to execute during suspension
 * @returns Result of the callback
 */
export declare function withRenderSuspension<T>(el: Element, callback: () => T): T;
