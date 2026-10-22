// Concept: a module is strict, has no top-level this, keeps var out of the global object, and has import.meta.
// @oracle-module
var notGlobal = 1;
console.log(this === undefined, (function () { return this; })() === undefined, typeof globalThis.notGlobal, import.meta.url);
console.log(document.currentScript, document.readyState);
