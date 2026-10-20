// Concept: throw in queue microtask. Source: docs/research/event-loop-semantics.md §4.8 (report the exception, checkpoint continues).
queueMicrotask(() => { console.log('m1'); throw new Error('boom'); });
queueMicrotask(() => console.log('m2'));
Promise.resolve().then(() => console.log('m3'));
