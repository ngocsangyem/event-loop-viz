// Concept: a message posted from inside a Job queues its Task after a 0 ms timer registered by the Script.
const ch = new MessageChannel();
ch.port1.onmessage = () => console.log('message');
setTimeout(() => console.log('timeout0'), 0);
Promise.resolve().then(() => {
  console.log('job');
  ch.port2.postMessage(null);
});
