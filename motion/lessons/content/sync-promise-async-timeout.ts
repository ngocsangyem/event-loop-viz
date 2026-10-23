import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'sync-promise-async-timeout',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'Four kinds of code, six lines of output… which prints first, and which comes last?',
      vi: 'Bốn kiểu code, sáu dòng output… dòng nào in ra trước, dòng nào sau cùng?',
    },
    lines: [
      {
        say: {
          en: 'This short script mixes four kinds of code: plain synchronous logs, a zero millisecond timer, a promise callback, and an async function with an await.',
          vi: 'Đoạn script ngắn này trộn bốn kiểu code: lệnh log đồng bộ bình thường, một timer không mili giây, một callback của promise, và một async function có await.',
        },
      },
      {
        say: {
          en: 'It prints six lines. Before we run it, take a moment and guess the order they appear in.',
          vi: 'Nó in ra sáu dòng. Trước khi chạy, bạn hãy dừng lại một chút và đoán xem chúng xuất hiện theo thứ tự nào.',
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
      focus: 'webApis',
      say: {
        en: 'Next, the Web APIs. They belong to the browser, not to the JavaScript engine. A timer counts down here, outside the stack.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt, không thuộc JavaScript engine. Timer đếm giờ ở đây, bên ngoài Call Stack.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When a timer is done, its callback becomes a Task and waits in the Task Queue.',
        vi: 'Khi timer hết giờ, callback của nó trở thành một Task và xếp hàng trong Task Queue, hàng đợi task.',
      },
    },
    {
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks, and the code after an await, wait in a different line: the Microtask Queue.',
        vi: 'Còn callback của promise, và phần code phía sau await, thì xếp ở một hàng khác: Microtask Queue, hàng đợi microtask.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only gets a turn when the stack is empty. Then it runs every microtask, and only after that takes the next Task.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ được lượt khi stack đã trống. Lúc đó nó chạy hết các microtask, rồi mới lấy Task tiếp theo.',
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
      at: { k: 'console', text: 'start' },
      focus: 'console',
      say: {
        en: 'The script goes on the stack. Line one calls console dot log. It goes on top of the stack and prints start.',
        vi: 'Script được đưa lên stack. Dòng một gọi console chấm log. Lời gọi này nằm trên đỉnh stack và in ra start.',
      },
    },
    {
      at: { k: 'timer:init' },
      focus: 'webApis',
      note: { en: '0 ms ≠ run now', vi: '0 ms ≠ chạy ngay' },
      say: {
        en: 'Line two calls setTimeout. It does not run the callback. It hands the callback to the browser timer, and returns right away.',
        vi: 'Dòng hai gọi setTimeout. Nó không chạy callback, mà giao callback cho timer của trình duyệt, rồi trả về ngay.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'Zero milliseconds pass almost at once, so the timer queues its callback as a Task. But it has to wait. The script Task is still running.',
        vi: 'Không mili giây trôi qua gần như ngay lập tức, nên timer đưa callback vào hàng đợi thành một Task. Nhưng nó phải chờ, vì Task của script vẫn đang chạy.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line three. Promise dot resolve gives a promise that is already fulfilled. So dot then does not wait: its callback goes straight into the Microtask Queue.',
        vi: 'Dòng ba. Promise chấm resolve tạo ra một promise đã fulfilled sẵn. Vì vậy chấm then không phải chờ: callback của nó vào thẳng Microtask Queue.',
      },
    },
    {
      at: { k: 'console', text: 'async that' },
      focus: 'stack',
      note: { en: 'runs synchronously', vi: 'chạy đồng bộ' },
      say: {
        en: 'Now the async function is called. Its body starts running right away, synchronously, on the same stack. So it prints async that, before end.',
        vi: 'Giờ async function được gọi. Thân hàm chạy ngay lập tức, đồng bộ, trên cùng Call Stack. Nên nó in ra async that, trước cả end.',
      },
    },
    {
      at: { k: 'await:suspend' },
      focus: 'microtasks',
      note: { en: 'pause here', vi: 'tạm dừng ở đây' },
      say: {
        en: 'Then it reaches await. The awaited value is ready, so the rest of the function is queued as a microtask, and the function pauses. Its frame leaves the stack.',
        vi: 'Rồi nó gặp await. Giá trị được await đã sẵn sàng, nên phần còn lại của hàm được xếp vào hàng đợi như một microtask, và hàm tạm dừng. Frame của nó rời khỏi stack.',
      },
    },
    {
      at: { k: 'console', text: 'end' },
      focus: 'console',
      say: {
        en: 'Control returns to the script, which prints end on its last line.',
        vi: 'Quyền điều khiển quay về script, và dòng cuối in ra end.',
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
        en: 'Look at the Task Queue: the timer has been waiting the longest. But before any other Task, the event loop must empty the whole Microtask Queue.',
        vi: 'Hãy nhìn Task Queue: timer đã chờ lâu nhất. Nhưng trước khi chạy bất kỳ Task nào khác, event loop phải làm trống toàn bộ Microtask Queue.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'promise 1' },
      focus: 'console',
      say: {
        en: 'Microtasks run first in, first out. The promise callback was queued first, so it runs first and prints promise 1.',
        vi: 'Microtask chạy theo thứ tự vào trước, ra trước. Callback của promise được xếp hàng trước, nên nó chạy trước và in ra promise 1.',
      },
    },
    {
      at: { k: 'job:begin', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'That callback is done and leaves the stack. The queue is not empty yet, so the event loop takes the next microtask: the await continuation.',
        vi: 'Callback đó chạy xong và rời khỏi stack. Hàng đợi vẫn chưa trống, nên event loop lấy microtask tiếp theo: phần tiếp nối của await.',
      },
    },
    {
      at: { k: 'console', text: 'async end' },
      focus: 'stack',
      say: {
        en: 'The async function resumes exactly where it paused, and prints async end.',
        vi: 'Async function chạy tiếp đúng tại chỗ nó đã dừng, và in ra async end.',
      },
    },
    {
      at: { k: 'checkpoint:end' },
      focus: 'microtasks',
      say: {
        en: 'The Microtask Queue is empty now, so the checkpoint is over.',
        vi: 'Microtask Queue đã trống, nên lượt xử lý microtask kết thúc.',
      },
    },
    {
      at: { k: 'console', text: 'timeout 1' },
      focus: 'tasks',
      say: {
        en: 'At last the event loop takes the next Task: the timer callback. It prints timeout 1.',
        vi: 'Cuối cùng event loop lấy Task kế tiếp: callback của timer. Nó in ra timeout 1.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'That Task ends, there are no microtasks, and nothing else is waiting. The run is complete.',
        vi: 'Task đó kết thúc, không có microtask nào, và cũng không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'stack',
      title: { en: 'Synchronous code runs to the end', vi: 'Code đồng bộ chạy đến hết' },
      say: {
        en: 'Why this order? First: a Task always runs to completion. Nothing interrupts the script, not even a timer that is already due. That is why start, async that and end come first.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: một Task luôn chạy đến hết. Không gì ngắt được script, kể cả một timer đã đến giờ. Vì vậy start, async that và end in ra đầu tiên.',
      },
    },
    {
      focus: 'code',
      title: { en: 'async runs synchronously until await', vi: 'async chạy đồng bộ cho tới await' },
      say: {
        en: 'Second: calling an async function does not make it asynchronous. Its body runs right away, and only the code after await is postponed.',
        vi: 'Thứ hai: gọi một async function không làm nó bất đồng bộ ngay. Thân hàm chạy luôn, chỉ có phần code phía sau await mới bị hoãn lại.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'All microtasks before the next Task', vi: 'Mọi microtask chạy trước Task kế tiếp' },
      say: {
        en: 'Third: promise callbacks and await continuations are microtasks. Every time the stack empties after a Task, the whole Microtask Queue is drained, in order, before the event loop takes another Task.',
        vi: 'Thứ ba: callback của promise và phần tiếp nối của await là microtask. Mỗi khi stack trống sau một Task, toàn bộ Microtask Queue được chạy hết theo thứ tự, trước khi event loop lấy Task khác.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'setTimeout 0 means: a later Task', vi: 'setTimeout 0 nghĩa là: một Task sau' },
      say: {
        en: 'And a zero millisecond timeout is not "run now". It is a minimum delay, followed by a Task of its own. So timeout 1 comes last.',
        vi: 'Và setTimeout không mili giây không có nghĩa là chạy ngay. Đó là độ trễ tối thiểu, rồi sau đó là một Task riêng. Nên timeout 1 in ra sau cùng.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'The current Task always runs to completion.', vi: 'Task hiện tại luôn chạy đến hết.' },
      {
        en: 'Promise callbacks and await continuations are microtasks, run first in, first out.',
        vi: 'Callback của promise và phần sau await là microtask, chạy theo thứ tự vào trước ra trước.',
      },
      { en: 'Timers queue Tasks. Tasks wait until microtasks are drained.', vi: 'Timer tạo Task. Task phải chờ microtask chạy hết.' },
    ],
    model: {
      en: 'One Task → every microtask → the next Task',
      vi: 'Một Task → toàn bộ microtask → Task tiếp theo',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: start, async that, end, promise 1, async end, and timeout 1.',
          vi: 'Vậy thứ tự cuối cùng là: start, async that, end, promise 1, async end, và timeout 1.',
        },
      },
      {
        say: {
          en: 'Keep this model for any example: finish the current Task, drain every microtask, then take the next Task. Repeat.',
          vi: 'Hãy giữ mô hình này cho mọi ví dụ: chạy xong Task hiện tại, chạy hết các microtask, rồi lấy Task tiếp theo. Cứ thế lặp lại.',
        },
        pause: 2,
      },
    ],
  },
})
