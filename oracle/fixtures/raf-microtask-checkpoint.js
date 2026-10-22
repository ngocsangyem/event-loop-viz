// Concept: raf microtask checkpoint. Source: docs/research/event-loop-semantics.md §4.13.
requestAnimationFrame(() => { console.log('raf1'); Promise.resolve().then(() => console.log('raf1-micro')); });
requestAnimationFrame(() => console.log('raf2'));
