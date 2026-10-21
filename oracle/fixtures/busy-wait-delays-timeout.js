// Concept: busy wait delays timeout. Executing code advances time, so a blocking loop delays timers.
setTimeout(() => console.log('timeout 0'), 0);
const start = Date.now();
while (Date.now() - start < 20) {}
console.log('after busy wait');
Promise.resolve().then(() => console.log('microtask'));
