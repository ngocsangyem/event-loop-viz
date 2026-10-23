import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'message-channel-vs-timeout',
  panels: ['webApis', 'tasks'],
  intro: {
    question: {
      en: 'A zero millisecond timer, and a message sent through a channel… which one runs first?',
      vi: 'Một timer không mili giây, và một message gửi qua channel… cái nào chạy trước?',
    },
    lines: [
      {
        say: {
          en: 'This script sets a zero millisecond timer. Then it posts a message through a MessageChannel, to a listener on the other port.',
          vi: 'Đoạn script này đặt một timer không mili giây. Sau đó nó gửi một message qua MessageChannel, tới một listener ở port bên kia.',
        },
      },
      {
        say: {
          en: 'Both will print one line. Before we run it, guess which line comes first.',
          vi: 'Cả hai sẽ in ra một dòng. Trước khi chạy, bạn hãy đoán xem dòng nào đến trước.',
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
        en: 'Next, the Web APIs. They belong to the browser. A timer counts down here, outside the stack.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Timer đếm giờ ở đây, bên ngoài Call Stack.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When a timer is done, or a message arrives, the callback becomes a Task and waits in the Task Queue. Timers and messages are different task sources. This picture draws them in one line, but the spec does not order them against each other.',
        vi: 'Khi timer hết giờ, hoặc khi có message đến, callback trở thành một Task và xếp hàng trong Task Queue, hàng đợi task. Timer và message là hai nguồn task khác nhau. Hình minh họa vẽ chúng chung một hàng, nhưng đặc tả không quy định thứ tự giữa chúng.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread. It only gets a turn when the stack is empty. Then it takes the next Task.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai. Nó chỉ được lượt khi stack đã trống. Lúc đó nó lấy Task tiếp theo.',
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
        en: 'Line one creates the channel. Line two attaches a listener to port one, but nothing is sent yet. Then setTimeout hands its callback to the browser timer, and returns right away.',
        vi: 'Dòng một tạo channel. Dòng hai gắn một listener vào port một, nhưng chưa có gì được gửi. Rồi setTimeout giao callback cho timer của trình duyệt, và trả về ngay.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'timer' } },
      focus: 'tasks',
      say: {
        en: 'The zero millisecond timer is due almost at once, so it queues its callback as a Task. It is the first one in line, behind the running script.',
        vi: 'Timer không mili giây hết giờ gần như ngay lập tức, nên nó đưa callback vào hàng đợi thành một Task. Nó đứng đầu hàng, ngay sau script đang chạy.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' } },
      focus: 'tasks',
      note: { en: 'two sources, one line', vi: 'hai nguồn, một hàng' },
      say: {
        en: 'Now port two dot postMessage. The message does not call the listener directly. It queues a Task of its own, and it lands behind the timer.',
        vi: 'Giờ đến port two chấm postMessage. Tin nhắn không gọi listener trực tiếp. Nó xếp vào hàng một Task riêng, và đứng sau timer.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script Task is finished, and the call stack is empty. Now the event loop must choose between two Tasks from two different sources.',
        vi: 'Task của script đã xong, Call Stack trống. Giờ event loop phải chọn giữa hai Task đến từ hai nguồn khác nhau.',
      },
      pause: 1,
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'loop',
      note: { en: 'browser chooses', vi: 'trình duyệt tự chọn' },
      say: {
        en: 'The HTML spec does not say which source goes first. The browser may choose. Chrome takes them in the order they were queued, so the timer goes first.',
        vi: 'Đặc tả HTML không nói nguồn nào đi trước. Trình duyệt được tự chọn. Chrome lấy theo thứ tự đã xếp hàng, nên timer đi trước.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'console', text: 'timeout0' },
      focus: 'console',
      say: {
        en: 'The timer callback runs and prints timeout zero.',
        vi: 'Callback của timer chạy và in ra timeout0.',
      },
    },
    {
      at: { k: 'task:begin', nth: 3 },
      focus: 'tasks',
      say: {
        en: 'That Task ends. The message Task has waited all along, so now it is taken from the queue.',
        vi: 'Task đó kết thúc. Task của message vẫn chờ từ nãy, nên giờ nó được lấy ra khỏi hàng đợi.',
      },
    },
    {
      at: { k: 'console', text: 'message' },
      focus: 'console',
      say: {
        en: 'The listener runs, and prints message.',
        vi: 'Listener chạy, và in ra message.',
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
      title: { en: 'Messages are Tasks too', vi: 'Tin nhắn cũng là Task' },
      say: {
        en: 'Why this order? First: postMessage never runs the listener on the spot. It queues a Task, just like a timer does. Neither can interrupt the script.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: postMessage không bao giờ chạy listener ngay tại chỗ. Nó xếp một Task vào hàng đợi, giống như timer. Cả hai đều không thể ngắt script.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'Task sources have no spec order', vi: 'Đặc tả không định thứ tự giữa các nguồn' },
      say: {
        en: 'Second: the spec only orders Tasks inside one source. Between two sources, the browser decides. Chrome happens to follow the queueing order, but that is its behavior, not a guarantee. Other engines can differ.',
        vi: 'Thứ hai: đặc tả chỉ quy định thứ tự các Task trong cùng một nguồn. Giữa hai nguồn, trình duyệt quyết định. Chrome tình cờ theo thứ tự xếp hàng, nhưng đó là hành vi của Chrome, không phải bảo đảm. Môi trường khác có thể khác.',
      },
    },
    {
      focus: 'webApis',
      title: { en: 'Timer registered first', vi: 'Timer đăng ký trước' },
      say: {
        en: 'Third: here the timer was set before the message was posted. In Chrome, post the message first and message comes out first. Do not build code that depends on this order.',
        vi: 'Thứ ba: ở đây timer được đặt trước khi message được gửi. Trong Chrome, nếu gửi message trước thì nó sẽ ra trước. Đừng viết code phụ thuộc vào thứ tự này.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'postMessage queues a Task. It never runs the listener right away.', vi: 'postMessage tạo một Task. Nó không chạy listener ngay.' },
      { en: 'The spec orders Tasks within one source, not across sources.', vi: 'Đặc tả chỉ định thứ tự trong một nguồn, không phải giữa các nguồn.' },
      { en: 'Chrome follows queueing order here. Do not rely on it.', vi: 'Chrome theo thứ tự xếp hàng ở đây. Đừng dựa vào nó.' },
    ],
    model: {
      en: 'Each source queues Tasks → the browser picks the next one',
      vi: 'Mỗi nguồn xếp Task → trình duyệt chọn Task tiếp theo',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: timeout zero, then message.',
          vi: 'Vậy thứ tự cuối cùng là: timeout0, rồi message.',
        },
      },
      {
        say: {
          en: 'Keep this model: two different sources are two separate lines of Tasks, and the spec does not rank them. Never depend on the order between them.',
          vi: 'Hãy giữ mô hình này: hai nguồn khác nhau là hai hàng Task riêng, và đặc tả không xếp hạng chúng. Đừng bao giờ phụ thuộc vào thứ tự giữa chúng.',
        },
        pause: 2,
      },
    ],
  },
})
