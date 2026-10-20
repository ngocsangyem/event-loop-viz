// Concept: resolve with promise thenable value. Source: docs/research/event-loop-semantics.md §4.5 (3 / 2 / 1 ticks).
const p = Promise.resolve();
new Promise((r) => r(Promise.resolve())).then(() => console.log('resolve(promise)'));
new Promise((r) => r({ then(res) { res(); } })).then(() => console.log('resolve(thenable)'));
new Promise((r) => r(1)).then(() => console.log('resolve(value)'));
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3')).then(() => console.log('tick 4'));
