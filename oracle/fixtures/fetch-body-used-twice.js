// Concept: a body can be read once; a second read rejects at once.
fetch('data:,x').then((response) => {
  response.text();
  console.log('bodyUsed', response.bodyUsed);
  response.text().catch((e) => console.log('second read', e.message));
  Promise.resolve().then(() => console.log('microtask'));
});
