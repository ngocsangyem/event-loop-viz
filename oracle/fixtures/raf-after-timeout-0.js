// Concept: a 0 ms timer runs before the first rendering opportunity, whichever was scheduled first.
requestAnimationFrame(() => console.log('raf'));
setTimeout(() => console.log('timeout 0'), 0);
