// Concept: element.onclick is a listener at the place it was set; setting null removes it.
const button = document.createElement('button');
button.onclick = () => console.log('onclick');
button.addEventListener('click', () => console.log('listener'));
button.click();
button.onclick = null;
button.click();
const off = document.createElement('button');
off.disabled = true;
off.addEventListener('click', () => console.log('never'));
off.click();
console.log('done');
