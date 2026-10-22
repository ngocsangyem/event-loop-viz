// Concept: Atomics.notify wakes an Atomics.waitAsync in a task queued at the notify.
// @oracle-isolated
const cell = new Int32Array(new SharedArrayBuffer(8));
const result = Atomics.waitAsync(cell, 0, 0);
console.log(result.async, typeof result.value.then);
result.value.then((value) => console.log('woke', value));
Promise.resolve().then(() => console.log('microtask'));
setTimeout(() => {
  console.log('notified', Atomics.notify(cell, 0));
  Promise.resolve().then(() => console.log('microtask after notify'));
}, 0);
setTimeout(() => console.log('timeout queued before the notify'), 0);
console.log(Atomics.waitAsync(cell, 0, 1).value, Atomics.waitAsync(cell, 0, 0, 0).value);
