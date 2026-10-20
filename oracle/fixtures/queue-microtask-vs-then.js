// Concept: queue microtask vs then. Source: docs/research/event-loop-semantics.md §4.10.
queueMicrotask(() => console.log('qm1'));
Promise.resolve().then(() => console.log('then'));
queueMicrotask(() => console.log('qm2'));
