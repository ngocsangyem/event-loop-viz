// Concept: unhandled rejection vs timer. Source: docs/research/event-loop-semantics.md §4.8 (notified after checkpoint, before a 50ms timer).
Promise.reject(new Error('x1'));
setTimeout(() => console.log('timer 50'), 50);
Promise.resolve().then(() => console.log('microtask'));
