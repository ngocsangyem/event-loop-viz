// Concept: element.click() dispatches synchronously; microtasks run after the Script, not between listeners.
const button = document.createElement('button');
document.body.appendChild(button);
button.addEventListener('click', () => { console.log('C1'); Promise.resolve().then(() => console.log('C1 micro')); });
button.addEventListener('click', () => { console.log('C2'); Promise.resolve().then(() => console.log('C2 micro')); });
button.click();
console.log('after click');
