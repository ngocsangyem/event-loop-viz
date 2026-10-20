// Concept: checkpoint drains nested microtasks. Source: docs/research/event-loop-semantics.md §4.11.
Promise.resolve().then(() => { console.log('p1'); Promise.resolve().then(() => console.log('p1-child')); });
Promise.resolve().then(() => console.log('p2'));
setTimeout(() => console.log('timeout'), 0);
