// Concept: timeout 1 then 0. Source: docs/research/event-loop-semantics.md §4.9 (Chrome: t0 before t1).
setTimeout(() => console.log('t1'), 1);
setTimeout(() => console.log('t0'), 0);
