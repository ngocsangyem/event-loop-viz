// Concept: when the event loop fires an event, a microtask checkpoint runs after each listener.
addEventListener('message', () => { console.log('L1'); Promise.resolve().then(() => console.log('L1 micro')); });
addEventListener('message', () => { console.log('L2'); Promise.resolve().then(() => console.log('L2 micro')); });
postMessage(0, '*');
