import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'message-port-transfer',
  panels: ['tasks'],
  intro: {
    question: {
      en: 'A port is handed to the receiver, with a message already waiting for it… is it the same port, and where does the early message go?',
      vi: 'Một port được trao cho bên nhận, và đã có một message chờ sẵn cho nó… đó có phải cùng một port không, và message gửi sớm đi đâu?',
    },
    lines: [
      {
        say: {
          en: 'This script makes two message channels. It sends a message through the first one, and hands one end of the second channel along with it.',
          vi: 'Đoạn script này tạo hai message channel. Nó gửi một message qua channel thứ nhất, và trao luôn một đầu của channel thứ hai đi kèm.',
        },
      },
      {
        say: {
          en: 'It also sends ping into the second channel, before anyone is listening. Where does ping go? And is the port that arrives the same object?',
          vi: 'Nó còn gửi ping vào channel thứ hai, khi chưa có ai lắng nghe. Ping sẽ đi đâu? Và port nhận được có phải cùng một object không?',
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
      focus: 'tasks',
      say: {
        en: 'Next, the Task Queue. When a message is ready to be delivered to a port, a Task is queued here, and the message handler runs inside it.',
        vi: 'Tiếp theo là Task Queue, hàng đợi task. Khi một message sẵn sàng được giao cho một port, một Task được xếp vào đây, và handler chạy bên trong Task đó.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It only acts when the stack is empty. It takes one Task at a time, and this example has no promises, so no microtasks are involved.',
        vi: 'Cuối cùng là Event Loop. Nó chỉ hành động khi stack đã trống. Nó lấy từng Task một, và ví dụ này không có promise nên không có microtask nào.',
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
      at: { k: 'frame:push', where: { label: 'MessageChannel' }, nth: 2 },
      focus: 'stack',
      say: {
        en: 'Lines one and two each create a message channel. A channel is a pair of connected ports: port one, and port two.',
        vi: 'Dòng một và dòng hai, mỗi dòng tạo một message channel. Một channel là một cặp port nối với nhau: port một và port hai.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'set onmessage' } },
      focus: 'stack',
      say: {
        en: 'Line three sets a message handler on the first channel. Nothing is queued, because no message has been sent yet.',
        vi: 'Dòng ba gắn một message handler cho channel thứ nhất. Chưa có gì được xếp hàng, vì chưa có message nào được gửi.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'postMessage' } },
      focus: 'stack',
      note: { en: 'hello + port two', vi: 'hello + port hai' },
      say: {
        en: 'Line eight posts hello. The second argument is a transfer list, with the second channel\'s port two inside. That port is being handed over to the receiver.',
        vi: 'Dòng tám gửi hello. Tham số thứ hai là danh sách transfer, chứa port hai của channel thứ hai. Port đó đang được trao cho bên nhận.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' } },
      focus: 'tasks',
      note: { en: 'delivery = a Task', vi: 'giao tin = một Task' },
      say: {
        en: 'Posting does not call the handler. It queues a Task to deliver the message. That Task has to wait, because the script is still running.',
        vi: 'Gửi message không gọi handler ngay. Nó xếp một Task để giao message. Task đó phải chờ, vì script vẫn đang chạy.',
      },
    },
    {
      at: { k: 'frame:push', where: { label: 'postMessage' }, nth: 2 },
      focus: 'stack',
      say: {
        en: 'Line nine posts ping into the other end of the second channel. Its peer is the port we just handed away.',
        vi: 'Dòng chín gửi ping vào đầu còn lại của channel thứ hai. Đầu đối diện của nó chính là port vừa được trao đi.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      note: { en: 'ping waits', vi: 'ping phải chờ' },
      say: {
        en: 'No Task was queued for ping. That port has no handler yet, so the message simply waits in the port\'s own message queue. The script is finished, and the stack is empty.',
        vi: 'Không có Task nào được xếp cho ping. Port đó chưa có handler, nên message chỉ nằm chờ trong hàng đợi message riêng của port. Script đã xong, và stack trống.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:begin', nth: 2 },
      focus: 'tasks',
      say: {
        en: 'Now the event loop takes the delivery Task. The handler on the first channel runs, with an event that carries the data and the transferred port.',
        vi: 'Giờ event loop lấy Task giao tin. Handler của channel thứ nhất chạy, với một event mang theo dữ liệu và port được chuyển.',
      },
    },
    {
      at: { k: 'console', text: 'received hello 1 false true' },
      focus: 'console',
      note: { en: 'new object!', vi: 'object mới!' },
      say: {
        en: 'It prints hello, and one port. Then false: the port that arrived is not the same object as port two. It is a new MessagePort, and the old one can no longer be used.',
        vi: 'Nó in ra hello, và một port. Rồi đến false: port nhận được không phải cùng object với port hai. Đó là một MessagePort mới, còn cái cũ không dùng được nữa.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' }, nth: 2 },
      focus: 'tasks',
      note: { en: 'handler wakes the port', vi: 'gắn handler là mở port' },
      say: {
        en: 'Now the handler sets a message handler on the new port. That starts the port, and the waiting ping finally gets a delivery Task. The new port is still connected to the same peer.',
        vi: 'Giờ handler này gắn một handler khác cho port mới. Việc đó khởi động port, và tin ping đang chờ cuối cùng cũng có một Task giao tin. Port mới vẫn nối với đúng đầu đối diện cũ.',
      },
    },
    {
      at: { k: 'task:end', nth: 2 },
      focus: 'stack',
      say: {
        en: 'The first handler ends, and the stack is empty again.',
        vi: 'Handler đầu tiên kết thúc, và stack lại trống.',
      },
    },
    {
      at: { k: 'task:begin', nth: 3 },
      focus: 'tasks',
      say: {
        en: 'The event loop takes the next Task: the delivery of ping, to the new port.',
        vi: 'Event loop lấy Task kế tiếp: giao ping cho port mới.',
      },
    },
    {
      at: { k: 'console', text: 'via transferred port ping' },
      focus: 'console',
      say: {
        en: 'The new handler runs, and prints ping. The message sent to the old peer reached the transferred port.',
        vi: 'Handler mới chạy, và in ra ping. Message gửi cho đầu đối diện cũ đã đến đúng port được chuyển.',
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
      title: { en: 'A message is delivered in a Task', vi: 'Tin nhắn được giao trong một Task' },
      say: {
        en: 'Why this order? First: postMessage never runs the handler right away. Delivery is always a separate Task, so it waits until the script has finished.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: postMessage không bao giờ chạy handler ngay. Việc giao tin luôn là một Task riêng, nên nó chờ đến khi script chạy xong.',
      },
    },
    {
      focus: 'console',
      title: { en: 'Transfer makes a new port', vi: 'Transfer tạo port mới' },
      say: {
        en: 'Second: transferring does not copy, and does not share. The receiver gets a brand new port object, so the comparison is false, but it still is a real MessagePort.',
        vi: 'Thứ hai: transfer không sao chép, cũng không chia sẻ. Bên nhận có một object port hoàn toàn mới, nên phép so sánh cho false, nhưng nó vẫn là một MessagePort thật.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'The link survives', vi: 'Liên kết vẫn còn' },
      say: {
        en: 'Third: the new port stays entangled with the old peer. Messages posted before the move are not lost. They wait in the port, and are delivered after.',
        vi: 'Thứ ba: port mới vẫn nối với đầu đối diện cũ. Message gửi trước khi chuyển không bị mất. Chúng nằm chờ trong port, và được giao sau đó.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'A handler starts the port', vi: 'Gắn handler là mở port' },
      say: {
        en: 'And a port only delivers once it is started. Setting the message handler starts it, so ping got its Task only then.',
        vi: 'Và một port chỉ giao tin khi đã được khởi động. Gắn message handler sẽ khởi động nó, nên ping chỉ có Task vào lúc đó.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'Each message is delivered in its own Task.', vi: 'Mỗi message được giao trong một Task riêng.' },
      { en: 'A transferred port arrives as a new object, still linked to its peer.', vi: 'Port được chuyển đến nơi như một object mới, vẫn nối với đầu đối diện.' },
      { en: 'Messages wait in the port until a handler starts it.', vi: 'Tin nhắn nằm chờ trong port cho đến khi có handler khởi động nó.' },
    ],
    model: {
      en: 'Post → wait → a Task delivers',
      vi: 'Gửi → chờ → một Task giao tin',
    },
    lines: [
      {
        say: {
          en: 'So the final output is: received hello, one port, false, true. Then, via transferred port, ping.',
          vi: 'Vậy kết quả cuối cùng là: received hello, một port, false, true. Rồi đến via transferred port, ping.',
        },
      },
      {
        say: {
          en: 'Keep this model: sending only queues work. A Task delivers each message later, and the stack must be empty first.',
          vi: 'Hãy giữ mô hình này: gửi tin chỉ là xếp việc vào hàng. Một Task sẽ giao từng message sau đó, và stack phải trống trước đã.',
        },
        pause: 2,
      },
    ],
  },
})
