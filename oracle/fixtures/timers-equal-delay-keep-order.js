// Concept: timers equal delay keep order. Source: docs/research/event-loop-semantics.md §4.9.
setTimeout(() => console.log('A10'), 10);
setTimeout(() => console.log('B10'), 10);
setTimeout(() => console.log('C5'), 5);
