// Concept: resolve thenable getter is sync. Source: docs/research/event-loop-semantics.md §4.5.
new Promise((resolve) => resolve({ get then() { console.log('then getter'); return (res) => res(1); } }));
console.log('after resolve');
