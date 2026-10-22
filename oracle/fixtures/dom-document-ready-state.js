// Concept: the document is loading while the Script runs and complete afterwards; currentScript is the Script.
console.log(document.readyState, document.currentScript.nodeName, document.body.firstElementChild.nodeName);
Promise.resolve().then(() => console.log('microtask', document.readyState));
setTimeout(() => console.log('timer', document.readyState, document.currentScript), 0);
console.log(window === globalThis, self === window, String(window), String(document), document.URL);
