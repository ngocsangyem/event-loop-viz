// Concept: for await sync iterable of promises. Source: docs/research/event-loop-semantics.md §4.7 (first body at tick 2).
const p = Promise.resolve();
(async () => { for await (const v of [Promise.resolve('x'), 'y']) console.log('loop ' + v); })();
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3'));
