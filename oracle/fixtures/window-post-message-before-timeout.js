// Concept: a message posted before a 0 ms timer is set runs first: the oldest queued task wins.
addEventListener('message', (event) => console.log('message', event.data));
postMessage('hi', '*');
setTimeout(() => console.log('timeout 0'), 0);
