// Concept: importing a module that is already loaded still resolves in a task, and evaluates it once.
const url = 'data:text/javascript,console.log("evaluated once"); export default 1';
import(url).then(() => {
  const ping = new MessageChannel();
  ping.port1.onmessage = () => console.log('message');
  ping.port2.postMessage(0);
  import(url).then(() => console.log('imported again'));
  Promise.resolve().then(() => console.log('microtask'));
});
