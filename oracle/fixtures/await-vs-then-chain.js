// Concept: await vs then chain. Source: docs/research/event-loop-semantics.md §4.2.
async function f() { await Promise.resolve(); console.log('await'); }
f();
Promise.resolve().then(() => console.log('then1')).then(() => console.log('then2'));
