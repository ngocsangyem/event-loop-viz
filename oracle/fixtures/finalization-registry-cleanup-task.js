// Concept: gc() queues the cleanup as a task at once; it runs after the current task's microtasks.
const registry = new FinalizationRegistry((held) => {
  console.log('cleanup', held);
  Promise.resolve().then(() => console.log('cleanup microtask'));
});
(function () { registry.register({}, 'held value'); })();
setTimeout(() => {
  gc();
  console.log('after gc');
  Promise.resolve().then(() => console.log('microtask'));
  setTimeout(() => console.log('timeout 0'));
}, 0);
