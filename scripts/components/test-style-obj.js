import { jsx as _jsx } from "webjsx/jsx-runtime";
import * as webjsx from "webjsx";
export class TestStyleObj extends HTMLElement {
    connectedCallback() {
        const vdom = _jsx("div", { style: { color: "red", display: "flex" }, children: "Hello" });
        webjsx.applyDiff(this, vdom);
    }
}
customElements.define("test-style-obj", TestStyleObj);
