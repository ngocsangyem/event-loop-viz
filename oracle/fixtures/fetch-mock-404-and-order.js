// Concept: a 404 still resolves (ok is false); responses arrive in latency order, not call order.
// @fetch https://api.example.test/slow 200 120ms slow
// @fetch https://api.example.test/missing 404 20ms nope
fetch('https://api.example.test/slow').then((r) => r.text()).then((t) => console.log(t));
fetch('https://api.example.test/missing').then((r) => { console.log(r.status, r.ok, r.statusText); return r.text(); }).then((t) => console.log(t));
