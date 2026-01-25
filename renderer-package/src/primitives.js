export var NoteType;
(function (NoteType) {
    NoteType["None"] = "0";
    NoteType["Don"] = "1";
    NoteType["Ka"] = "2";
    NoteType["DonBig"] = "3";
    NoteType["KaBig"] = "4";
    NoteType["Drumroll"] = "5";
    NoteType["DrumrollBig"] = "6";
    NoteType["Balloon"] = "7";
    NoteType["End"] = "8";
    NoteType["Kusudama"] = "9";
})(NoteType || (NoteType = {}));
export const JUDGEABLE_NOTES = [NoteType.Don, NoteType.Ka, NoteType.DonBig, NoteType.KaBig];
export const BIG_NOTES = [NoteType.DonBig, NoteType.KaBig, NoteType.DrumrollBig, NoteType.Kusudama];
export const RENDERABLE_NOTES = [
    NoteType.Don,
    NoteType.Ka,
    NoteType.DonBig,
    NoteType.KaBig,
    NoteType.Drumroll,
    NoteType.DrumrollBig,
    NoteType.Balloon,
    NoteType.End,
    NoteType.Kusudama,
];
export function isJudgeable(note) {
    return JUDGEABLE_NOTES.includes(note);
}
export function isBig(note) {
    return BIG_NOTES.includes(note);
}
export function isRenderable(note) {
    return RENDERABLE_NOTES.includes(note);
}
function serializeJudgementKey(key) {
    return `${key.char}_${key.ordinal}`;
}
function deserializeJudgementKey(key) {
    const [char, ordinalStr] = key.split("_");
    return { char, ordinal: parseInt(ordinalStr, 10) };
}
function serializeLocationKey(location) {
    return `${location.barIndex}_${location.charIndex}`;
}
function deserializeLocationKey(key) {
    const [barIndexStr, charIndexStr] = key.split("_");
    return {
        barIndex: parseInt(barIndexStr, 10),
        charIndex: parseInt(charIndexStr, 10),
    };
}
export class JudgementMap {
    _map = new Map();
    constructor(entries) {
        if (entries) {
            if (entries instanceof JudgementMap) {
                entries.forEach((v, k) => {
                    this.set(k, v);
                });
            }
            else {
                for (const [key, value] of entries) {
                    this.set(key, value);
                }
            }
        }
    }
    set(key, value) {
        this._map.set(serializeJudgementKey(key), value);
        return this;
    }
    get(key) {
        return this._map.get(serializeJudgementKey(key));
    }
    has(key) {
        return this._map.has(serializeJudgementKey(key));
    }
    delete(key) {
        return this._map.delete(serializeJudgementKey(key));
    }
    clear() {
        this._map.clear();
    }
    get size() {
        return this._map.size;
    }
    keys() {
        const internalKeys = this._map.keys();
        const generator = function* () {
            for (const k of internalKeys) {
                yield deserializeJudgementKey(k);
            }
        };
        return generator();
    }
    values() {
        return this._map.values();
    }
    entries() {
        const internalEntries = this._map.entries();
        const generator = function* () {
            for (const [k, v] of internalEntries) {
                yield [deserializeJudgementKey(k), v];
            }
        };
        return generator();
    }
    forEach(callbackfn, thisArg) {
        this._map.forEach((value, key) => {
            callbackfn.call(thisArg, value, deserializeJudgementKey(key), this);
        });
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}
export class LocationMap {
    _map = new Map();
    constructor(entries) {
        if (entries) {
            if (entries instanceof LocationMap) {
                entries.forEach((v, k) => {
                    this.set(k, v);
                });
            }
            else {
                for (const [key, value] of entries) {
                    this.set(key, value);
                }
            }
        }
    }
    set(key, value) {
        this._map.set(serializeLocationKey(key), value);
        return this;
    }
    get(key) {
        return this._map.get(serializeLocationKey(key));
    }
    has(key) {
        return this._map.has(serializeLocationKey(key));
    }
    delete(key) {
        return this._map.delete(serializeLocationKey(key));
    }
    clear() {
        this._map.clear();
    }
    get size() {
        return this._map.size;
    }
    keys() {
        const internalKeys = this._map.keys();
        const generator = function* () {
            for (const k of internalKeys) {
                yield deserializeLocationKey(k);
            }
        };
        return generator();
    }
    values() {
        return this._map.values();
    }
    entries() {
        const internalEntries = this._map.entries();
        const generator = function* () {
            for (const [k, v] of internalEntries) {
                yield [deserializeLocationKey(k), v];
            }
        };
        return generator();
    }
    forEach(callbackfn, thisArg) {
        this._map.forEach((value, key) => {
            callbackfn.call(thisArg, value, deserializeLocationKey(key), this);
        });
    }
    [Symbol.iterator]() {
        return this.entries();
    }
}
export const createJudgementKey = (char, ordinal) => ({ char, ordinal });
export const createNoteLocation = (barIndex, charIndex) => ({ barIndex, charIndex });
export function toNoteType(char) {
    switch (char) {
        case "1":
            return NoteType.Don;
        case "2":
            return NoteType.Ka;
        case "3":
            return NoteType.DonBig;
        case "4":
            return NoteType.KaBig;
        case "5":
            return NoteType.Drumroll;
        case "6":
            return NoteType.DrumrollBig;
        case "7":
            return NoteType.Balloon;
        case "8":
            return NoteType.End;
        case "9":
            return NoteType.Kusudama;
        default:
            return NoteType.None;
    }
}
