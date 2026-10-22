// Concept: reading a data: body resolves after two more task hops, counted with a MessageChannel ping-pong.
fetch('data:,hello').then((response) => {
  const hops = new MessageChannel();
  let hop = 0;
  hops.port1.onmessage = () => { console.log('hop', ++hop); if (hop < 4) hops.port2.postMessage(0); };
  hops.port2.postMessage(0);
  response.text().then((text) => console.log('text', text));
});
