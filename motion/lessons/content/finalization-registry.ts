import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'finalization-registry',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A cleanup callback after garbage collection, a microtask and a timer… when does the cleanup run?',
      vi: 'Một callback dọn dẹp sau khi garbage collection, một microtask và một timer… khi nào phần dọn dẹp chạy?',
    },
    lines: [
      {
        say: {
          en: 'A FinalizationRegistry lets you run a cleanup callback after an object has been garbage collected. Here we register a throwaway object, then trigger a collection from a timer.',
          vi: 'FinalizationRegistry cho phép chạy một callback dọn dẹp sau khi một object đã bị garbage collector thu hồi. Ở đây ta đăng ký một object tạm, không còn ai dùng, rồi kích hoạt việc thu hồi từ trong một timer.',
        },
      },
      {
        say: {
          en: 'A collection is not instant, and a callback cannot run in the middle of other code. So when does the cleanup print? Take a guess.',
          vi: 'Việc thu hồi không diễn ra tức thì, và một callback không thể chạy chen vào giữa code khác. Vậy khi nào phần dọn dẹp được in ra? Bạn hãy đoán thử.',
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
        en: 'Next, the Web APIs. They belong to the browser. A timer counts down here, outside the stack.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Timer đếm giờ ở đây, bên ngoài Call Stack.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When a timer is done, its callback becomes a Task in the Task Queue. The engine can queue a Task too, and the cleanup will use that.',
        vi: 'Khi timer hết giờ, callback của nó trở thành một Task trong Task Queue, hàng đợi task. Engine cũng có thể xếp một Task, và phần dọn dẹp sẽ dùng cách đó.',
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
      at: { k: 'frame:push', where: { label: 'register' } },
      focus: 'stack',
      say: {
        en: 'The registry is created with its cleanup callback, which is only stored for later. Then register is called on a throwaway object, with the held value. Nothing runs yet.',
        vi: 'Registry được tạo cùng callback dọn dẹp, và callback chỉ được cất lại để dùng sau. Rồi register được gọi cho một object tạm, không còn ai dùng, kèm giá trị held. Chưa có gì chạy cả.',
      },
    },
    {
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line six starts a zero millisecond timer. Its callback goes to the browser timer, and the call returns.',
        vi: 'Dòng sáu đặt một timer không mili giây. Callback của nó được giao cho timer của trình duyệt, và lời gọi trả về.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task is finished, and the stack is empty. There are no microtasks to run.',
        vi: 'Task của script đã xong, và stack trống. Không có microtask nào để chạy.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'The timer is done, so its callback is queued as a Task.',
        vi: 'Timer đã hết giờ, nên callback của nó được xếp vào hàng đợi thành một Task.',
      },
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'loop',
      say: {
        en: 'The event loop takes the timer Task. Inside it we will trigger a collection.',
        vi: 'Event loop lấy Task của timer. Bên trong nó, ta sẽ kích hoạt việc thu hồi.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'javascript-engine' } },
      focus: 'tasks',
      note: { en: 'cleanup = its own Task', vi: 'dọn dẹp = Task riêng' },
      say: {
        en: 'Line seven calls gc. Real pages cannot force this, so here gc is a simulated hook of this app. The object is collected. In Chrome, the engine queues the cleanup callback as a Task. It does not run now.',
        vi: 'Dòng bảy gọi gc. Trang web thật không thể ép việc này, nên ở đây gc là một hook mô phỏng của ứng dụng. Object bị thu hồi. Trong Chrome, engine xếp callback dọn dẹp vào hàng đợi thành một Task. Nó không chạy ngay.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'after gc' },
      focus: 'console',
      say: {
        en: 'The timer callback goes on, and prints after gc. The cleanup could not interrupt it.',
        vi: 'Callback của timer chạy tiếp, và in ra after gc. Phần dọn dẹp không thể ngắt nó.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line nine queues a promise callback, as a microtask.',
        vi: 'Dòng chín xếp một callback của promise vào hàng đợi, như một microtask.',
      },
    },
    {
      at: { k: 'timer:init', nth: 2 },
      focus: 'webApis',
      say: {
        en: 'Line ten starts another zero millisecond timer, for later.',
        vi: 'Dòng mười đặt thêm một timer không mili giây, cho lát nữa.',
      },
    },
    {
      at: { k: 'task:end', nth: 2 },
      focus: 'stack',
      say: {
        en: 'The timer Task ends, and the stack is empty. Waiting now: the cleanup Task, and a microtask.',
        vi: 'Task của timer kết thúc, và stack trống. Đang chờ: Task dọn dẹp, và một microtask.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'microtask' },
      focus: 'microtasks',
      note: { en: 'microtasks first', vi: 'microtask trước' },
      say: {
        en: 'The cleanup Task was queued first. But microtasks are drained completely before the next Task, so the promise callback runs first and prints microtask.',
        vi: 'Task dọn dẹp được xếp hàng trước. Nhưng microtask luôn được chạy hết trước Task kế tiếp, nên callback của promise chạy trước và in ra microtask.',
      },
    },
    {
      at: { k: 'task:begin', nth: 3 },
      focus: 'tasks',
      note: { en: 'cleanup runs as a Task', vi: 'dọn dẹp chạy như Task' },
      say: {
        en: 'Now the event loop takes the next Task. The cleanup Task was queued before the second timer, so it comes first.',
        vi: 'Giờ event loop lấy Task kế tiếp. Task dọn dẹp được xếp hàng trước timer thứ hai, nên nó đi trước.',
      },
    },
    {
      at: { k: 'console', text: 'cleanup held value' },
      focus: 'console',
      say: {
        en: 'The registry callback runs with the held value, and prints cleanup held value. Notice that it only gets the value, not the object.',
        vi: 'Callback của registry chạy với giá trị held, và in ra cleanup held value. Chú ý rằng nó chỉ nhận giá trị, chứ không nhận object.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'This callback also queues a promise callback, as a microtask.',
        vi: 'Callback này cũng xếp một callback của promise vào hàng đợi, như một microtask.',
      },
    },
    {
      at: { k: 'task:end', nth: 3 },
      focus: 'stack',
      say: {
        en: 'The cleanup Task ends, and the stack is empty. Like any other Task, it is followed by a microtask checkpoint.',
        vi: 'Task dọn dẹp kết thúc, và stack trống. Giống mọi Task khác, sau nó là một lượt xử lý microtask.',
      },
    },
    {
      at: { k: 'console', text: 'cleanup microtask' },
      focus: 'console',
      say: {
        en: 'So its microtask runs right away, and prints cleanup microtask. Cleanup behaves like any other Task.',
        vi: 'Nên microtask của nó chạy ngay, và in ra cleanup microtask. Phần dọn dẹp hoạt động như mọi Task khác.',
      },
    },
    {
      at: { k: 'task:begin', nth: 4 },
      focus: 'tasks',
      say: {
        en: 'Last, the event loop takes the second timer Task.',
        vi: 'Cuối cùng, event loop lấy Task của timer thứ hai.',
      },
    },
    {
      at: { k: 'console', text: 'timeout 0' },
      focus: 'console',
      say: {
        en: 'It runs, and prints timeout 0.',
        vi: 'Nó chạy, và in ra timeout 0.',
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
      focus: 'stack',
      title: { en: 'Cleanup never interrupts', vi: 'Dọn dẹp không ngắt code' },
      say: {
        en: 'Why this order? First: a finalization callback is never run in the middle of other code. The collection only queues it, so after gc and microtask print first.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: callback finalization không bao giờ chạy chen vào giữa code khác. Việc thu hồi chỉ xếp nó vào hàng đợi, nên after gc và microtask in ra trước.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Cleanup is a Task', vi: 'Dọn dẹp là một Task' },
      say: {
        en: 'Second: the cleanup runs in a Task of its own. So the current Task finishes, and its microtasks are drained, before the cleanup starts.',
        vi: 'Thứ hai: phần dọn dẹp chạy trong một Task riêng. Nên Task hiện tại chạy xong, và các microtask của nó chạy hết, rồi phần dọn dẹp mới bắt đầu.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'Queue order, first in first out', vi: 'Hàng đợi: vào trước ra trước' },
      say: {
        en: 'Third: Tasks go in order. The cleanup Task was queued by gc, before the second timer, so it runs before timeout 0.',
        vi: 'Thứ ba: các Task chạy theo thứ tự xếp hàng. Task dọn dẹp được gc xếp trước timer thứ hai, nên nó chạy trước timeout 0.',
      },
    },
    {
      focus: 'code',
      title: { en: 'gc is simulated here', vi: 'gc ở đây là mô phỏng' },
      say: {
        en: 'And one honest note: real pages cannot force a collection, and cleanup may run late, or never. This app uses gc as a simulated hook to show the timing.',
        vi: 'Và một lưu ý trung thực: trang web thật không thể ép thu hồi, và phần dọn dẹp có thể chạy trễ, hoặc không chạy. Ứng dụng này dùng gc như một hook mô phỏng để cho thấy thời điểm chạy.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'A collection only queues the cleanup. It never interrupts code.', vi: 'Việc thu hồi chỉ xếp phần dọn dẹp vào hàng đợi. Nó không bao giờ ngắt code.' },
      { en: 'Cleanup runs in its own Task, after the current microtasks.', vi: 'Dọn dẹp chạy trong một Task riêng, sau các microtask hiện tại.' },
      { en: 'Tasks run in queue order, with microtasks drained after each.', vi: 'Các Task chạy theo thứ tự hàng đợi, và microtask chạy hết sau mỗi Task.' },
    ],
    model: {
      en: 'Task → microtasks → cleanup Task → microtasks',
      vi: 'Task → microtask → Task dọn dẹp → microtask',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: after gc, microtask, cleanup held value, cleanup microtask, and timeout 0.',
          vi: 'Vậy thứ tự cuối cùng là: after gc, microtask, cleanup held value, cleanup microtask, và timeout 0.',
        },
      },
      {
        say: {
          en: 'Keep this model: finish the current Task, drain every microtask, then take the next Task. Cleanup callbacks are just one more kind of Task.',
          vi: 'Hãy giữ mô hình này: chạy xong Task hiện tại, chạy hết các microtask, rồi lấy Task tiếp theo. Callback dọn dẹp chỉ là thêm một loại Task nữa.',
        },
        pause: 2,
      },
    ],
  },
})
