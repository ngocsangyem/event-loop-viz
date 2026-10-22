// Concept: a network response (served by the // @fetch line) resolves after its latency; its body after one task.
// @fetch https://api.example.test/users 200 30ms {"name":"Ada"}
fetch('https://api.example.test/users').then((response) => {
  console.log(response.status, response.ok, response.statusText, response.type, response.url, response.headers.get('content-type'));
  const hops = new MessageChannel();
  let hop = 0;
  hops.port1.onmessage = () => { console.log('hop', ++hop); if (hop < 3) hops.port2.postMessage(0); };
  hops.port2.postMessage(0);
  return response.json();
}).then((user) => console.log('user', user.name));
Promise.resolve().then(() => console.log('microtask'));
