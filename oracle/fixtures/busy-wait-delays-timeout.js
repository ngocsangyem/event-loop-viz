// Concept: busy wait delays timeout. Source: ADR-0007 (executing code advances time; a blocking loop delays timers).
setTimeout(() => console.log('timeout 0'), 0);
const start = Date.now();
while (Date.now() - start < 20) {}
console.log('after busy wait');
Promise.resolve().then(() => console.log('microtask'));
