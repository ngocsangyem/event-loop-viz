import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'atomics-wait-async',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A wait that is woken by notify… where does the woken line land among the others?',
      vi: 'Một lệnh chờ được notify đánh thức… dòng được đánh thức nằm ở đâu giữa các dòng còn lại?',
    },
    lines: [
      {
        say: {
          en: 'Atomics dot wait async waits for a shared memory cell to change, without blocking the page. It gives back a promise. A timer then calls Atomics dot notify to wake it. Real pages need a cross-origin isolated context to use shared memory.',
          vi: 'Atomics chấm wait async chờ một ô nhớ dùng chung thay đổi, mà không chặn trang. Nó trả về một promise. Rồi một timer gọi Atomics chấm notify để đánh thức nó. Trang thật cần ngữ cảnh cross-origin isolated để dùng shared memory.',
        },
      },
      {
        say: {
          en: 'The script has two timers, a microtask, and the waiting promise. Guess the order of the seven lines, and especially where woke ok lands.',
          vi: 'Script có hai timer, một microtask, và promise đang chờ. Bạn hãy đoán thứ tự bảy dòng in ra, nhất là woke ok nằm ở đâu.',
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
        en: 'Next, the Web APIs. They belong to the browser. Timers count down here. The panel also holds a pending wait on shared memory, although Atomics dot wait async is an engine feature, not a browser API.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Timer đếm giờ ở đây. Khung này cũng giữ một lệnh chờ trên bộ nhớ dùng chung, dù Atomics chấm wait async là tính năng của engine, không phải API của trình duyệt.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When a timer is done, or a wait is woken, its callback becomes a Task in the Task Queue.',
        vi: 'Khi timer hết giờ, hoặc một lệnh chờ được đánh thức, callback của nó trở thành một Task trong Task Queue, hàng đợi task.',
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
        en: 'The script is a Task. The event loop takes it from the queue and starts running it.',
        vi: 'Script là một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'webapi:start' },
      focus: 'webApis',
      note: { en: 'waits, never blocks', vi: 'chờ, không chặn' },
      say: {
        en: 'Line two calls Atomics dot wait async. The cell still holds the expected zero, so the wait begins. The wait is parked outside the stack, and the call returns at once with a pending promise.',
        vi: 'Dòng hai gọi Atomics chấm wait async. Ô nhớ vẫn đang là số không như kỳ vọng, nên lệnh chờ bắt đầu. Lệnh chờ được giữ lại bên ngoài stack, và lời gọi trả về ngay một promise đang chờ.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'true function' },
      focus: 'console',
      say: {
        en: 'Line three prints true and function. The result is asynchronous, and its value is a promise. The page is not stuck.',
        vi: 'Dòng ba in ra true và function. Kết quả là bất đồng bộ, và giá trị của nó là một promise. Trang không bị đứng.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line four attaches a dot then to the waiting promise. It has nothing to queue yet. Line five queues a callback in the Microtask Queue, because that promise is already fulfilled.',
        vi: 'Dòng bốn gắn một chấm then vào promise đang chờ. Nó chưa có gì để xếp hàng. Dòng năm xếp một callback vào Microtask Queue, vì promise đó đã fulfilled sẵn.',
      },
    },
    {
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line six starts a zero millisecond timer. This is the one that will call notify.',
        vi: 'Dòng sáu đặt một timer không mili giây. Đây là timer sẽ gọi notify.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 2 },
      focus: 'tasks',
      note: { en: 'timers queue first', vi: 'timer vào hàng trước' },
      say: {
        en: 'Line ten starts a second timer. Both are done almost at once, so both are queued as Tasks, notify first, then the plain one.',
        vi: 'Dòng mười đặt timer thứ hai. Cả hai hết giờ gần như ngay, nên cả hai được xếp vào hàng đợi thành Task, notify trước, rồi đến timer còn lại.',
      },
    },
    {
      at: { k: 'console', text: 'not-equal timed-out' },
      focus: 'console',
      say: {
        en: 'Line eleven makes two more calls. One expects a different value, so it returns not-equal. The other has a zero timeout, so it returns timed-out. Neither waits. Both answers are plain strings, ready at once.',
        vi: 'Dòng mười một gọi thêm hai lần. Một lần kỳ vọng giá trị khác, nên trả về not-equal. Lần kia có timeout bằng không, nên trả về timed-out. Cả hai đều không phải chờ. Hai kết quả là chuỗi bình thường, có ngay.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task is finished, and the stack is empty. Still waiting: one parked wait, a microtask, and two timer Tasks.',
        vi: 'Task của script đã xong, stack trống. Vẫn đang chờ: một lệnh chờ đã cất, một microtask, và hai Task của timer.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'microtask' },
      focus: 'microtasks',
      note: { en: 'microtasks first', vi: 'microtask trước' },
      say: {
        en: 'Microtasks go before any Task. The promise callback runs, and prints microtask.',
        vi: 'Microtask luôn đi trước mọi Task. Callback của promise chạy, và in ra microtask.',
      },
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'tasks',
      say: {
        en: 'The Microtask Queue is empty, so the event loop takes the first timer Task: the one with notify.',
        vi: 'Microtask Queue đã trống, nên event loop lấy Task của timer đầu tiên: timer có notify.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'javascript-engine' } },
      focus: 'tasks',
      note: { en: 'notify queues a wake-up', vi: 'notify xếp việc đánh thức' },
      say: {
        en: 'Atomics dot notify finds one waiter, and wakes it. But the waiter does not run now. In Chrome, the wake up is queued as a new Task, behind the timer Task that is already waiting.',
        vi: 'Atomics chấm notify tìm thấy một bên đang chờ, và đánh thức nó. Nhưng bên đó không chạy ngay. Trong Chrome, việc đánh thức được xếp thành một Task mới, sau Task của timer đang chờ sẵn.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'notified 1' },
      focus: 'console',
      say: {
        en: 'Notify returns one, the number of waiters it woke, and the script prints notified 1.',
        vi: 'Notify trả về một, là số bên đang chờ nó đã đánh thức, và script in ra notified 1.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The timer callback also queues a promise callback, as a microtask.',
        vi: 'Callback của timer cũng xếp một callback của promise vào hàng đợi, như một microtask.',
      },
    },
    {
      at: { k: 'task:end', nth: 2 },
      focus: 'stack',
      say: {
        en: 'The timer Task ends, and the stack is empty. Microtasks always get their turn before the next Task.',
        vi: 'Task của timer kết thúc, và stack trống. Microtask luôn được chạy trước Task kế tiếp.',
      },
    },
    {
      at: { k: 'console', text: 'microtask after notify' },
      focus: 'console',
      say: {
        en: 'So the microtask runs right away, before any other Task. It prints microtask after notify.',
        vi: 'Nên microtask chạy ngay, trước mọi Task khác. Nó in ra microtask after notify.',
      },
    },
    {
      at: { k: 'task:begin', nth: 3 },
      focus: 'tasks',
      note: { en: 'first in, first out', vi: 'vào trước ra trước' },
      say: {
        en: 'Now the second timer Task. It was queued before the wake up, so it goes first, even though notify already happened.',
        vi: 'Giờ đến Task của timer thứ hai. Nó được xếp hàng trước việc đánh thức, nên nó đi trước, dù notify đã xảy ra rồi.',
      },
    },
    {
      at: { k: 'console', text: 'timeout queued before the notify' },
      focus: 'console',
      say: {
        en: 'It prints timeout queued before the notify.',
        vi: 'Nó in ra timeout queued before the notify.',
      },
    },
    {
      at: { k: 'task:begin', nth: 4 },
      focus: 'tasks',
      note: { en: 'the wake-up Task', vi: 'Task đánh thức' },
      say: {
        en: 'At last the wake up Task runs. It resolves the waiting promise with the value ok.',
        vi: 'Cuối cùng Task đánh thức chạy. Nó resolve promise đang chờ với giá trị ok.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 3 },
      focus: 'microtasks',
      say: {
        en: 'Resolving the promise queues the dot then callback from line four, as a microtask.',
        vi: 'Resolve promise làm callback của chấm then ở dòng bốn được xếp vào hàng đợi, như một microtask.',
      },
    },
    {
      at: { k: 'console', text: 'woke ok' },
      focus: 'console',
      say: {
        en: 'The Task ends, the microtask runs, and the script prints woke ok.',
        vi: 'Task kết thúc, microtask chạy, và script in ra woke ok.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'Nothing else is waiting. The run is complete.',
        vi: 'Không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'webApis',
      title: { en: 'It waits without blocking', vi: 'Chờ mà không chặn' },
      say: {
        en: 'Why this order? First: wait async never freezes the page. It returns a promise, and the script keeps going. The plain Atomics dot wait would block the main thread, so the browser throws an error on the main thread instead.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: wait async không bao giờ làm đứng trang. Nó trả về một promise, và script cứ chạy tiếp. Còn Atomics chấm wait thường sẽ chặn luồng chính, nên trình duyệt báo lỗi trên luồng chính.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Notify queues a Task', vi: 'Notify xếp một Task' },
      say: {
        en: 'Second: in Chrome, notify does not resume the waiter by itself. It queues a Task, at the back of the line, behind everything queued earlier.',
        vi: 'Thứ hai: trong Chrome, notify không tự chạy tiếp bên đang chờ. Nó xếp một Task, ở cuối hàng, sau mọi thứ đã xếp trước đó.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Then a microtask', vi: 'Rồi mới đến microtask' },
      say: {
        en: 'Third: the wake up Task only resolves the promise. Your dot then callback is a microtask, so it runs right after that Task.',
        vi: 'Thứ ba: Task đánh thức chỉ resolve promise. Callback chấm then của bạn là một microtask, nên nó chạy ngay sau Task đó.',
      },
    },
    {
      focus: 'console',
      title: { en: 'Immediate answers are plain', vi: 'Kết quả tức thì là giá trị thường' },
      say: {
        en: 'And when no waiting is needed, such as not-equal or timed-out, you get plain values at once. Only a real wait gives a promise.',
        vi: 'Và khi không cần chờ, như not-equal hay timed-out, bạn nhận ngay giá trị thường. Chỉ khi thật sự phải chờ mới có promise.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'Wait async parks the wait and returns a promise, so the page never blocks.', vi: 'Wait async cất lệnh chờ đi và trả về một promise, nên trang không bao giờ bị chặn.' },
      { en: 'Notify queues the wake up as a Task, at the back of the line.', vi: 'Notify xếp việc đánh thức thành một Task, ở cuối hàng.' },
      { en: 'The promise callback then runs as a microtask after that Task.', vi: 'Callback của promise sau đó chạy như một microtask ngay sau Task đó.' },
    ],
    model: {
      en: 'Notify → wake-up Task → microtask',
      vi: 'Notify → Task đánh thức → microtask',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: true function, not-equal timed-out, microtask, notified 1, microtask after notify, timeout queued before the notify, and woke ok.',
          vi: 'Vậy thứ tự cuối cùng là: true function, not-equal timed-out, microtask, notified 1, microtask after notify, timeout queued before the notify, và woke ok.',
        },
      },
      {
        say: {
          en: 'Keep this model: finish the current Task, drain every microtask, then take the next Task in queue order. A wake up is just one more Task.',
          vi: 'Hãy giữ mô hình này: chạy xong Task hiện tại, chạy hết các microtask, rồi lấy Task tiếp theo theo thứ tự hàng đợi. Việc đánh thức chỉ là thêm một Task nữa.',
        },
        pause: 2,
      },
    ],
  },
})
