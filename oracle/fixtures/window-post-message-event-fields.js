// Concept: the MessageEvent of window.postMessage on about:blank.
addEventListener('message', (e) => {
  console.log(e.constructor.name, e.type, e.origin, e.source === window, e.ports.length, e.isTrusted, e.lastEventId === '');
});
postMessage({ a: 1 }, '*');
