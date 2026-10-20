// Concept: for await async generator. Source: docs/research/event-loop-semantics.md §4.7.
async function* g() { console.log('g1'); yield 'a'; console.log('g2'); yield 'b'; }
(async () => { for await (const v of g()) console.log('loop ' + v); console.log('done'); })();
console.log('sync');
