// Concept: async function throw unhandled. An async throw becomes an unhandled rejection.
async function f() { console.log('in f'); throw new Error('async-boom'); }
f();
console.log('after f');
