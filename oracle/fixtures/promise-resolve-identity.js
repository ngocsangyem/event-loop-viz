// Concept: promise resolve identity. Source: docs/research/event-loop-semantics.md §4.6.
const p = Promise.resolve(1);
console.log(Promise.resolve(p) === p);
console.log(new Promise((r) => r(p)) === p);
new Promise((r) => r(p)).then(() => console.log('new Promise(r => r(p))'));
Promise.resolve(p).then(() => console.log('Promise.resolve(p)'));
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3'));
