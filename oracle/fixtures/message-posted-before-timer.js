// Concept: Tasks from different sources run in enqueue order. Message posted before the timer is registered.
const ch = new MessageChannel();
ch.port1.onmessage = () => console.log('message');
ch.port2.postMessage(null);
setTimeout(() => console.log('timeout0'), 0);
