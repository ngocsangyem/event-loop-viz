// Concept: the Response of a data: URL.
fetch('data:application/json,{"answer":42}')
  .then((r) => { console.log(r.status, r.ok, r.statusText === '', r.type, r.headers.get('content-type'), r.bodyUsed); return r.json(); })
  .then((json) => console.log('json', json.answer));
fetch('data:text/plain;base64,aGVsbG8=').then((r) => r.text()).then((t) => console.log('base64', t));
fetch('data:,a%20b').then((r) => { console.log(r.headers.get('content-type')); return r.text(); }).then((t) => console.log(t));
