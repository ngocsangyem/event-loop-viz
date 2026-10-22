// Concept: a module's exception is reported upon rejection of its evaluation, after the microtasks it queued.
// @oracle-module
export {};
Promise.resolve().then(() => console.log('microtask'));
throw new Error('module failed');
