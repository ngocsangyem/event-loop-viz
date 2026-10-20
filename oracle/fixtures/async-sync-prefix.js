// Concept: async sync prefix. Source: docs/research/event-loop-semantics.md §4.1.
async function f() { console.log('f:1'); await null; console.log('f:2'); }
f();
console.log('after call');
