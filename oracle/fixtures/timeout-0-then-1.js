// Concept: timeout 0 then 1. Source: docs/research/event-loop-semantics.md §4.9.
setTimeout(() => console.log('t0'), 0);
setTimeout(() => console.log('t1'), 1);
