// Concept: await non promise. Source: docs/research/event-loop-semantics.md §4.3 (1 tick).
const p = Promise.resolve();
p.then(() => console.log('tick 1')).then(() => console.log('tick 2'));
(async () => { await 42; console.log('await non-promise'); })();
