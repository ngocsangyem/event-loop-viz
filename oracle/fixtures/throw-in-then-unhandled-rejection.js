// Concept: throw in then unhandled rejection. Source: docs/research/event-loop-semantics.md §4.8.
Promise.resolve().then(() => { throw new Error('then-boom'); });
Promise.resolve().then(() => console.log('sibling microtask'));
