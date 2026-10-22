// Concept: a rAF requested inside a rAF callback waits for the next frame; one frame shares one timestamp.
let first;
requestAnimationFrame((t) => {
  first = t;
  console.log('a');
  requestAnimationFrame((t2) => console.log('nested, later frame:', t2 > first));
});
requestAnimationFrame((t) => console.log('b, same frame:', t === first));
