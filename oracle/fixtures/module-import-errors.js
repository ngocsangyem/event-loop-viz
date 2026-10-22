// Concept: import() of an unresolvable specifier rejects at once; a non-JavaScript data: URL fails to fetch.
import('lodash').catch((e) => console.log(e.name, e.message));
import('./local.js').catch((e) => console.log(e.name, e.message));
import('data:text/plain,export default 1').catch((e) => console.log(e.name, e.message));
Promise.resolve().then(() => console.log('m1'));
