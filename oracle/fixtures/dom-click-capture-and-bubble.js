// Concept: a click travels capture (window first), target, then bubbles to body, document and window.
const button = document.createElement('button');
document.body.appendChild(button);
addEventListener('click', () => console.log('window capture'), true);
document.body.addEventListener('click', () => console.log('body'));
document.addEventListener('click', () => console.log('document'));
addEventListener('click', () => console.log('window'));
button.addEventListener('click', (e) => console.log('button', e.eventPhase, e.target === button, e.isTrusted, e.constructor.name));
button.click();
const detached = document.createElement('div');
detached.addEventListener('click', () => console.log('detached div'));
detached.click();
