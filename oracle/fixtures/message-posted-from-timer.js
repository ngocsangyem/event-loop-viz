// Concept: a message posted from a timer callback queues behind timers that were already waiting.
const ch = new MessageChannel();
ch.port1.onmessage = () => console.log('message');
setTimeout(() => {
  console.log('timeout-a');
  ch.port2.postMessage(null);
}, 0);
setTimeout(() => console.log('timeout-b'), 0);
