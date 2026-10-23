import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'await-vs-then',
  panels: ['microtasks'],
  intro: {
    question: {
      en: 'An await and a chain of dot then calls: who prints first?',
      vi: 'Một await và một chuỗi chấm then: cái nào in ra trước?',
    },
    lines: [
      {
        say: {
          en: 'Here are two ways to wait for a promise that is already done. One is an async function with an await. The other is a promise followed by two dot then calls.',
          vi: 'Đây là hai cách chờ một promise đã xong sẵn. Một là async function có await. Hai là một promise nối tiếp hai lệnh chấm then.',
        },
      },
      {
        say: {
          en: 'The script prints three lines. Before we run it, guess the order, and think about who gets in line first.',
          vi: 'Script in ra ba dòng. Trước khi chạy, bạn hãy đoán thứ tự, và nghĩ xem ai xếp hàng trước.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. This is where JavaScript actually runs code, one frame at a time. The frame on top is the one running right now.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript thực sự chạy code, từng frame một. Frame trên cùng là đoạn code đang chạy ngay lúc này.',
      },
    },
    {
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks, and the code after an await, wait in the Microtask Queue, a line of small jobs that run first in, first out.',
        vi: 'Callback của promise, và phần code phía sau await, xếp hàng trong Microtask Queue, hàng đợi microtask. Đó là hàng các việc nhỏ chạy theo thứ tự vào trước, ra trước.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only gets a turn when the stack is empty. Then it runs every microtask, until the queue is empty.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ được lượt khi stack đã trống. Lúc đó nó chạy hết các microtask, cho tới khi hàng đợi trống.',
      },
      pause: 1.3,
    },
  ],
  steps: [
    {
      at: { k: 'task:begin' },
      focus: 'loop',
      say: {
        en: 'The whole script is itself a Task. The event loop takes it from the queue and starts running it.',
        vi: 'Bản thân cả đoạn script cũng là một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'f' } },
      focus: 'stack',
      note: { en: 'runs synchronously', vi: 'chạy đồng bộ' },
      say: {
        en: 'Line two calls the async function f. Its body starts running right away, on the same stack, like any normal function.',
        vi: 'Dòng hai gọi async function f. Thân hàm chạy ngay lập tức, trên cùng Call Stack, như một hàm bình thường.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Inside f, Promise dot resolve gives a promise that is already fulfilled. So the await has nothing to wait for. The rest of f is queued as a microtask right now.',
        vi: 'Trong f, Promise chấm resolve tạo ra một promise đã fulfilled sẵn. Nên await không phải chờ gì cả. Phần còn lại của f được xếp vào hàng đợi như một microtask ngay lúc này.',
      },
    },
    {
      at: { k: 'frame:pop', where: { label: 'f' } },
      focus: 'stack',
      note: { en: 'f pauses at await', vi: 'f dừng ở await' },
      say: {
        en: 'But the await still pauses f. Its frame leaves the stack, and control goes back to the script. Nothing has been printed yet.',
        vi: 'Nhưng await vẫn làm f tạm dừng. Frame của nó rời khỏi stack, và quyền điều khiển quay về script. Chưa có gì được in ra.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      note: { en: 'second in line', vi: 'đứng thứ hai' },
      say: {
        en: 'Line three. Another already fulfilled promise, and its first dot then. This callback goes into the Microtask Queue too, but behind the await. The await got in line first.',
        vi: 'Dòng ba. Lại một promise đã fulfilled sẵn, cùng với chấm then đầu tiên. Callback này cũng vào Microtask Queue, nhưng đứng sau await. Await đã xếp hàng trước.',
      },
    },
    {
      at: { k: 'frame:pop', where: { label: 'then' }, nth: 2 },
      focus: 'code',
      say: {
        en: 'The second dot then is attached to the promise that the first one returned. That promise is still pending, so nothing is queued for it yet.',
        vi: 'Chấm then thứ hai được gắn vào promise mà chấm then đầu tiên trả về. Promise đó vẫn đang pending, nên chưa có gì được xếp hàng cho nó.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task is finished, and the call stack is empty. Only now does the event loop get its turn.',
        vi: 'Task của script đã xong, Call Stack trống. Chỉ đến lúc này event loop mới tới lượt.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'checkpoint:begin' },
      focus: 'loop',
      say: {
        en: 'The event loop starts draining the Microtask Queue. It will not stop until the queue is empty.',
        vi: 'Event loop bắt đầu chạy hết Microtask Queue. Nó sẽ không dừng cho tới khi hàng đợi trống.',
      },
    },
    {
      at: { k: 'console', text: 'await' },
      focus: 'console',
      note: { en: 'first in, first out', vi: 'vào trước, ra trước' },
      say: {
        en: 'The first microtask is the rest of f. It resumes exactly where it paused, and prints await.',
        vi: 'Microtask đầu tiên là phần còn lại của f. Nó chạy tiếp đúng tại chỗ đã dừng, và in ra await.',
      },
    },
    {
      at: { k: 'console', text: 'then1' },
      focus: 'console',
      say: {
        en: 'f is done. Next in line is the first dot then callback. It prints then1.',
        vi: 'f chạy xong. Tiếp theo trong hàng là callback của chấm then đầu tiên. Nó in ra then1.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 3 },
      focus: 'microtasks',
      note: { en: 'queued only now', vi: 'đến giờ mới xếp hàng' },
      say: {
        en: 'Only now, because then1 has finished, the promise it returned is fulfilled. So the second dot then callback is queued. It could not be queued earlier.',
        vi: 'Đến lúc này, vì then1 đã chạy xong, promise mà nó trả về mới được fulfilled. Nên callback của chấm then thứ hai mới được xếp hàng. Nó không thể vào hàng sớm hơn.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'then2' },
      focus: 'console',
      say: {
        en: 'Microtasks queued during the drain run in the same drain. So then2 prints before the event loop leaves.',
        vi: 'Microtask được xếp hàng trong lúc đang chạy hết hàng đợi sẽ chạy ngay trong lượt đó. Nên then2 in ra trước khi event loop rời đi.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'The queue is empty and nothing else is waiting. The run is complete.',
        vi: 'Hàng đợi đã trống và không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'code',
      title: { en: 'await on a ready promise is one microtask', vi: 'await promise sẵn sàng là một microtask' },
      say: {
        en: 'Why this order? First: awaiting a native promise that is already fulfilled costs one microtask. That is the same cost as a dot then callback on it.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: await một promise gốc đã fulfilled tốn đúng một microtask. Cũng bằng chi phí của một callback chấm then trên nó.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Ties are broken by queue order', vi: 'Hòa nhau thì xét thứ tự xếp hàng' },
      say: {
        en: 'Second: when both are ready at the same moment, the one that queued first runs first. The await was reached before the first dot then, so it wins.',
        vi: 'Thứ hai: khi cả hai cùng sẵn sàng, cái nào xếp hàng trước thì chạy trước. Await được gặp trước chấm then đầu tiên, nên nó thắng.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'A chain moves one link per microtask', vi: 'Chuỗi then đi mỗi microtask một mắt xích' },
      say: {
        en: 'Third: each link of a dot then chain is queued only after the link before it finishes. That is why then2 comes after then1, even though both are written on the same line.',
        vi: 'Thứ ba: mỗi mắt xích của chuỗi chấm then chỉ được xếp hàng sau khi mắt xích trước nó chạy xong. Vì vậy then2 đến sau then1, dù cả hai viết trên cùng một dòng.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'One drain handles it all', vi: 'Một lượt chạy xử lý hết' },
      say: {
        en: 'And the event loop drains the Microtask Queue completely, including microtasks added along the way. So nothing here needs a second Task.',
        vi: 'Và event loop chạy hết Microtask Queue, kể cả các microtask được thêm vào giữa chừng. Nên ở đây không cần thêm Task nào nữa.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'An async function runs synchronously until its first await.',
        vi: 'Async function chạy đồng bộ cho tới await đầu tiên.',
      },
      {
        en: 'Awaiting a ready native promise costs one microtask, like a dot then callback.',
        vi: 'Await một promise gốc đã sẵn sàng tốn một microtask, giống một callback chấm then.',
      },
      {
        en: 'Microtasks run first in, first out, and a chain adds one link at a time.',
        vi: 'Microtask chạy vào trước ra trước, và một chuỗi then thêm từng mắt xích một.',
      },
    ],
    model: {
      en: 'Whoever queues first runs first',
      vi: 'Ai xếp hàng trước thì chạy trước',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: await, then1, and then2.',
          vi: 'Vậy thứ tự cuối cùng là: await, then1, và then2.',
        },
      },
      {
        say: {
          en: 'Keep this model: every microtask waits in one line, and the order of that line decides who prints first.',
          vi: 'Hãy giữ mô hình này: mọi microtask xếp trong một hàng, và thứ tự của hàng đó quyết định ai in ra trước.',
        },
        pause: 2,
      },
    ],
  },
})
