// Concept: window.onerror receives (message, source, lineno, colno, error).
onerror = (message, source, lineno, colno, error) => console.log('onerror', message, error.message, typeof lineno);
setTimeout(() => { throw new Error('boom'); }, 0);
