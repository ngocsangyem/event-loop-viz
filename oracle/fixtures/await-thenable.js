// Concept: await thenable. Source: docs/research/event-loop-semantics.md §4.3 (2 ticks).
const p = Promise.resolve();
(async () => { await { then(resolve) { resolve(1); } }; console.log('await thenable'); })();
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3'));
