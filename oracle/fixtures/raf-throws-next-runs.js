// Concept: an exception in a rAF callback is reported and the next callback of the frame still runs.
requestAnimationFrame(() => { throw new Error('boom in raf'); });
requestAnimationFrame(() => console.log('next callback runs'));
