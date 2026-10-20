# Executing code advances the Virtual Clock by a fixed cost per evaluated node

Each AST node evaluation advances the Virtual Clock by 1 µs. The cost is configurable and recorded in the Trace header. This lets classic Scripts work:
- busy-waits such as `while (Date.now() - t < 100) {}` terminate
- "a long loop delays `setTimeout(0)`" demos behave as they do in a browser

Zero-cost execution was rejected because it turns every busy-wait into a Budget Halt. The trade-off: when a timer's due time falls near a compute boundary, the ordering can differ from the Oracle, because real Chrome runs faster or slower than 1 µs per node. Such Runs carry a "timing-sensitive" badge (due time within ±2 ms of a compute boundary). The differential corpus excludes them.
