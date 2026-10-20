// Concept: async return promise vs return await. Source: docs/research/event-loop-semantics.md §4.4 (3 vs 2 vs 1 ticks).
const p = Promise.resolve();
(async () => { return p; })().then(() => console.log('return promise'));
(async () => { return await p; })().then(() => console.log('return await promise'));
(async () => { return 1; })().then(() => console.log('return value'));
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3')).then(() => console.log('tick 4'));
