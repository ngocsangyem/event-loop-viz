// Concept: window.postMessage queues a task on the posted message source; an older 0 ms timer runs first.
addEventListener('message', (event) => console.log('message', event.data));
setTimeout(() => console.log('timeout 0'), 0);
postMessage('hi', '*');
