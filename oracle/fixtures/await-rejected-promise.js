// Concept: await rejected promise. Source: docs/research/event-loop-semantics.md §4.3 (1 tick, throw completion).
const p = Promise.resolve();
(async () => {
  try { await Promise.reject(new Error('nope')); } catch (e) { console.log('caught ' + e.message); }
})();
p.then(() => console.log('tick 1')).then(() => console.log('tick 2'));
