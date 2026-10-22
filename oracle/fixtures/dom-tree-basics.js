// Concept: building and querying a small DOM tree.
const list = document.createElement('ul');
for (const text of ['a', 'b']) {
  const item = document.createElement('li');
  item.textContent = text;
  item.className = 'item';
  list.appendChild(item);
}
document.body.appendChild(list);
list.id = 'list';
console.log(list.children.length, list.textContent, list.innerHTML);
console.log(document.querySelectorAll('.item').length, document.querySelector('li').textContent, document.getElementById('list') === list);
console.log(String(list), list.tagName, list.nodeName, document.body.contains(list), list.parentNode === document.body);
list.remove();
console.log(document.getElementById('list'), list.isConnected);
