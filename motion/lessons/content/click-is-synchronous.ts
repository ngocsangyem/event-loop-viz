import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'click-is-synchronous',
  panels: ['microtasks'],
  intro: {
    question: {
      en: 'The script clicks a button itself. When do the listeners\' microtasks run?',
      vi: 'Chính script gọi click trên một button. Microtask của các listener chạy lúc nào?',
    },
    lines: [
      {
        say: {
          en: 'This is almost the same setup as the message listeners example: two click listeners, and each one creates a promise reaction.',
          vi: 'Đây gần như là cùng một tình huống với ví dụ message listeners: hai listener cho sự kiện click, và mỗi listener tạo một promise reaction.',
        },
      },
      {
        say: {
          en: 'But this time the script itself calls dot click on a button, and then prints one more line. Does C1 micro still run before C2? Take a guess.',
          vi: 'Nhưng lần này chính script gọi chấm click trên một cái button, rồi in thêm một dòng nữa. C1 micro có còn chạy trước C2 không? Bạn thử đoán xem.',
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
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks wait in the Microtask Queue, the queue of microtasks. This example does not need any timer or other Task, so this is the only queue we need.',
        vi: 'Callback của promise xếp trong Microtask Queue, hàng đợi microtask. Ví dụ này không cần timer hay Task nào khác, nên đây là hàng đợi duy nhất ta cần.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only acts when the stack is empty. Then it runs every microtask.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ hành động khi stack đã trống. Lúc đó nó chạy hết các microtask.',
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
        vi: 'Bản thân script là một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'appendChild' } },
      focus: 'stack',
      say: {
        en: 'The first two lines create a button and add it to the page. Plain synchronous calls, nothing special.',
        vi: 'Hai dòng đầu tạo một button và thêm nó vào trang. Chỉ là những lời gọi đồng bộ bình thường, không có gì đặc biệt.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'addEventListener' }, nth: 2 },
      focus: 'stack',
      say: {
        en: 'Then two click listeners are registered. They do not run now. The browser just remembers them, in order.',
        vi: 'Sau đó hai listener click được đăng ký. Chúng chưa chạy. Trình duyệt chỉ ghi nhớ chúng, theo thứ tự.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'click' } },
      focus: 'stack',
      note: { en: 'click runs on our stack', vi: 'click chạy trên stack của ta' },
      say: {
        en: 'Now dot click. The browser calls the listeners right here, inside this call, on the same stack. No new Task is queued. The script is still running.',
        vi: 'Giờ là chấm click. Trình duyệt gọi các listener ngay tại đây, bên trong lời gọi này, trên cùng một stack. Không có Task mới nào được xếp hàng. Script vẫn đang chạy.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'console', text: 'C1' },
      focus: 'console',
      say: {
        en: 'The first listener runs on top of the click frame. It prints C1.',
        vi: 'Listener đầu tiên chạy phía trên frame của click. Nó in ra C1.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Its promise reaction goes into the Microtask Queue.',
        vi: 'Promise reaction của nó được đưa vào Microtask Queue.',
      },
    },
    {
      at: { k: 'console', text: 'C2' },
      focus: 'stack',
      note: { en: 'stack is NOT empty', vi: 'stack CHƯA trống' },
      say: {
        en: 'The first listener returns, but the script and the click call are still on the stack. The stack is not empty, so the microtask has to wait. The second listener runs and prints C2.',
        vi: 'Listener đầu tiên trả về, nhưng script và lời gọi click vẫn còn trên stack. Stack chưa trống, nên microtask phải chờ. Listener thứ hai chạy và in ra C2.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The second reaction joins the queue. Now two microtasks are waiting, in order.',
        vi: 'Reaction thứ hai nhập vào hàng đợi. Giờ có hai microtask đang chờ, theo thứ tự.',
      },
    },
    {
      at: { k: 'console', text: 'after click' },
      focus: 'console',
      say: {
        en: 'Both listeners are done, so dot click returns, and the script goes on to its last line. It prints after click. The microtasks still have not had their turn.',
        vi: 'Cả hai listener đã xong, nên chấm click trả về, và script chạy tiếp tới dòng cuối. Nó in ra after click. Các microtask vẫn chưa tới lượt.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script is finished and, at last, the call stack is empty. Only now can the event loop run the microtasks.',
        vi: 'Script đã xong và cuối cùng Call Stack cũng trống. Chỉ đến lúc này event loop mới chạy được các microtask.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'C1 micro' },
      focus: 'microtasks',
      note: { en: 'drained after the script', vi: 'chạy sau khi script xong' },
      say: {
        en: 'The event loop empties the Microtask Queue, first in, first out. The first reaction prints C1 micro.',
        vi: 'Event loop làm trống Microtask Queue, vào trước ra trước. Reaction đầu tiên in ra C1 micro.',
      },
    },
    {
      at: { k: 'console', text: 'C2 micro' },
      focus: 'console',
      say: {
        en: 'Then the second reaction prints C2 micro.',
        vi: 'Rồi reaction thứ hai in ra C2 micro.',
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
      focus: 'stack',
      title: { en: 'Dot click runs on your stack', vi: 'Chấm click chạy trên stack của bạn' },
      say: {
        en: 'Why this order? First: calling dot click dispatches the event synchronously. The listeners run inside your own call, on the current stack, not as a new Task.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: gọi chấm click phát event một cách đồng bộ. Các listener chạy bên trong lời gọi của bạn, trên stack hiện tại, không phải một Task mới.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Microtasks need an empty stack', vi: 'Microtask cần stack trống' },
      say: {
        en: 'Second: the rule does not care about listeners. Microtasks run when the JavaScript stack is empty. Here the script is still on the stack the whole time, so they wait.',
        vi: 'Thứ hai: quy tắc không nằm ở chỗ giữa các listener, mà ở chỗ stack JavaScript có trống hay không. Ở đây script vẫn nằm trên stack suốt thời gian đó, nên chúng phải chờ.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'Compare with a real click', vi: 'So với một cú click thật' },
      say: {
        en: 'Third: a real user click is different. The event loop calls each listener on an empty stack, so a checkpoint follows each one, like in the message listeners example. Same listeners, different order.',
        vi: 'Thứ ba: một cú click thật của người dùng thì khác. Event loop gọi từng listener khi stack trống, nên sau mỗi listener có một lượt microtask, như trong ví dụ message listeners. Cùng listener, thứ tự khác.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Dot click calls the listeners synchronously, on the current stack.',
        vi: 'Chấm click gọi các listener một cách đồng bộ, trên stack hiện tại.',
      },
      {
        en: 'Microtasks wait until the JavaScript stack is empty.',
        vi: 'Microtask chờ đến khi stack JavaScript trống.',
      },
      {
        en: 'So here they run after the whole script, not between listeners.',
        vi: 'Nên ở đây chúng chạy sau cả script, chứ không chạy giữa các listener.',
      },
    ],
    model: {
      en: 'Stack not empty → microtasks wait',
      vi: 'Stack chưa trống → microtask chờ',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: C1, C2, after click, C1 micro, and C2 micro.',
          vi: 'Vậy thứ tự cuối cùng là: C1, C2, after click, C1 micro, và C2 micro.',
        },
      },
      {
        say: {
          en: 'Keep this model: microtasks run only when the stack is empty. Ask who called the listener, you or the event loop.',
          vi: 'Hãy giữ mô hình này: microtask chỉ chạy khi stack trống. Hãy tự hỏi ai đã gọi listener, là bạn hay là event loop.',
        },
        pause: 2,
      },
    ],
  },
})
