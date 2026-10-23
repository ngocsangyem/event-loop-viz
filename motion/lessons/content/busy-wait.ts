import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'busy-wait',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A zero millisecond timer, then a loop that burns twenty milliseconds… what prints first?',
      vi: 'Một timer không mili giây, rồi một vòng lặp đốt hai mươi mili giây… cái gì in ra trước?',
    },
    lines: [
      {
        say: {
          en: 'This script sets a zero millisecond timer. Then it spins in a loop until twenty milliseconds have passed, and only then prints and creates a promise callback.',
          vi: 'Đoạn script này đặt một timer không mili giây. Rồi nó quay trong một vòng lặp cho đến khi trôi qua hai mươi mili giây, và chỉ sau đó mới in ra và tạo một callback của promise.',
        },
      },
      {
        say: {
          en: 'The timer was set first, and its delay is zero. Does it run first? Take a guess.',
          vi: 'Timer được đặt trước, và độ trễ của nó là không. Vậy nó có chạy trước không? Bạn hãy đoán thử.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. This is where JavaScript actually runs code, one frame at a time. While a frame is running, nothing else can run.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript thực sự chạy code, từng frame một. Khi một frame đang chạy, không có gì khác chạy được.',
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
        en: 'Promise callbacks wait in a different line: the Microtask Queue.',
        vi: 'Callback của promise xếp ở một hàng khác: Microtask Queue, hàng đợi microtask.',
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
      at: { k: 'timer:init' },
      focus: 'webApis',
      say: {
        en: 'Line one calls setTimeout. It hands the callback to the browser timer, with a delay of zero, and returns right away.',
        vi: 'Dòng một gọi setTimeout. Nó giao callback cho timer của trình duyệt, với độ trễ bằng không, rồi trả về ngay.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'The zero millisecond timer is due almost at once, so it puts its callback in the queue as a Task. But it has to wait, because the script Task is still running.',
        vi: 'Timer không mili giây hết giờ gần như ngay lập tức, nên nó đưa callback vào hàng đợi thành một Task. Nhưng nó phải chờ, vì Task của script vẫn đang chạy.',
      },
    },
    {
      at: { k: 'console', text: 'after busy wait' },
      focus: 'stack',
      note: { en: 'stack is blocked', vi: 'stack bị chiếm' },
      say: {
        en: 'Now the loop. Each pass calls Date dot now, and running code moves the clock forward. In this simulator that is a virtual clock, but a real tab behaves the same way. The script holds the stack, so the due timer cannot run. After twenty milliseconds the loop ends, and it prints after busy wait.',
        vi: 'Mỗi vòng lặp gọi Date chấm now. Chạy code tốn thời gian, nên đồng hồ chạy tới. Trong trình mô phỏng này đó là đồng hồ ảo, nhưng tab thật cũng hoạt động tương tự. Script giữ chặt stack suốt lúc đó, timer đến giờ vẫn không chạy được. Sau hai mươi mili giây vòng lặp xong, script in ra after busy wait.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Next, promise dot resolve is already fulfilled, so dot then puts its callback straight into the Microtask Queue.',
        vi: 'Tiếp theo, promise chấm resolve đã fulfilled sẵn, nên chấm then đưa callback của nó thẳng vào Microtask Queue.',
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
        en: 'Look at the Task Queue: the timer has been due for twenty milliseconds. But before any other Task, the event loop must empty the whole Microtask Queue.',
        vi: 'Hãy nhìn Task Queue: timer đã đến giờ từ hai mươi mili giây trước. Nhưng trước khi chạy bất kỳ Task nào khác, event loop phải làm trống toàn bộ Microtask Queue.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'microtask' },
      focus: 'console',
      say: {
        en: 'The promise callback runs and prints microtask.',
        vi: 'Callback của promise chạy và in ra microtask.',
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
      at: { k: 'task:begin', nth: 2 },
      focus: 'tasks',
      note: { en: '20 ms late', vi: 'trễ 20 ms' },
      say: {
        en: 'At last the event loop takes the timer Task. It was due at zero milliseconds, and now the clock reads about twenty. So it starts twenty milliseconds late.',
        vi: 'Cuối cùng event loop lấy Task của timer. Nó đến giờ từ mốc không mili giây, còn bây giờ đồng hồ chỉ khoảng hai mươi. Nên nó bắt đầu trễ hai mươi mili giây.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'console', text: 'timeout 0' },
      focus: 'console',
      say: {
        en: 'The timer callback prints timeout zero.',
        vi: 'Callback của timer in ra timeout 0.',
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
      title: { en: 'Running code takes time', vi: 'Chạy code tốn thời gian' },
      say: {
        en: 'Why this order? First: a Task always runs to completion, and running code moves the clock forward. A loop that spins for twenty milliseconds holds the stack for twenty milliseconds.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: một Task luôn chạy đến hết, và chạy code làm đồng hồ chạy tới. Một vòng lặp quay hai mươi mili giây sẽ giữ chặt stack trong hai mươi mili giây.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'A delay is a minimum', vi: 'Độ trễ chỉ là mức tối thiểu' },
      say: {
        en: 'Second: a timer delay is the earliest time it may run, not a promise. A due timer still waits for the stack to empty, so it starts late.',
        vi: 'Thứ hai: độ trễ của timer là thời điểm sớm nhất nó được phép chạy, không phải lời hứa. Timer đã đến giờ vẫn phải chờ stack trống, nên nó chạy trễ.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Microtasks still go first', vi: 'Microtask vẫn đi trước' },
      say: {
        en: 'Third: even a timer that has been due for a long time must wait for the microtasks. That is why microtask prints before timeout zero.',
        vi: 'Thứ ba: ngay cả timer đã đến giờ từ lâu cũng phải chờ microtask. Vì vậy microtask in ra trước timeout 0.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'In a browser tab, it freezes', vi: 'Trong tab trình duyệt, nó bị đơ' },
      say: {
        en: 'And in a real tab, this loop also blocks rendering and clicks for twenty milliseconds. Make the loop longer and the page freezes.',
        vi: 'Và trong một tab thật, vòng lặp này còn chặn cả việc vẽ giao diện và thao tác click trong hai mươi mili giây. Kéo vòng lặp dài hơn thì trang sẽ bị đơ.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'Running code advances the clock, and nothing else runs meanwhile.', vi: 'Chạy code làm đồng hồ chạy tới, và trong lúc đó không gì khác chạy được.' },
      { en: 'A timer delay is a minimum. A busy script makes it late.', vi: 'Độ trễ của timer chỉ là tối thiểu. Script bận làm nó chạy trễ.' },
      { en: 'Microtasks still run before the late timer Task.', vi: 'Microtask vẫn chạy trước Task timer đến trễ.' },
    ],
    model: {
      en: 'The stack is busy → timers wait → microtasks → timer Task',
      vi: 'Stack bận → timer chờ → microtask → Task của timer',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: after busy wait, microtask, and timeout zero.',
          vi: 'Vậy thứ tự cuối cùng là: after busy wait, microtask, và timeout 0.',
        },
      },
      {
        say: {
          en: 'Keep this model: the event loop only acts when the stack is empty. A long script delays everything, even a timer that is already due.',
          vi: 'Hãy giữ mô hình này: event loop chỉ hành động khi stack trống. Một script chạy lâu làm trễ mọi thứ, kể cả timer đã đến giờ.',
        },
        pause: 2,
      },
    ],
  },
})
