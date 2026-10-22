// Concept: cancelAnimationFrame removes a callback, also one queued in the same frame by an earlier callback.
const dropped = requestAnimationFrame(() => console.log('never'));
cancelAnimationFrame(dropped);
let later;
requestAnimationFrame(() => { console.log('a'); cancelAnimationFrame(later); });
later = requestAnimationFrame(() => console.log('cancelled by a'));
requestAnimationFrame(() => console.log('c'));
console.log(typeof dropped, cancelAnimationFrame(12345));
