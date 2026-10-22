// Concept: fetch rejects (it does not throw) on bad input, before older microtasks run.
fetch('/relative').catch((e) => console.log('rejected', e.name, e.message));
Promise.resolve().then(() => console.log('m1')).then(() => console.log('m2'));
const promise = fetch();
console.log(promise instanceof Promise);
promise.catch((e) => console.log(e.message));
