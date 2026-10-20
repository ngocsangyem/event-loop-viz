// Concept: await ignores patched then. Source: docs/research/event-loop-semantics.md §4.3; test262 await-monkey-patched-promise.js.
const p = Promise.resolve(1);
p.then = function () { console.log('patched then called'); return Promise.prototype.then.apply(this, arguments); };
(async () => { const v = await p; console.log('await got ' + v); })();
console.log('sync end');
