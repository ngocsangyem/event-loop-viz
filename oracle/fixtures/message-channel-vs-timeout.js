// Concept: message channel vs timeout. Source: docs/research/event-loop-semantics.md §4.12.
// @oracle-skip: MessageChannel is out of v1 scope (ADR-0006)
const ch = new MessageChannel();
ch.port1.onmessage = () => console.log('message');
setTimeout(() => console.log('timeout0'), 0);
ch.port2.postMessage(null);
