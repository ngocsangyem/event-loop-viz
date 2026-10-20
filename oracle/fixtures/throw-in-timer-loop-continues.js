// Concept: throw in timer loop continues. Source: ADR-0002 (uncaught exception in a Task is reported; the loop continues).
setTimeout(() => { console.log('t1'); throw new Error('timer-boom'); }, 0);
setTimeout(() => console.log('t2'), 0);
Promise.resolve().then(() => console.log('microtask'));
