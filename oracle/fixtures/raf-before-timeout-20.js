// Concept: a frame comes every 16.7 ms, so rAF runs before a 20 ms timer.
setTimeout(() => console.log('timeout 20'), 20);
requestAnimationFrame(() => console.log('raf'));
