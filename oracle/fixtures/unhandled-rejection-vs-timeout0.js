// Concept: unhandled rejection vs timeout0. Source: docs/research/event-loop-semantics.md §4.8 (Chrome: timeout0 before unhandledrejection).
Promise.resolve().then(() => { throw new Error('then-boom'); });
Promise.resolve().then(() => console.log('sibling microtask'));
setTimeout(() => console.log('timeout0'), 0);
