// Concept: async function throw unhandled. Source: ADR-0002 (async throw becomes an unhandled rejection).
async function f() { console.log('in f'); throw new Error('async-boom'); }
f();
console.log('after f');
