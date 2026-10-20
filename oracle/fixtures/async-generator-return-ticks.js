// Concept: async generator return ticks. Source: docs/research/event-loop-semantics.md §4.7 (return awaits operand: 2 / 2 / 3 ticks).
const p = Promise.resolve();
(async function* () { return 1; })().next().then(() => console.log('return value'));
(async function* () { return Promise.resolve(1); })().next().then(() => console.log('return promise'));
(async function* () { return { then(res) { res(1); } }; })().next().then(() => console.log('return thenable'));
p.then(() => console.log('tick 1')).then(() => console.log('tick 2')).then(() => console.log('tick 3')).then(() => console.log('tick 4'));
