import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'fetch-mock-api',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'A network response, a message posted three times, and a body to read… how do they interleave?',
      vi: 'Một response từ mạng, một message gửi ba lần, và một body cần đọc… chúng xen kẽ ra sao?',
    },
    lines: [
      {
        say: {
          en: 'This script calls fetch, then reads the response and its body. Inside it, a message channel delivers a message to itself three times in a row.',
          vi: 'Script này gọi fetch, rồi đọc response và phần body của nó. Bên trong, một message channel tự gửi message cho chính nó ba lần liên tiếp.',
        },
      },
      {
        say: {
          en: 'The network answer takes thirty milliseconds. Reading the body takes more time. Which of the messages sneak in before the user is printed? Take a guess.',
          vi: 'Câu trả lời từ mạng mất ba mươi mili giây. Đọc body còn mất thêm thời gian. Những message nào chen vào trước khi user được in ra? Bạn thử đoán xem.',
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
        en: 'Next, the Web APIs. They belong to the browser. A network request lives here while it travels, outside the JavaScript engine. In this app the response is simulated by the fetch comment line at the top, with a fixed delay.',
        vi: 'Tiếp theo là Web APIs. Phần này thuộc về trình duyệt. Một yêu cầu mạng nằm ở đây khi đang đi, bên ngoài JavaScript engine. Trong app này, response được giả lập bằng dòng chú thích fetch ở trên cùng, với độ trễ cố định.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When the answer arrives, it becomes a networking Task and waits in the Task Queue. Messages between ports are Tasks too.',
        vi: 'Khi câu trả lời về tới, nó trở thành một Task mạng và xếp hàng trong Task Queue, hàng đợi task. Message giữa các port cũng là Task.',
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
      at: { k: 'webapi:start' },
      focus: 'webApis',
      note: { en: 'network is outside JS', vi: 'mạng nằm ngoài JS' },
      say: {
        en: 'Line two calls fetch. The request is handed to the browser, and the network work happens outside JavaScript. Fetch returns a pending promise at once. Here the answer is simulated, with thirty milliseconds of delay.',
        vi: 'Dòng hai gọi fetch. Yêu cầu được giao cho trình duyệt, và việc mạng diễn ra bên ngoài JavaScript. Fetch trả về ngay một promise đang pending. Ở đây câu trả lời được giả lập, với độ trễ ba mươi mili giây.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Two dot then calls wait on that pending promise. They cannot run yet. The script goes on, and its own promise is already fulfilled, so that reaction goes into the Microtask Queue.',
        vi: 'Hai lời gọi chấm then chờ trên promise đang pending đó. Chúng chưa chạy được. Script chạy tiếp, và promise của chính nó đã fulfilled sẵn, nên reaction đó vào thẳng Microtask Queue.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script is finished and the call stack is empty. The request is still on its way.',
        vi: 'Script đã xong và Call Stack trống. Yêu cầu mạng vẫn đang trên đường đi.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'microtask' },
      focus: 'console',
      note: { en: 'no response yet', vi: 'chưa có response' },
      say: {
        en: 'The event loop empties the Microtask Queue first. The reaction the script created itself runs and prints microtask. No response can arrive before this, because thirty milliseconds have not passed.',
        vi: 'Event loop làm trống Microtask Queue trước. Reaction do chính script tạo ra chạy và in ra microtask. Response không thể về trước bước này, vì chưa trôi qua ba mươi mili giây.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'networking' } },
      focus: 'tasks',
      say: {
        en: 'Thirty milliseconds later the response arrives. It leaves the Web APIs and becomes a networking Task in the Task Queue.',
        vi: 'Ba mươi mili giây sau, response về tới. Nó rời Web APIs và trở thành một Task mạng trong Task Queue.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The event loop runs that Task. It fulfills the fetch promise, and the first dot then reaction goes into the Microtask Queue.',
        vi: 'Event loop chạy Task đó. Nó làm promise của fetch thành fulfilled, và reaction của chấm then đầu tiên vào Microtask Queue.',
      },
    },
    {
      at: { k: 'task:end', nth: 2 },
      focus: 'stack',
      say: {
        en: 'The networking Task is done and the stack is empty. Time for the microtasks.',
        vi: 'Task mạng đã xong và stack trống. Đến lúc chạy các microtask.',
      },
    },
    {
      at: { k: 'console', text: '200 true OK cors https://api.example.test/users application/json' },
      focus: 'console',
      say: {
        en: 'The reaction runs. It reads the response details: status, headers and the rest, and prints them in one line.',
        vi: 'Reaction chạy. Nó đọc các thông tin của response như status, header và vài thứ khác, rồi in tất cả trên một dòng.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' } },
      focus: 'tasks',
      note: { en: 'a message is a Task', vi: 'message là một Task' },
      say: {
        en: 'Next it creates a message channel and posts the first message. That queues a Task, but the callback is still running.',
        vi: 'Tiếp theo nó tạo một message channel và gửi message đầu tiên. Việc đó xếp một Task vào hàng đợi, nhưng callback vẫn đang chạy.',
      },
    },
    {
      at: { k: 'webapi:start', nth: 2 },
      focus: 'webApis',
      say: {
        en: 'Then it calls response dot json. Reading the body is more work, so it is handed to the browser as a new operation, and it queues a second networking Task behind the message.',
        vi: 'Rồi nó gọi response chấm json. Đọc body là thêm một việc nữa, nên nó được giao cho trình duyệt như một thao tác mới, và xếp thêm một Task mạng thứ hai phía sau message.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 3 },
      focus: 'microtasks',
      say: {
        en: 'The callback returns that pending promise, so the next dot then has to wait for it. A small extra microtask connects the two promises. It is still the same checkpoint.',
        vi: 'Callback trả về promise đang pending đó, nên chấm then kế tiếp phải chờ nó. Thêm một microtask nhỏ để nối hai promise lại. Vẫn là cùng một lượt xử lý microtask.',
      },
    },
    {
      at: { k: 'checkpoint:end', nth: 2 },
      focus: 'microtasks',
      say: {
        en: 'The Microtask Queue is empty, so the checkpoint is over.',
        vi: 'Microtask Queue đã trống, nên lượt xử lý microtask kết thúc.',
      },
    },
    {
      at: { k: 'console', text: 'hop 1' },
      focus: 'console',
      note: { en: 'body needs another Task', vi: 'body cần thêm một Task' },
      say: {
        en: 'The checkpoint ends. The Task Queue now holds the message Task, then the body Task, first in, first out. So the message goes first, and the listener prints hop 1.',
        vi: 'Lượt xử lý microtask kết thúc. Task Queue giờ có Task của message, rồi tới Task của body, vào trước ra trước. Nên message đi trước, và listener in ra hop 1.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' }, nth: 2 },
      focus: 'tasks',
      say: {
        en: 'The listener posts the next message. It lines up behind the body Task, because that was queued earlier.',
        vi: 'Listener gửi message kế tiếp. Nó xếp phía sau Task của body, vì Task body được xếp từ trước.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 4 },
      focus: 'microtasks',
      say: {
        en: 'Now the body Task runs. It finishes reading and resolves the json promise, and the last dot then goes into the Microtask Queue.',
        vi: 'Giờ Task của body chạy. Nó đọc xong và resolve promise của json, và chấm then cuối cùng vào Microtask Queue.',
      },
    },
    {
      at: { k: 'task:end', nth: 4 },
      focus: 'stack',
      say: {
        en: 'The body Task ends, and the stack is empty again.',
        vi: 'Task của body kết thúc, và stack lại trống.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 5 },
      focus: 'microtasks',
      say: {
        en: 'The promise from json passes its value along the chain, and queues the callback of the last dot then.',
        vi: 'Promise của json chuyền giá trị đi tiếp theo chuỗi, và xếp callback của chấm then cuối cùng vào hàng đợi.',
      },
    },
    {
      at: { k: 'console', text: 'user Ada' },
      focus: 'console',
      say: {
        en: 'When that Task ends, the stack is empty, so the microtasks run. The data reaches the last callback, and it prints user Ada, before hop 2.',
        vi: 'Khi Task đó kết thúc, stack trống, nên các microtask chạy. Dữ liệu đến callback cuối cùng, và nó in ra user Ada, trước hop 2.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:begin', nth: 5 },
      focus: 'loop',
      say: {
        en: 'No microtasks are left, so the event loop takes the next Task: the second message.',
        vi: 'Không còn microtask nào, nên event loop lấy Task kế tiếp: message thứ hai.',
      },
    },
    {
      at: { k: 'console', text: 'hop 2' },
      focus: 'console',
      say: {
        en: 'Now the second message Task runs. It prints hop 2, and posts a third message.',
        vi: 'Giờ Task của message thứ hai chạy. Nó in ra hop 2, và gửi message thứ ba.',
      },
    },
    {
      at: { k: 'task:queue', where: { source: 'port-message' }, nth: 3 },
      focus: 'tasks',
      say: {
        en: 'The third message is queued. Nothing else is waiting in front of it.',
        vi: 'Message thứ ba được xếp vào hàng đợi. Không còn gì chờ phía trước nó.',
      },
    },
    {
      at: { k: 'task:begin', nth: 6 },
      focus: 'loop',
      say: {
        en: 'That Task ends with an empty checkpoint, and the event loop takes the third message.',
        vi: 'Task đó kết thúc với một lượt microtask trống, và event loop lấy message thứ ba.',
      },
    },
    {
      at: { k: 'console', text: 'hop 3' },
      focus: 'console',
      say: {
        en: 'The third message runs and prints hop 3. It posts nothing more.',
        vi: 'Message thứ ba chạy và in ra hop 3. Nó không gửi thêm gì nữa.',
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
      focus: 'webApis',
      title: { en: 'The network works outside JS', vi: 'Mạng làm việc ngoài JS' },
      say: {
        en: 'Why this order? First: fetch does not block. The request travels outside JavaScript, so the script and its microtask finish long before the response arrives.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: fetch không chặn. Yêu cầu đi bên ngoài JavaScript, nên script và microtask của nó chạy xong từ lâu trước khi response về.',
      },
    },
    {
      focus: 'tasks',
      title: { en: 'Response and body are Tasks', vi: 'Response và body đều là Task' },
      say: {
        en: 'Second: in Chrome, the response arrives as a networking Task, and reading the body is another one. Between them, other Tasks that were queued earlier get their turn.',
        vi: 'Thứ hai: trong Chrome, response đến dưới dạng một Task mạng, và đọc body lại là một Task nữa. Giữa hai Task đó, các Task xếp hàng từ trước có lượt chạy của mình.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Microtasks drain after each Task', vi: 'Microtask chạy hết sau mỗi Task' },
      say: {
        en: 'Third: after every Task, the stack is empty, so all the microtasks run. That is why each promise step runs right at the end of the Task that settled it, never in the middle.',
        vi: 'Thứ ba: sau mỗi Task, stack trống, nên mọi microtask chạy hết. Vì vậy mỗi bước của promise chạy ngay cuối Task đã làm nó hoàn tất, không bao giờ chạy giữa chừng.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Network work happens outside JavaScript. Its result arrives as a Task.',
        vi: 'Việc mạng diễn ra bên ngoài JavaScript. Kết quả của nó đến dưới dạng một Task.',
      },
      {
        en: 'Reading the body takes another Task, queued behind earlier ones.',
        vi: 'Đọc body cần thêm một Task, xếp phía sau các Task đến trước.',
      },
      {
        en: 'After each Task, every microtask runs before the next Task.',
        vi: 'Sau mỗi Task, mọi microtask chạy trước Task tiếp theo.',
      },
    ],
    model: {
      en: 'Response → Task → every microtask → the next Task',
      vi: 'Response → Task → toàn bộ microtask → Task tiếp theo',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: microtask, the response line, hop 1, user Ada, hop 2, and hop 3.',
          vi: 'Vậy thứ tự cuối cùng là: microtask, dòng response, hop 1, user Ada, hop 2, và hop 3.',
        },
      },
      {
        say: {
          en: 'Keep this model: every async result comes back as a Task, then all its microtasks run, then the next Task.',
          vi: 'Hãy giữ mô hình này: mọi kết quả bất đồng bộ quay về dưới dạng một Task, rồi mọi microtask của nó chạy, rồi tới Task kế tiếp.',
        },
        pause: 2,
      },
    ],
  },
})
