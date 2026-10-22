// Concept: top-level await in a module continues in microtasks and tasks like an async function.
// @oracle-module
console.log('a');
setTimeout(() => console.log('timeout 0'));
await null;
console.log('b');
await new Promise((resolve) => setTimeout(resolve, 5));
console.log('c');
