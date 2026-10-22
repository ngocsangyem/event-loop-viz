// Concept: a listener that throws inside dispatchEvent is reported; the next listener and the Script go on.
const target = new EventTarget();
target.addEventListener('x', () => { throw new Error('listener failed'); });
target.addEventListener('x', () => console.log('next listener'));
target.dispatchEvent(new Event('x'));
console.log('after dispatch');
