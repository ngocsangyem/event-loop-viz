import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'request-animation-frame',
  panels: ['webApis', 'tasks', 'microtasks'],
  intro: {
    question: {
      en: 'Two animation frame callbacks, the first with a promise inside… when does that promise run?',
      vi: 'Hai callback animation frame, callback đầu có một promise bên trong… promise đó chạy lúc nào?',
    },
    lines: [
      {
        say: {
          en: 'This script asks the browser for two animation frame callbacks. The first one also creates a promise reaction inside itself.',
          vi: 'Script này nhờ trình duyệt gọi hai callback animation frame. Callback đầu tiên còn tạo thêm một promise reaction ngay bên trong nó.',
        },
      },
      {
        say: {
          en: 'Three lines get printed. Does the promise run right after the first callback, or only after both callbacks? Take a guess.',
          vi: 'Ba dòng sẽ được in ra. Promise chạy ngay sau callback đầu, hay phải đợi cả hai callback chạy xong? Bạn thử đoán xem.',
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
        en: 'Next, the Web APIs, the part of the browser outside the engine. A request animation frame callback waits here, until the browser is ready to draw the next frame.',
        vi: 'Tiếp theo là Web APIs, phần của trình duyệt nằm ngoài engine. Callback của request animation frame chờ ở đây, cho tới khi trình duyệt sẵn sàng vẽ khung hình kế tiếp.',
      },
    },
    {
      focus: 'tasks',
      say: {
        en: 'When that moment comes, the callbacks line up in the Task Queue, the queue of Tasks. The real browser runs them in its rendering step, but the picture is the same: one callback at a time, in order.',
        vi: 'Khi thời điểm đó đến, các callback xếp hàng trong Task Queue, hàng đợi task. Trình duyệt thật chạy chúng ở bước render, nhưng hình dung vẫn giống nhau: từng callback một, theo thứ tự.',
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
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only acts when the stack is empty.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ hành động khi stack đã trống.',
      },
      pause: 1.3,
    },
  ],
  steps: [
    {
      at: { k: 'task:begin' },
      focus: 'loop',
      say: {
        en: 'The script itself is a Task. The event loop takes it from the queue and starts running it.',
        vi: 'Bản thân script là một Task. Event loop lấy nó ra khỏi hàng đợi và bắt đầu chạy.',
      },
    },
    {
      at: { k: 'webapi:start' },
      focus: 'webApis',
      note: { en: 'asks for a frame', vi: 'xin một khung hình' },
      say: {
        en: 'Line one calls request animation frame. It does not run the callback. It hands the callback to the browser and returns right away.',
        vi: 'Dòng một gọi request animation frame. Nó không chạy callback, mà giao callback cho trình duyệt rồi trả về ngay.',
      },
    },
    {
      at: { k: 'webapi:start', nth: 2 },
      focus: 'webApis',
      say: {
        en: 'Line two does the same for the second callback. Now two callbacks wait in the Web APIs, in the order they were requested.',
        vi: 'Dòng hai làm y hệt cho callback thứ hai. Giờ có hai callback đang chờ trong Web APIs, đúng theo thứ tự đã xin.',
      },
    },
    {
      at: { k: 'task:end' },
      focus: 'stack',
      say: {
        en: 'The script is finished and the call stack is empty. Nothing has been printed yet. The callbacks need a frame to be drawn first.',
        vi: 'Script đã xong và Call Stack trống. Chưa có gì được in ra. Các callback phải chờ tới lúc vẽ khung hình.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'task:queue', where: { source: 'animation-frame' } },
      focus: 'tasks',
      note: { en: 'next frame is due', vi: 'đến lượt vẽ khung hình' },
      say: {
        en: 'At the next frame, the browser is ready to draw. In this simulator that is four milliseconds later. Both callbacks leave the Web APIs and are shown lined up in the Task Queue, in the order they were requested.',
        vi: 'Đến khung hình kế tiếp, trình duyệt sẵn sàng vẽ. Trong trình mô phỏng, đó là bốn mili giây sau. Cả hai callback rời Web APIs và được vẽ xếp hàng trong Task Queue, đúng thứ tự đã xin.',
      },
    },
    {
      at: { k: 'console', text: 'raf1' },
      focus: 'console',
      say: {
        en: 'The event loop runs the first callback. It prints raf1.',
        vi: 'Event loop chạy callback đầu tiên. Nó in ra raf1.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      say: {
        en: 'Next the callback calls promise dot resolve, then dot then. The promise is already fulfilled, so its reaction goes straight into the Microtask Queue. The callback is not finished yet.',
        vi: 'Tiếp theo callback gọi promise chấm resolve rồi chấm then. Promise đã fulfilled sẵn, nên reaction của nó vào thẳng Microtask Queue. Callback vẫn chưa xong.',
      },
    },
    {
      at: { k: 'task:end' , after: { k: 'job:enqueue' } },
      focus: 'stack',
      say: {
        en: 'Now the first callback ends, and the call stack is empty again. Look at the Task Queue: raf2 is next in line.',
        vi: 'Giờ callback đầu kết thúc, và Call Stack lại trống. Hãy nhìn Task Queue: raf2 là callback kế tiếp.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'raf1-micro' },
      focus: 'microtasks',
      note: { en: 'microtask goes first', vi: 'microtask chạy trước' },
      say: {
        en: 'But the stack is empty, so the event loop checks the Microtask Queue first. The promise reaction runs and prints raf1 micro. It cuts in front of raf2.',
        vi: 'Nhưng stack đã trống, nên event loop kiểm tra Microtask Queue trước. Promise reaction chạy và in ra raf1 micro. Nó chen lên trước raf2.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'checkpoint:end', after: { k: 'job:begin' } },
      focus: 'microtasks',
      say: {
        en: 'The Microtask Queue is empty, so this checkpoint is over.',
        vi: 'Microtask Queue đã trống, nên lượt xử lý microtask kết thúc.',
      },
    },
    {
      at: { k: 'console', text: 'raf2' },
      focus: 'console',
      say: {
        en: 'Now the second callback runs. It prints raf2.',
        vi: 'Giờ callback thứ hai chạy. Nó in ra raf2.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'Again the stack empties, the checkpoint finds nothing, and nothing else is waiting. The run is complete.',
        vi: 'Stack lại trống, lượt xử lý microtask không có gì, và cũng không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'webApis',
      title: { en: 'A frame callback waits for a frame', vi: 'Callback chờ khung hình' },
      say: {
        en: 'Why this order? First: request animation frame never runs its callback at once. It waits for the browser to draw the next frame, so the script finishes first.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: request animation frame không bao giờ chạy callback ngay. Nó chờ trình duyệt vẽ khung hình kế tiếp, nên script luôn chạy xong trước.',
      },
    },
    {
      focus: 'stack',
      title: { en: 'Callbacks run one by one', vi: 'Callback chạy từng cái một' },
      say: {
        en: 'Second: the callbacks of one frame do not run together. Each one runs on its own, to completion, and then the stack is empty again.',
        vi: 'Thứ hai: các callback của cùng một khung hình không chạy cùng lúc. Mỗi callback chạy riêng, chạy đến hết, rồi stack lại trống.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'Empty stack means microtasks run', vi: 'Stack trống thì microtask chạy' },
      say: {
        en: 'Third: a microtask checkpoint happens whenever the stack becomes empty. That is why the promise reaction from raf1 runs before raf2 starts.',
        vi: 'Thứ ba: lượt xử lý microtask xảy ra mỗi khi stack trở nên trống. Vì vậy promise reaction của raf1 chạy trước khi raf2 bắt đầu.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Request animation frame callbacks wait for the next frame, after the script.',
        vi: 'Callback của request animation frame chờ khung hình kế tiếp, sau khi script chạy xong.',
      },
      {
        en: 'Each callback runs alone, to completion, on its own turn.',
        vi: 'Mỗi callback chạy riêng, chạy đến hết, trong lượt của nó.',
      },
      {
        en: 'When the stack empties, every microtask runs before the next callback.',
        vi: 'Khi stack trống, mọi microtask chạy trước callback kế tiếp.',
      },
    ],
    model: {
      en: 'One callback → every microtask → the next callback',
      vi: 'Một callback → toàn bộ microtask → callback tiếp theo',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: raf1, raf1 micro, and raf2.',
          vi: 'Vậy thứ tự cuối cùng là: raf1, raf1 micro, và raf2.',
        },
      },
      {
        say: {
          en: 'Keep this model: run one callback, drain every microtask once the stack is empty, then move to the next one.',
          vi: 'Hãy giữ mô hình này: chạy một callback, khi stack trống thì chạy hết microtask, rồi mới sang callback kế tiếp.',
        },
        pause: 2,
      },
    ],
  },
})
