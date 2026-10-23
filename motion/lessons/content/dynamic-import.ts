import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'dynamic-import',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A module import, a promise chain and a zero millisecond timer… who goes first?',
      vi: 'Một lệnh import module, một chuỗi promise và một timer không mili giây… cái nào đi trước?',
    },
    lines: [
      {
        say: {
          en: 'This script calls import to load a module, starts a chain of three promise callbacks, and sets a zero millisecond timer.',
          vi: 'Đoạn script này gọi import để nạp một module, tạo một chuỗi ba callback của promise, và đặt một timer không mili giây.',
        },
      },
      {
        say: {
          en: 'Normally loading a module takes real network time. Here the module is inline, in a data URL, so there is nothing to download. Before we run it, guess the order of the six lines.',
          vi: 'Thường thì nạp module cần thời gian trên mạng. Ở đây module nằm ngay trong một data URL, nên không có gì để tải. Trước khi chạy, bạn hãy đoán thứ tự sáu dòng in ra.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. This is where JavaScript runs code, one frame at a time. The frame on top is the one running right now.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript chạy code, từng frame một. Frame trên cùng là đoạn code đang chạy ngay lúc này.',
      },
    },
    {
      focus: 'webApis',
      say: {
        en: 'Next, the Web APIs. They belong to the browser. Timers count down here, and so does the work of fetching a module.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Timer đếm giờ ở đây, và việc tải một module cũng diễn ra ở đây.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When that work is ready, a Task is queued in the Task Queue. In Chrome, timers and module loading end up in this one line.',
        vi: 'Khi việc đó sẵn sàng, một Task được xếp vào Task Queue, hàng đợi task. Trong Chrome, timer và việc nạp module cùng đi vào một hàng này.',
      },
    },
    {
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks wait in a different line: the Microtask Queue.',
        vi: 'Còn callback của promise thì xếp ở một hàng khác: Microtask Queue, hàng đợi microtask.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It only acts when the stack is empty. Then it runs every microtask, and only after that takes the next Task.',
        vi: 'Cuối cùng là Event Loop. Nó chỉ hành động khi stack đã trống. Lúc đó nó chạy hết các microtask, rồi mới lấy Task tiếp theo.',
      },
      pause: 1.3,
    },
  ],
  steps: [
    {
      at: { k: 'task:begin' },
      focus: 'loop',
      say: {
        en: 'The whole script is a Task. The event loop takes it from the queue and starts running it.',
        vi: 'Bản thân cả đoạn script là một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'webapi:start' },
      focus: 'webApis',
      note: { en: 'loading is not instant', vi: 'nạp module cần thời gian' },
      say: {
        en: 'Line one calls import. It does not load the module now. It hands the job to the browser, and returns a promise that is still pending.',
        vi: 'Dòng một gọi import. Nó không nạp module ngay, mà giao việc cho trình duyệt, rồi trả về một promise còn đang chờ.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'networking' } },
      focus: 'tasks',
      note: { en: 'a Task, queued now', vi: 'một Task, xếp hàng ngay' },
      say: {
        en: 'The load is queued as a Task right at the call. It cannot run yet, because the script Task is still running.',
        vi: 'Việc nạp module được xếp vào hàng đợi thành một Task ngay tại lời gọi. Nó chưa chạy được, vì Task của script vẫn đang chạy.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line two. Promise dot resolve is already fulfilled, so its first dot then callback goes straight into the Microtask Queue. The next two dot then calls wait for it.',
        vi: 'Dòng hai. Promise chấm resolve đã fulfilled sẵn, nên callback của chấm then đầu tiên vào thẳng Microtask Queue. Hai chấm then tiếp theo phải chờ nó.',
      },
    },
    {
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line three starts the zero millisecond timer. Its callback is handed to the browser, and the call returns.',
        vi: 'Dòng ba đặt timer không mili giây. Callback của nó được giao cho trình duyệt, rồi lời gọi trả về.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task is finished, and the stack is empty. Only now does the event loop get its turn.',
        vi: 'Task của script đã xong, stack trống. Chỉ đến lúc này event loop mới tới lượt.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'checkpoint:begin' },
      focus: 'loop',
      note: { en: 'microtasks first', vi: 'microtask trước' },
      say: {
        en: 'The import Task is waiting in the Task Queue. But before any other Task, the event loop must empty the Microtask Queue.',
        vi: 'Task của import đang chờ trong Task Queue. Nhưng trước khi chạy bất kỳ Task nào khác, event loop phải làm trống Microtask Queue.',
      },
    },
    {
      at: { k: 'console', text: 'm1' },
      focus: 'console',
      say: {
        en: 'Meanwhile the zero millisecond timer is due, and its Task joins the queue behind the import Task. The first callback runs and prints m1.',
        vi: 'Trong lúc đó timer không mili giây đến giờ, và Task của nó xếp vào hàng sau Task của import. Callback đầu tiên chạy và in ra m1.',
      },
    },
    {
      at: { k: 'job:begin', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'Finishing m1 queued the next callback in the chain. The queue is not empty, so the event loop takes it in the same checkpoint.',
        vi: 'Chạy xong m1 thì callback kế tiếp trong chuỗi được xếp hàng. Hàng đợi chưa trống, nên event loop lấy nó ngay trong lượt này.',
      },
    },
    {
      at: { k: 'console', text: 'm2' },
      focus: 'console',
      say: {
        en: 'It runs, and prints m2.',
        vi: 'Nó chạy, và in ra m2.',
      },
    },
    {
      at: { k: 'job:begin', nth: 3 },
      focus: 'microtasks',
      say: {
        en: 'The same happens for the last link in the chain.',
        vi: 'Điều tương tự xảy ra với mắt xích cuối của chuỗi.',
      },
    },
    {
      at: { k: 'console', text: 'm3' },
      focus: 'console',
      say: {
        en: 'It runs, and prints m3.',
        vi: 'Nó chạy, và in ra m3.',
      },
    },
    {
      at: { k: 'checkpoint:end' },
      focus: 'microtasks',
      say: {
        en: 'The Microtask Queue is empty now. The whole chain ran before any other Task, even though the import was queued first.',
        vi: 'Microtask Queue đã trống. Cả chuỗi chạy xong trước mọi Task khác, dù import được xếp hàng từ trước.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'tasks',
      note: { en: 'queued first, runs first', vi: 'vào trước, chạy trước' },
      say: {
        en: 'Now the event loop takes the next Task. The import Task was queued before the timer, so it goes first, even though the timer says zero.',
        vi: 'Giờ event loop lấy Task kế tiếp. Task của import được xếp hàng trước timer, nên nó đi trước, dù timer chỉ chờ không mili giây.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 4 },
      focus: 'microtasks',
      say: {
        en: 'The browser has the module now, and this Task hands the next step to the engine as a Promise reaction in the Microtask Queue.',
        vi: 'Trình duyệt đã có module, và Task này giao bước tiếp theo cho engine dưới dạng một Promise reaction trong Microtask Queue.',
      },
    },
    {
      at: { k: 'console', text: 'module evaluated' },
      focus: 'console',
      say: {
        en: 'That Task ends, the stack is empty, and the microtask runs. The module is evaluated, so its top level code prints module evaluated.',
        vi: 'Task đó kết thúc, stack trống, và microtask được chạy. Module được evaluate, nên code ở cấp cao nhất của nó in ra module evaluated.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'job:enqueue', nth: 6 },
      focus: 'microtasks',
      note: { en: 'resolves after the module', vi: 'resolve sau module' },
      say: {
        en: 'Only after the module has run does the promise from import settle. That queues the dot then callback from line one, after one more small microtask hop.',
        vi: 'Chỉ sau khi module đã chạy xong, promise của import mới được settle. Việc đó xếp callback của chấm then ở dòng một vào hàng đợi, sau thêm một bước microtask nhỏ.',
      },
    },
    {
      at: { k: 'console', text: 'imported 42' },
      focus: 'console',
      say: {
        en: 'It runs, and prints imported 42, with the value the module exported.',
        vi: 'Nó chạy, và in ra imported 42, với giá trị mà module đã export.',
      },
    },
    {
      at: { k: 'task:begin', nth: 3 },
      focus: 'tasks',
      say: {
        en: 'The Microtask Queue is empty again. At last the event loop takes the timer Task.',
        vi: 'Microtask Queue lại trống. Cuối cùng event loop lấy Task của timer.',
      },
    },
    {
      at: { k: 'console', text: 'timeout 0' },
      focus: 'console',
      say: {
        en: 'The timer callback runs, and prints timeout 0.',
        vi: 'Callback của timer chạy, và in ra timeout 0.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'No microtasks, and nothing else is waiting. The run is complete.',
        vi: 'Không còn microtask nào, và cũng không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'webApis',
      title: { en: 'import is asynchronous', vi: 'import là bất đồng bộ' },
      say: {
        en: 'Why this order? First: import does not run the module at the call. It starts loading, and returns a pending promise, so the rest of the script goes on.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: import không chạy module ngay tại lời gọi. Nó bắt đầu nạp, rồi trả về một promise đang chờ, nên phần còn lại của script cứ chạy tiếp.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Microtasks drain first', vi: 'Microtask chạy hết trước' },
      say: {
        en: 'Second: the promise chain is made of microtasks. They all run when the script ends, before any Task, so m1, m2 and m3 come first.',
        vi: 'Thứ hai: chuỗi promise gồm các microtask. Chúng chạy hết khi script kết thúc, trước mọi Task, nên m1, m2 và m3 đứng đầu.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Queue order decides', vi: 'Thứ tự hàng đợi quyết định' },
      say: {
        en: 'Third: in Chrome the import Task and the timer Task wait in one line, first in, first out. The import was queued first, so it runs before the timer. The spec does not promise this order between different sources.',
        vi: 'Thứ ba: trong Chrome, Task của import và Task của timer chờ chung một hàng, vào trước ra trước. Import được xếp trước nên chạy trước timer. Đặc tả không bảo đảm thứ tự này giữa các nguồn khác nhau.',
      },
    },
    {
      focus: 'console',
      title: { en: 'Resolves after the module', vi: 'Resolve sau khi module chạy' },
      say: {
        en: 'And the promise from import settles only after the module has run. So module evaluated always comes before imported 42.',
        vi: 'Và promise của import chỉ settle sau khi module đã chạy. Nên module evaluated luôn đứng trước imported 42.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'import starts loading and returns a pending promise.', vi: 'import bắt đầu nạp và trả về một promise đang chờ.' },
      { en: 'The load is its own Task, queued at the call, in line with timers.', vi: 'Việc nạp là một Task riêng, xếp hàng ngay tại lời gọi, cùng hàng với timer.' },
      { en: 'The promise resolves only after the module has run.', vi: 'Promise chỉ resolve sau khi module đã chạy xong.' },
    ],
    model: {
      en: 'Microtasks → import Task → timer Task',
      vi: 'Microtask → Task import → Task timer',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: m1, m2, m3, module evaluated, imported 42, and timeout 0.',
          vi: 'Vậy thứ tự cuối cùng là: m1, m2, m3, module evaluated, imported 42, và timeout 0.',
        },
      },
      {
        say: {
          en: 'Keep this model: finish the current Task, drain every microtask, then take the next Task in the order it was queued.',
          vi: 'Hãy giữ mô hình này: chạy xong Task hiện tại, chạy hết các microtask, rồi lấy Task tiếp theo theo đúng thứ tự đã xếp hàng.',
        },
        pause: 2,
      },
    ],
  },
})
