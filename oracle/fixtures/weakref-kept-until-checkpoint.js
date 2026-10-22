// Concept: a WeakRef target created in a task stays alive until that task's microtask checkpoint ends.
let ref;
(function () { ref = new WeakRef({}); })();
Promise.resolve().then(() => { gc(); console.log('in microtask', ref.deref() !== undefined); });
setTimeout(() => { gc(); console.log('in a later task', ref.deref() !== undefined); });
