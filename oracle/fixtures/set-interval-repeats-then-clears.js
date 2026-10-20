// Concept: set interval repeats then clears. Source: docs/research/event-loop-semantics.md §4.9 (interval re-arms each run).
let count = 0;
const id = setInterval(() => { count++; console.log('tick ' + count); if (count === 3) clearInterval(id); }, 10);
setTimeout(() => console.log('timeout 15'), 15);
