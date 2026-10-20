// Concept: rejection caught in same checkpoint. Source: docs/research/event-loop-semantics.md §4.8 (no unhandledrejection).
const p = Promise.reject(new Error('x3'));
Promise.resolve().then(() => p.catch(() => console.log('caught in microtask')));
