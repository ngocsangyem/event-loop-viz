// Concept: rejection handled later. Source: docs/research/event-loop-semantics.md §4.8 (handler attached in a later timer).
const p = Promise.reject(new Error('x2'));
setTimeout(() => { p.catch(() => {}); console.log('attached'); }, 10);
