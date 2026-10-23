import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'top-level-await',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A module with two awaits and a zero millisecond timer… where does the timer land?',
      vi: 'Một module có hai await và một timer không mili giây… timer rơi vào chỗ nào?',
    },
    lines: [
      {
        say: {
          en: 'This is a module, so it can use await at the top level, outside any function. It has a zero millisecond timer, and two awaits.',
          vi: 'Đây là một module, nên nó có thể dùng await ở cấp cao nhất, bên ngoài mọi hàm. Nó có một timer không mili giây, và hai lệnh await.',
        },
      },
      {
        say: {
          en: 'The first await is on a value that is ready. The second waits for a five millisecond timer. Guess the order of the four lines.',
          vi: 'Await đầu tiên chờ một giá trị đã sẵn sàng. Await thứ hai chờ một timer năm mili giây. Bạn hãy đoán thứ tự bốn dòng in ra.',
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
        en: 'The module is run by the event loop as a Task. The loop takes it from the queue and starts it.',
        vi: 'Module được event loop chạy như một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'console', text: 'a' },
      focus: 'console',
      say: {
        en: 'The module body goes on the stack, like an async function. Line one calls console dot log, and prints a.',
        vi: 'Thân module được đưa lên stack, giống như một async function. Dòng một gọi console chấm log, và in ra a.',
      },
    },
    {
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line two calls setTimeout. The callback goes to the browser timer, and the call returns right away.',
        vi: 'Dòng hai gọi setTimeout. Callback được giao cho timer của trình duyệt, và lời gọi trả về ngay.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'The zero millisecond timer is due almost at once, so it queues its callback as a Task. It has to wait, because the module is still running.',
        vi: 'Timer không mili giây hết giờ gần như ngay lập tức, nên nó đưa callback vào hàng đợi thành một Task. Nó phải chờ, vì module vẫn đang chạy.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Line three awaits null. That value is ready, so the rest of the module is queued as a microtask.',
        vi: 'Dòng ba await null. Giá trị đó đã sẵn sàng, nên phần còn lại của module được xếp vào hàng đợi như một microtask.',
      },
    },
    {
      at: { k: 'await:suspend' },
      focus: 'stack',
      note: { en: 'module pauses', vi: 'module tạm dừng' },
      say: {
        en: 'And the module pauses. Its frame leaves the stack, but it is only parked, not finished. The page keeps running.',
        vi: 'Và module tạm dừng. Frame của nó rời khỏi stack, nhưng chỉ bị cất đi, chứ chưa kết thúc. Trang vẫn tiếp tục chạy.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task ends, and the stack is empty. Now the event loop gets its turn.',
        vi: 'Task của script kết thúc, và stack trống. Giờ event loop mới tới lượt.',
      },
    },
    {
      at: { k: 'await:resume' },
      focus: 'microtasks',
      note: { en: 'resume in a microtask', vi: 'chạy tiếp bằng microtask' },
      say: {
        en: 'The timer Task has waited longest, but microtasks go first. The event loop runs the queued microtask, and the module wakes up exactly where it paused.',
        vi: 'Task của timer đã chờ lâu nhất, nhưng microtask luôn đi trước. Event loop chạy microtask đang xếp hàng, và module thức dậy đúng tại chỗ nó đã dừng.',
      },
    },
    {
      at: { k: 'console', text: 'b' },
      focus: 'console',
      say: {
        en: 'Line four runs, and prints b. That is before timeout 0, even though the timer was set earlier.',
        vi: 'Dòng bốn chạy, và in ra b. Nó đứng trước timeout 0, dù timer được đặt từ trước.',
      },
    },
    {
      at: { k: 'timer:init', nth: 2 },
      focus: 'webApis',
      say: {
        en: 'Line five creates a promise that starts a five millisecond timer. This time the timer really has to count down in the Web APIs.',
        vi: 'Dòng năm tạo một promise và bắt đầu timer năm mili giây. Lần này timer thực sự phải đếm giờ trong Web APIs.',
      },
    },
    {
      at: { k: 'await:suspend', nth: 2 },
      focus: 'stack',
      note: { en: 'pause again', vi: 'tạm dừng lần nữa' },
      say: {
        en: 'The promise is not ready, so the module pauses again. Nothing is queued for it. It will wait until that promise is resolved.',
        vi: 'Promise chưa sẵn sàng, nên module lại tạm dừng. Không có gì được xếp hàng cho nó. Nó sẽ chờ cho đến khi promise được resolve.',
      },
    },
    {
      at: { k: 'checkpoint:end' },
      focus: 'microtasks',
      say: {
        en: 'The Microtask Queue is empty, so the event loop can take the next Task.',
        vi: 'Microtask Queue đã trống, nên event loop có thể lấy Task tiếp theo.',
      },
    },
    {
      at: { k: 'console', text: 'timeout 0' },
      focus: 'tasks',
      note: { en: 'tasks run between', vi: 'Task chen vào giữa' },
      say: {
        en: 'The first timer Task runs, in the gap while the module is paused. It prints timeout 0.',
        vi: 'Task của timer đầu tiên chạy, ngay trong khoảng trống lúc module đang tạm dừng. Nó in ra timeout 0.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 2 },
      focus: 'tasks',
      say: {
        en: 'Nothing else can run, so the page waits. After five milliseconds, the second timer is done and its callback is queued as a Task.',
        vi: 'Không còn gì để chạy, nên trang chờ. Sau năm mili giây, timer thứ hai hết giờ và callback của nó được xếp vào hàng đợi thành một Task.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The event loop runs that Task. It resolves the promise, and that queues the rest of the module as a microtask again.',
        vi: 'Event loop chạy Task đó. Nó resolve promise, và việc đó lại xếp phần còn lại của module vào hàng đợi như một microtask.',
      },
    },
    {
      at: { k: 'await:resume', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The Task ends, the microtask runs, and the module wakes up for the second time.',
        vi: 'Task kết thúc, microtask chạy, và module thức dậy lần thứ hai.',
      },
    },
    {
      at: { k: 'console', text: 'c' },
      focus: 'console',
      say: {
        en: 'Line six runs, and prints c.',
        vi: 'Dòng sáu chạy, và in ra c.',
      },
    },
    {
      at: { k: 'job:begin', nth: 4 },
      focus: 'microtasks',
      say: {
        en: 'The module body is finished. The engine now settles the promises that stand for the module itself, with a few more small microtasks.',
        vi: 'Thân module đã chạy xong. Engine giờ settle các promise đại diện cho chính module, bằng vài microtask nhỏ nữa.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'The module is finished, and nothing else is waiting. The run is complete.',
        vi: 'Module đã kết thúc, và không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'stack',
      title: { en: 'A module can pause', vi: 'Module có thể tạm dừng' },
      say: {
        en: 'Why this order? First: top level await makes the whole module behave like an async function. At each await it pauses, and its frame leaves the stack.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: await ở cấp cao nhất khiến cả module hoạt động như một async function. Ở mỗi await nó tạm dừng, và frame của nó rời khỏi stack.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Resume is a microtask', vi: 'Chạy tiếp là một microtask' },
      say: {
        en: 'Second: awaiting a ready value resumes in a microtask. That runs before the timer Task, so b comes before timeout 0.',
        vi: 'Thứ hai: await một giá trị đã sẵn sàng sẽ chạy tiếp bằng một microtask. Microtask chạy trước Task của timer, nên b đứng trước timeout 0.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Pausing lets Tasks run', vi: 'Tạm dừng cho Task chạy' },
      say: {
        en: 'Third: a paused module does not block the page. While it waits for a timer, other Tasks run in between. That is why timeout 0 comes before c.',
        vi: 'Thứ ba: một module đang tạm dừng không chặn cả trang. Trong lúc chờ timer, các Task khác chạy xen vào. Vì vậy timeout 0 đứng trước c.',
      },
    },
    {
      focus: 'webApis',
      title: { en: 'A real wait takes a Task', vi: 'Chờ thật cần một Task' },
      say: {
        en: 'And when the awaited promise is waiting on a timer, the way back is longer: timer, then a Task, then a microtask. Only then does the module go on.',
        vi: 'Và khi promise được await đang chờ một timer, đường quay lại dài hơn: timer, rồi một Task, rồi một microtask. Chỉ khi đó module mới chạy tiếp.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'Top level await pauses the module like an async function.', vi: 'Await ở cấp cao nhất làm module tạm dừng như một async function.' },
      { en: 'A ready value resumes in a microtask, before any Task.', vi: 'Giá trị đã sẵn sàng thì chạy tiếp bằng microtask, trước mọi Task.' },
      { en: 'While paused, other Tasks can run in between.', vi: 'Trong lúc tạm dừng, các Task khác có thể chạy xen vào.' },
    ],
    model: {
      en: 'Await = pause → other work runs → resume',
      vi: 'Await = tạm dừng → việc khác chạy → chạy tiếp',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: a, b, timeout 0, and c.',
          vi: 'Vậy thứ tự cuối cùng là: a, b, timeout 0, và c.',
        },
      },
      {
        say: {
          en: 'Keep this model: every await is a pause. The page keeps running, and the code after it continues later as a microtask.',
          vi: 'Hãy giữ mô hình này: mỗi await là một lần tạm dừng. Trang vẫn chạy, và code phía sau nó sẽ tiếp tục sau đó bằng một microtask.',
        },
        pause: 2,
      },
    ],
  },
})
