// Concept: await native promise. Source: docs/research/event-loop-semantics.md §4.3 (1 tick).
const p = Promise.resolve();
(async () => { await p; console.log('await native promise'); })();
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3'));
