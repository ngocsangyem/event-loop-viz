// Concept: a request that cannot reach a server rejects with TypeError: Failed to fetch.
fetch('https://unreachable.invalid/data').catch((e) => console.log(e.name, e.message));
