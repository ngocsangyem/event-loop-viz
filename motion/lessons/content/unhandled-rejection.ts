import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'unhandled-rejection',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A rejected promise nobody handles, a promise callback, and a fifty millisecond timer… in which order?',
      vi: 'Một promise bị reject mà không ai xử lý, một callback của promise, và một timer năm mươi mili giây… theo thứ tự nào?',
    },
    lines: [
      {
        say: {
          en: 'This script rejects a promise and never handles the error. It also starts a fifty millisecond timer, and a promise callback.',
          vi: 'Đoạn script này reject một promise và không bao giờ xử lý lỗi. Nó cũng bắt đầu một timer năm mươi mili giây, và một callback của promise.',
        },
      },
      {
        say: {
          en: 'The browser will report the error to the console. The question is: when, compared to the other two lines? Take a guess.',
          vi: 'Trình duyệt sẽ báo lỗi ra console. Câu hỏi là: báo vào lúc nào, so với hai dòng còn lại? Bạn hãy đoán thử.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. This is where JavaScript actually runs code, one frame at a time.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript thực sự chạy code, từng frame một.',
      },
    },
    {
      focus: 'webApis',
      say: {
        en: 'Next, the Web APIs. They belong to the browser. The fifty millisecond timer will count down here, outside the stack.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Timer năm mươi mili giây sẽ đếm giờ ở đây, bên ngoài Call Stack.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When a timer is done, its callback becomes a Task and waits in the Task Queue. The browser also uses Tasks for its own notifications.',
        vi: 'Khi timer hết giờ, callback của nó trở thành một Task và xếp hàng trong Task Queue, hàng đợi task. Trình duyệt cũng dùng Task cho các thông báo của chính nó.',
      },
    },
    {
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks wait in a different line: the Microtask Queue.',
        vi: 'Callback của promise xếp ở một hàng khác: Microtask Queue, hàng đợi microtask.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread. It only gets a turn when the stack is empty. Then it runs every microtask, and only after that takes the next Task.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai. Nó chỉ được lượt khi stack đã trống. Lúc đó nó chạy hết các microtask, rồi mới lấy Task tiếp theo.',
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
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line one creates a promise that is already rejected. Nothing handles it, and nothing visible happens yet. Line two hands the timer callback to the browser, with a delay of fifty milliseconds.',
        vi: 'Dòng một tạo ra một promise đã bị reject sẵn. Không ai xử lý nó, và chưa có gì hiện ra. Dòng hai giao callback của timer cho trình duyệt, với độ trễ năm mươi mili giây.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line three. Promise dot resolve is already fulfilled, so dot then does not wait: its callback goes straight into the Microtask Queue.',
        vi: 'Dòng ba. Promise chấm resolve đã fulfilled sẵn, nên chấm then không phải chờ: callback của nó vào thẳng Microtask Queue.',
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
      note: { en: 'microtasks first', vi: 'microtask trước' },
      say: {
        en: 'Before any other Task, the event loop must empty the whole Microtask Queue.',
        vi: 'Trước khi chạy bất kỳ Task nào khác, event loop phải làm trống toàn bộ Microtask Queue.',
      },
    },
    {
      at: { k: 'console', text: 'microtask' },
      focus: 'console',
      say: {
        en: 'The promise callback runs and prints microtask. The rejected promise is still waiting for a handler, so the browser does not report it yet. A handler added during this checkpoint would still catch it in time.',
        vi: 'Callback của promise chạy và in ra microtask. Promise bị reject vẫn đang chờ một handler, nên trình duyệt chưa báo lỗi. Một handler được thêm vào trong lượt này vẫn kịp bắt lỗi.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'dom-manipulation' } },
      focus: 'tasks',
      note: { en: 'report is a Task', vi: 'báo lỗi là một Task' },
      say: {
        en: 'The microtask queue is now empty, and the promise still has no handler. So the browser queues a Task to report it. The report is not part of the microtask checkpoint.',
        vi: 'Microtask Queue giờ đã trống, mà promise vẫn chưa có handler. Nên trình duyệt xếp một Task để báo lỗi. Việc báo lỗi không nằm trong lượt xử lý microtask.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'checkpoint:end' },
      focus: 'microtasks',
      say: {
        en: 'The checkpoint is over.',
        vi: 'Lượt xử lý microtask kết thúc.',
      },
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'tasks',
      say: {
        en: 'The event loop takes the next Task: the report. The timer is not in the Task Queue, because it is not due until fifty milliseconds.',
        vi: 'Event loop lấy Task kế tiếp: Task báo lỗi. Timer không có trong Task Queue, vì mãi đến năm mươi mili giây nó mới đến giờ.',
      },
    },
    {
      at: { k: 'rejection:notify' },
      focus: 'console',
      note: { en: 'reported after microtasks', vi: 'báo sau microtask' },
      say: {
        en: 'The browser reports the unhandled rejection. The console shows an uncaught error in promise, x one.',
        vi: 'Trình duyệt báo lỗi promise bị reject mà không ai xử lý. Console hiện một lỗi chưa bắt trong promise, x1.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'That Task ends and nothing else is ready. The loop waits until fifty milliseconds have passed. Then the timer queues its callback as a Task.',
        vi: 'Task đó kết thúc và không còn gì sẵn sàng. Event loop chờ cho đến khi đủ năm mươi mili giây. Rồi timer đưa callback vào hàng đợi thành một Task.',
      },
    },
    {
      at: { k: 'console', text: 'timer 50' },
      focus: 'console',
      say: {
        en: 'The event loop takes that Task, and the timer callback prints timer fifty.',
        vi: 'Event loop lấy Task đó, và callback của timer in ra timer 50.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'That Task ends, and nothing else is waiting. The run is complete.',
        vi: 'Task đó kết thúc, và không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'microtasks',
      title: { en: 'Microtasks first', vi: 'Microtask chạy trước' },
      say: {
        en: 'Why this order? First: the promise callback is a microtask, so it runs right after the script, before any other Task.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: callback của promise là microtask, nên nó chạy ngay sau script, trước bất kỳ Task nào khác.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Reported after the checkpoint', vi: 'Báo lỗi sau lượt microtask' },
      say: {
        en: 'Second: the browser only checks for unhandled rejections after the microtask queue is empty. That gives your code a chance to add a handler. If none is added, a separate Task reports the error.',
        vi: 'Thứ hai: trình duyệt chỉ kiểm tra promise bị reject sau khi Microtask Queue đã trống. Như vậy code của bạn còn cơ hội thêm handler. Nếu không ai thêm, một Task riêng sẽ báo lỗi.',
      },
    },
    {
      focus: 'webApis',
      title: { en: 'The timer is not due yet', vi: 'Timer chưa đến giờ' },
      say: {
        en: 'Third: the timer needs fifty milliseconds, and the report is ready almost at once. So the report goes first.',
        vi: 'Thứ ba: timer cần năm mươi mili giây, còn việc báo lỗi sẵn sàng gần như ngay. Nên báo lỗi đi trước.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'Promise callbacks are microtasks. They run before the next Task.', vi: 'Callback của promise là microtask. Chúng chạy trước Task kế tiếp.' },
      { en: 'Unhandled rejections are reported after the microtask checkpoint, in a separate Task.', vi: 'Lỗi promise không được xử lý được báo sau lượt microtask, trong một Task riêng.' },
      { en: 'A timer only queues its Task when it is due.', vi: 'Timer chỉ xếp Task vào hàng khi đến giờ.' },
    ],
    model: {
      en: 'Script → every microtask → rejection report → later Tasks',
      vi: 'Script → mọi microtask → báo lỗi reject → các Task sau',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: microtask, then the unhandled rejection report, and timer fifty.',
          vi: 'Vậy thứ tự cuối cùng là: microtask, rồi báo lỗi promise không được xử lý, và timer 50.',
        },
      },
      {
        say: {
          en: 'Keep this model: finish the current Task, drain every microtask, and only then do the browser notifications and timers get their turn.',
          vi: 'Hãy giữ mô hình này: chạy xong Task hiện tại, chạy hết các microtask, và chỉ sau đó thông báo của trình duyệt và timer mới tới lượt.',
        },
        pause: 2,
      },
    ],
  },
})
