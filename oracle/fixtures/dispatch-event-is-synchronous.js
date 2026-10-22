// Concept: dispatchEvent runs listeners on the stack; their microtasks wait for the Script's checkpoint.
const target = new EventTarget();
target.addEventListener('ping', () => { console.log('A'); Promise.resolve().then(() => console.log('A micro')); });
target.addEventListener('ping', () => { console.log('B'); Promise.resolve().then(() => console.log('B micro')); });
console.log('before');
console.log('not cancelled:', target.dispatchEvent(new Event('ping')));
console.log('after');
