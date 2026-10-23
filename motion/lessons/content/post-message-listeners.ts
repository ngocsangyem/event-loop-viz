import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'post-message-listeners',
  panels: ['tasks', 'microtasks'],
  intro: {
    question: {
      en: 'Two listeners for one message, each with a promise reaction… when does each reaction run?',
      vi: 'Hai listener cho cùng một message, mỗi listener có một promise reaction… mỗi reaction chạy lúc nào?',
    },
    lines: [
      {
        say: {
          en: 'Here two listeners are registered for the same message event. Each one prints a line, and each one creates a promise reaction.',
          vi: 'Ở đây hai listener được đăng ký cho cùng một message event. Mỗi listener in ra một dòng, và mỗi listener tạo một promise reaction.',
        },
      },
      {
        say: {
          en: 'Then the script posts one message. Does L1 micro run before L2, or after both listeners? Take a guess.',
          vi: 'Sau đó script gửi đi một message. L1 micro chạy trước L2, hay phải đợi cả hai listener chạy xong? Bạn thử đoán xem.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. It is where JavaScript runs code, one frame at a time. The frame on top is running right now.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript chạy code, từng frame một. Frame trên cùng là đoạn code đang chạy ngay lúc này.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'A posted message becomes a Task, and waits in the Task Queue until the stack is free.',
        vi: 'Một message được gửi đi trở thành một Task, và chờ trong Task Queue, hàng đợi task, cho tới khi stack rảnh.',
      },
    },
    {
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks wait in a different line: the Microtask Queue, the queue of microtasks.',
        vi: 'Callback của promise xếp ở một hàng khác: Microtask Queue, hàng đợi microtask.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only acts when the stack is empty. Then it runs every microtask, and only after that takes the next Task.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ hành động khi stack đã trống. Lúc đó nó chạy hết các microtask, rồi mới lấy Task tiếp theo.',
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
      at: { k: 'frame:push', where: { label: 'addEventListener' }, nth: 2 },
      focus: 'stack',
      say: {
        en: 'Lines one and two call add event listener. Nothing runs yet. The browser only remembers that these two listeners exist, in this order.',
        vi: 'Dòng một và dòng hai gọi add event listener. Chưa có gì chạy cả. Trình duyệt chỉ ghi nhớ rằng hai listener này tồn tại, theo đúng thứ tự đó.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'posted-message' } },
      focus: 'tasks',
      note: { en: 'one message, one Task', vi: 'một message, một Task' },
      say: {
        en: 'Line three calls post message. It does not call the listeners. It queues one Task for the message event, and returns. One message makes one Task, not one Task per listener.',
        vi: 'Dòng ba gọi post message. Nó không gọi các listener. Nó xếp một Task cho message event vào hàng đợi rồi trả về. Một message tạo ra một Task, không phải một Task cho mỗi listener.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script is finished and the call stack is empty. Nothing has been printed yet.',
        vi: 'Script đã xong và Call Stack trống. Chưa có gì được in ra.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'loop',
      say: {
        en: 'Now the event loop takes the message Task. Running it means dispatching the event: calling the listeners one after another.',
        vi: 'Giờ event loop lấy Task của message. Chạy Task này nghĩa là phát event: gọi lần lượt từng listener.',
      },
    },
    {
      at: { k: 'console', text: 'L1' },
      focus: 'console',
      say: {
        en: 'First listener. It prints L1.',
        vi: 'Listener đầu tiên. Nó in ra L1.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Then it creates an already fulfilled promise, and dot then puts its reaction into the Microtask Queue. The reaction cannot run yet, because the listener is still on the stack.',
        vi: 'Rồi nó tạo một promise đã fulfilled sẵn, và chấm then đưa reaction của nó vào Microtask Queue. Reaction chưa chạy được, vì listener vẫn còn trên stack.',
      },
    },
    {
      at: { k: 'checkpoint:begin', where: { reason: 'callback-end' } },
      focus: 'stack',
      note: { en: 'stack is empty!', vi: 'stack đã trống!' },
      say: {
        en: 'The first listener returns, and the call stack is empty. The message Task is not over, but with an empty stack the event loop runs a microtask checkpoint right now, before calling the next listener.',
        vi: 'Listener đầu tiên trả về, và Call Stack trống. Task của message chưa kết thúc, nhưng khi stack trống, event loop chạy lượt xử lý microtask ngay lúc này, trước khi gọi listener tiếp theo.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'console', text: 'L1 micro' },
      focus: 'microtasks',
      say: {
        en: 'The promise reaction runs and prints L1 micro.',
        vi: 'Promise reaction chạy và in ra L1 micro.',
      },
    },
    {
      at: { k: 'console', text: 'L2' },
      focus: 'console',
      say: {
        en: 'The checkpoint is over. Now the event loop calls the second listener. It prints L2.',
        vi: 'Lượt xử lý microtask kết thúc. Giờ event loop gọi listener thứ hai. Nó in ra L2.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'It also queues a promise reaction as a microtask.',
        vi: 'Nó cũng xếp một promise reaction vào hàng đợi như một microtask.',
      },
    },
    {
      at: { k: 'task:end', nth: 2 },
      focus: 'stack',
      say: {
        en: 'The second listener returns. There are no more listeners, so the message Task ends, and the stack is empty again.',
        vi: 'Listener thứ hai trả về. Không còn listener nào nữa, nên Task của message kết thúc, và stack lại trống.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'L2 micro' },
      focus: 'microtasks',
      say: {
        en: 'Again the event loop drains the Microtask Queue. The reaction runs and prints L2 micro.',
        vi: 'Event loop lại chạy hết Microtask Queue. Reaction chạy và in ra L2 micro.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'The queues are empty and nothing else is waiting. The run is complete.',
        vi: 'Các hàng đợi đã trống và không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'tasks',
      title: { en: 'One message, one Task', vi: 'Một message, một Task' },
      say: {
        en: 'Why this order? First: post message queues a single Task. The listeners are not separate Tasks. They are called one after another inside that Task.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: post message chỉ xếp một Task. Các listener không phải những Task riêng. Chúng được gọi lần lượt bên trong Task đó.',
      },
    },
    {
      focus: 'stack',
      title: { en: 'The event loop calls each listener', vi: 'Event loop gọi từng listener' },
      say: {
        en: 'Second: the message Task calls every listener itself, so no script of yours sits below them. Before each next call the stack is empty.',
        vi: 'Thứ hai: chính Task của message gọi từng listener, nên không có script nào của bạn nằm bên dưới. Trước mỗi lần gọi tiếp theo, stack đều trống.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'So a checkpoint follows each listener', vi: 'Nên sau mỗi listener có một lượt microtask' },
      say: {
        en: 'Third: that is why L1 micro comes before L2. A click example shows what happens when the script itself triggers the listeners.',
        vi: 'Thứ ba: đó là lý do L1 micro đến trước L2. Một ví dụ về click cho thấy điều gì xảy ra khi chính script kích hoạt các listener.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'One posted message is one Task.', vi: 'Một message được gửi là một Task.' },
      {
        en: 'The event loop calls each listener on an empty stack.',
        vi: 'Event loop gọi từng listener khi stack đang trống.',
      },
      {
        en: 'Microtasks run whenever the stack is empty, so after each listener.',
        vi: 'Microtask chạy mỗi khi stack trống, nên chạy sau từng listener.',
      },
    ],
    model: {
      en: 'Empty stack → every microtask',
      vi: 'Stack trống → chạy hết microtask',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: L1, L1 micro, L2, and L2 micro.',
          vi: 'Vậy thứ tự cuối cùng là: L1, L1 micro, L2, và L2 micro.',
        },
      },
      {
        say: {
          en: 'Keep this model: whenever the stack becomes empty, drain every microtask before anything else runs.',
          vi: 'Hãy giữ mô hình này: mỗi khi stack trở nên trống, hãy chạy hết mọi microtask trước khi bất cứ thứ gì khác chạy.',
        },
        pause: 2,
      },
    ],
  },
})
