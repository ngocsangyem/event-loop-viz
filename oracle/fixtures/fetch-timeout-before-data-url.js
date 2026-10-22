// Concept: a 0 ms timer set before fetch runs before the response task.
setTimeout(() => console.log('timeout 0'), 0);
fetch('data:,hello').then(() => console.log('fetch resolved'));
