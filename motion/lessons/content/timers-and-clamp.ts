import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'timers-and-clamp',
  panels: ['webApis', 'tasks'],
  intro: {
    question: {
      en: 'A function that keeps scheduling itself, and a three millisecond timer… where does the three millisecond timer land?',
      vi: 'Một hàm tự hẹn giờ chạy lại chính nó, và một timer ba mili giây… timer ba mili giây rơi vào chỗ nào?',
    },
    lines: [
      {
        say: {
          en: 'This script has a function that prints a number, then schedules itself again with a zero millisecond timer. It does that eight times. Beside it sits one more timer, set to three milliseconds.',
          vi: 'Script này có một hàm in ra một con số, rồi tự hẹn giờ chạy lại bằng timer không mili giây. Nó làm vậy tám lần. Bên cạnh còn một timer nữa, đặt ba mili giây.',
        },
      },
      {
        say: {
          en: 'It prints nine lines. Before we run it, guess where t3 appears among s1 to s8.',
          vi: 'Nó in ra chín dòng. Trước khi chạy, bạn hãy đoán t3 xuất hiện ở đâu giữa s1 đến s8.',
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
      note: { en: '0 ms ≠ run now', vi: '0 ms ≠ chạy ngay' },
      say: {
        en: 'Line three calls setTimeout. It does not run step. It hands it to the browser timer, and returns right away.',
        vi: 'Dòng ba gọi setTimeout. Nó không chạy step, mà giao step cho timer của trình duyệt, rồi trả về ngay.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'The zero millisecond timer is due almost at once, so it queues its callback as a Task. But it has to wait. The script Task is still running.',
        vi: 'Timer không mili giây hết giờ gần như ngay lập tức, nên nó đưa callback vào hàng đợi thành một Task. Nhưng nó phải chờ, vì Task của script vẫn đang chạy.',
      },
    },
    {
      at: { k: 'timer:init', nth: 2 },
      focus: 'webApis',
      say: {
        en: 'Line four sets the second timer, for three milliseconds. That is longer, so it stays in the Web APIs, still counting down.',
        vi: 'Dòng bốn đặt timer thứ hai, ba mili giây. Thời gian này dài hơn, nên nó nằm lại trong Web APIs, vẫn đang đếm ngược.',
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
      at: { k: 'task:begin', nth: 2 },
      focus: 'loop',
      say: {
        en: 'There are no microtasks to run here. So the event loop takes the next Task: the step timer, which has been waiting.',
        vi: 'Ở đây không có microtask nào để chạy. Nên event loop lấy Task kế tiếp: timer của step, đang chờ sẵn.',
      },
    },
    {
      at: { k: 'console', text: 's1' },
      focus: 'console',
      say: {
        en: 'Step runs for the first time. It counts to one and prints s1.',
        vi: 'Step chạy lần đầu. Nó đếm lên một và in ra s1.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 2 },
      focus: 'tasks',
      note: { en: 'a new timer each run', vi: 'mỗi lần một timer mới' },
      say: {
        en: 'Then step asks for another zero millisecond timer. Each timer is a brand new one, nested inside the one that just ran. This one is due at once, so its callback waits in the Task Queue.',
        vi: 'Rồi step xin một timer không mili giây nữa. Mỗi timer là một cái mới hoàn toàn, lồng bên trong cái vừa chạy. Cái này đến giờ ngay, nên callback của nó chờ trong Task Queue.',
      },
    },
    {
      at: { k: 'console', text: 's2' },
      focus: 'console',
      say: {
        en: 'The new timer is due, and it becomes the next Task. Step runs again and prints s2.',
        vi: 'Timer mới đã đến giờ, và nó trở thành Task kế tiếp. Step chạy lại và in ra s2.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 3 },
      focus: 'tasks',
      say: {
        en: 'Step schedules itself once more. The chain gets one level deeper, and the next Task is waiting.',
        vi: 'Step lại hẹn giờ cho chính nó. Chuỗi lồng nhau sâu thêm một cấp, và Task kế tiếp đã chờ sẵn.',
      },
    },
    {
      at: { k: 'console', text: 's3' },
      focus: 'console',
      say: {
        en: 'Same cycle: the timer is due, and step prints s3.',
        vi: 'Cùng một vòng: timer đến giờ, và step in ra s3.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 4 },
      focus: 'tasks',
      say: {
        en: 'Another zero millisecond timer, another level deeper.',
        vi: 'Lại một timer không mili giây, lại sâu thêm một cấp.',
      },
    },
    {
      at: { k: 'console', text: 's4' },
      focus: 'console',
      say: {
        en: 'And s4 prints.',
        vi: 'Và s4 được in ra.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 5 },
      focus: 'tasks',
      say: {
        en: 'Step schedules itself again. Still zero milliseconds, so far.',
        vi: 'Step lại hẹn giờ cho chính nó. Vẫn là không mili giây, cho tới giờ.',
      },
    },
    {
      at: { k: 'console', text: 's5' },
      focus: 'console',
      say: {
        en: 'Then s5 prints.',
        vi: 'Rồi s5 được in ra.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 6 },
      focus: 'tasks',
      say: {
        en: 'Once more, the timer is created with zero milliseconds.',
        vi: 'Một lần nữa, timer được tạo với không mili giây.',
      },
    },
    {
      at: { k: 'console', text: 's6' },
      focus: 'console',
      say: {
        en: 'Then s6 prints. Watch the next timer closely.',
        vi: 'Rồi s6 được in ra. Hãy để ý kỹ timer kế tiếp.',
      },
    },
    {
      at: { k: 'timer:init', nth: 8 },
      focus: 'webApis',
      note: { en: '0 ms becomes 4 ms', vi: '0 ms thành 4 ms' },
      say: {
        en: 'This timer is nested more than five levels deep. The browser refuses a delay shorter than four milliseconds here, so the zero is raised to four.',
        vi: 'Timer này lồng nhau hơn năm cấp. Trình duyệt không cho độ trễ ngắn hơn bốn mili giây ở mức này, nên số không bị nâng lên thành bốn.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 7 },
      focus: 'tasks',
      note: { en: 't3 jumps ahead', vi: 't3 chen lên trước' },
      say: {
        en: 'Now the step timer needs four milliseconds. But t3 only needs three, and it started earlier. So t3 comes due first, and its callback becomes a Task. The clock here is the simulator clock.',
        vi: 'Giờ timer của step cần bốn mili giây. Nhưng t3 chỉ cần ba, và nó đã bắt đầu từ trước. Nên t3 đến giờ trước, và callback của nó trở thành một Task. Đồng hồ ở đây là đồng hồ của trình mô phỏng.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 't3' },
      focus: 'console',
      say: {
        en: 'The event loop runs it, and t3 prints. It landed after s6, ahead of s7.',
        vi: 'Event loop chạy nó, và t3 được in ra. Nó nằm sau s6, trước s7.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 8 },
      focus: 'tasks',
      say: {
        en: 'The Task ends. The four millisecond wait is over, so the step callback becomes a Task.',
        vi: 'Task kết thúc. Bốn mili giây đã trôi qua, nên callback của step trở thành một Task.',
      },
    },
    {
      at: { k: 'console', text: 's7' },
      focus: 'console',
      say: {
        en: 'Step runs and prints s7.',
        vi: 'Step chạy và in ra s7.',
      },
    },
    {
      at: { k: 'timer:init', nth: 9 },
      focus: 'webApis',
      say: {
        en: 'Step schedules itself one last time. It is still nested deep, so it still waits four milliseconds.',
        vi: 'Step hẹn giờ cho chính nó lần cuối. Nó vẫn lồng sâu, nên vẫn phải chờ bốn mili giây.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' }, nth: 9 },
      focus: 'tasks',
      say: {
        en: 'Four more milliseconds pass, and the last step callback becomes a Task.',
        vi: 'Bốn mili giây nữa trôi qua, và callback step cuối cùng trở thành một Task.',
      },
    },
    {
      at: { k: 'console', text: 's8' },
      focus: 'console',
      say: {
        en: 'It runs after that delay and prints s8. Now n has reached eight, so step does not schedule again.',
        vi: 'Nó chạy sau khoảng chờ đó và in ra s8. Giờ n đã đạt tám, nên step không hẹn giờ nữa.',
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
      focus: 'tasks',
      title: { en: 'Each timer fires as its own Task', vi: 'Mỗi timer chạy thành một Task riêng' },
      say: {
        en: 'Why this order? First: every timer callback is a separate Task. Between two Tasks, the event loop can take another one that is ready. That is how t3 got in.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: mỗi callback của timer là một Task riêng. Giữa hai Task, event loop có thể lấy một Task khác đã sẵn sàng. Đó là cách t3 chen vào được.',
      },
    },
    {
      focus: 'webApis',
      title: { en: 'Zero milliseconds is a minimum, not now', vi: 'Không mili giây là tối thiểu, không phải ngay' },
      say: {
        en: 'Second: a delay is a minimum wait, not a promise to run at once. The callback still has to wait for its turn as a Task.',
        vi: 'Thứ hai: độ trễ là thời gian chờ tối thiểu, không phải lời hứa chạy ngay. Callback vẫn phải chờ tới lượt của nó như một Task.',
      },
    },
    {
      focus: 'webApis',
      title: { en: 'Deep nesting clamps to four ms', vi: 'Lồng sâu bị nâng lên bốn ms' },
      say: {
        en: 'Third: when timers are nested more than five levels deep, the browser enforces at least four milliseconds. That slow down is what lets a three millisecond timer overtake the chain.',
        vi: 'Thứ ba: khi các timer lồng nhau hơn năm cấp, trình duyệt buộc độ trễ ít nhất bốn mili giây. Sự chậm lại đó là thứ cho phép timer ba mili giây vượt lên chuỗi.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'Order follows due time', vi: 'Thứ tự theo thời điểm đến hạn' },
      say: {
        en: 'And timers run in order of when they come due, not in the order you wrote them. Note the simulator uses its own clock. In a real browser, where t3 lands depends on how long each step really takes.',
        vi: 'Và các timer chạy theo thời điểm đến hạn, không theo thứ tự bạn viết. Lưu ý trình mô phỏng dùng đồng hồ riêng. Trong trình duyệt thật, vị trí của t3 phụ thuộc mỗi bước thực sự chạy mất bao lâu.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Each timer callback runs as its own Task, after the stack is empty.',
        vi: 'Mỗi callback của timer chạy thành một Task riêng, sau khi stack trống.',
      },
      {
        en: 'A delay is a minimum wait. Timers nested more than five levels deep wait at least four milliseconds.',
        vi: 'Độ trễ là thời gian chờ tối thiểu. Timer lồng nhau hơn năm cấp chờ ít nhất bốn mili giây.',
      },
      {
        en: 'The timer that comes due first runs first, whatever its position in the code.',
        vi: 'Timer đến hạn trước thì chạy trước, bất kể vị trí trong code.',
      },
    ],
    model: {
      en: 'Timers run by due time, one Task each',
      vi: 'Timer chạy theo giờ đến hạn, mỗi cái một Task',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: s1 to s6, then t3, and finally s7 and s8.',
          vi: 'Vậy thứ tự cuối cùng là: s1 đến s6, rồi t3, và cuối cùng là s7 và s8.',
        },
      },
      {
        say: {
          en: 'Keep this model: a timer waits in the Web APIs, becomes a Task when it is due, and the earliest due Task goes first.',
          vi: 'Hãy giữ mô hình này: timer chờ trong Web APIs, thành một Task khi đến hạn, và Task đến hạn sớm nhất chạy trước.',
        },
        pause: 2,
      },
    ],
  },
})
