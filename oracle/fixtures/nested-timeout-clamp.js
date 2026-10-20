// Concept: nested timeout clamp. Source: docs/research/event-loop-semantics.md §4.9 (HTML timer nesting > 5 clamps to 4ms).
let n = 0;
function step() { n++; console.log('s' + n); if (n < 8) setTimeout(step, 0); }
setTimeout(step, 0);
setTimeout(() => console.log('t3'), 3);
