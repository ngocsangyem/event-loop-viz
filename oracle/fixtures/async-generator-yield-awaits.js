// Concept: async generator yield awaits. Source: docs/research/event-loop-semantics.md §4.7.
async function* g() { console.log('g:start'); yield Promise.resolve('v'); console.log('g:after-yield'); }
const it = g();
console.log('call next');
it.next().then((r) => console.log('next resolved ' + r.value));
console.log('sync end');
