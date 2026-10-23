import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'thenables',
  panels: ['microtasks'],
  intro: {
    question: {
      en: 'An await on a thenable, next to a three step promise chain… where does the await land?',
      vi: 'Một await trên thenable, cạnh một chuỗi promise ba bước… await rơi vào chỗ nào?',
    },
    lines: [
      {
        say: {
          en: 'This script starts an async function that awaits a plain object with a then method. Beside it runs a chain of three dot then ticks.',
          vi: 'Script này chạy một async function, trong đó await một object bình thường có phương thức then. Bên cạnh là một chuỗi ba chấm then, tick 1, 2 và 3.',
        },
      },
      {
        say: {
          en: 'It prints four lines. Before we run it, guess where the await thenable line lands among the ticks.',
          vi: 'Nó in ra bốn dòng. Trước khi chạy, bạn hãy đoán dòng await thenable nằm ở đâu giữa các tick.',
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
      focus: 'microtasks',
      say: {
        en: 'Promise callbacks, and the code after an await, wait in the Microtask Queue, a line of small jobs that run first in, first out.',
        vi: 'Callback của promise, và phần code phía sau await, xếp hàng trong Microtask Queue, hàng đợi microtask. Đó là hàng các việc nhỏ chạy theo thứ tự vào trước, ra trước.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Finally, the Event Loop. It is not a second thread running beside the stack. It only gets a turn when the stack is empty. Then it runs every microtask, until the queue is empty.',
        vi: 'Cuối cùng là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ được lượt khi stack đã trống. Lúc đó nó chạy hết các microtask, cho tới khi hàng đợi trống.',
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
      at: { k: 'frame:push', where: { label: '(anonymous)' } },
      focus: 'stack',
      note: { en: 'runs synchronously', vi: 'chạy đồng bộ' },
      say: {
        en: 'Line one made a promise that is already fulfilled. Line two calls the async function. Its body starts running right away, on the same stack.',
        vi: 'Dòng một tạo một promise đã fulfilled sẵn. Dòng hai gọi async function. Thân hàm chạy ngay lập tức, trên cùng Call Stack.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      note: { en: 'not the continuation', vi: 'chưa phải phần sau await' },
      say: {
        en: 'The function awaits an object with a then method. That is a thenable, not a real promise. The engine cannot know it behaves like a real promise. It queues a microtask whose job is to call that then method.',
        vi: 'Hàm await một object có phương thức then. Đó là thenable, không phải promise thật. Engine không thể biết nó có hành xử như một promise thật hay không. Nó xếp vào hàng một microtask, với nhiệm vụ là gọi phương thức then đó.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'frame:pop', where: { label: '(anonymous)' } },
      focus: 'stack',
      say: {
        en: 'Now the function pauses at the await. Its frame leaves the stack, and control returns to the script. The code after the await is not queued yet.',
        vi: 'Giờ hàm tạm dừng ở await. Frame của nó rời khỏi stack, và quyền điều khiển quay về script. Phần code sau await chưa được xếp hàng.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      note: { en: 'tick 1 is second', vi: 'tick 1 đứng thứ hai' },
      say: {
        en: 'Line three. The promise from line one is fulfilled, so the first dot then queues its callback, tick 1. It waits behind the thenable job.',
        vi: 'Dòng ba. Promise ở dòng một đã fulfilled, nên chấm then đầu tiên xếp callback của nó, tick 1, vào hàng. Nó đứng sau việc gọi thenable.',
      },
    },
    {
      at: { k: 'frame:pop', where: { label: 'then' }, nth: 3 },
      focus: 'code',
      say: {
        en: 'The second and third dot then calls attach to promises that are still pending. Nothing is queued for them yet.',
        vi: 'Chấm then thứ hai và thứ ba gắn vào các promise vẫn đang pending. Chưa có gì được xếp hàng cho chúng.',
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
      at: { k: 'job:enqueue', nth: 3 },
      focus: 'microtasks',
      note: { en: 'then runs, resolve called', vi: 'then chạy, gọi resolve' },
      say: {
        en: 'The event loop drains the Microtask Queue, oldest first. The thenable job runs. It calls the then method, and that method calls resolve. Only now is the awaited promise fulfilled, so the code after the await is queued, behind tick 1.',
        vi: 'Event loop chạy hết Microtask Queue, cái cũ nhất trước. Việc gọi thenable chạy trước. Nó gọi phương thức then, và phương thức đó gọi resolve. Chỉ đến lúc này promise được await mới fulfilled, nên phần code sau await mới được xếp hàng, sau tick 1.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'tick 1' },
      focus: 'console',
      say: {
        en: 'Next in line is tick 1, which was queued before the continuation. It prints tick 1.',
        vi: 'Tiếp theo là tick 1, được xếp hàng trước phần tiếp nối. Nó in ra tick 1.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 4 },
      focus: 'microtasks',
      note: { en: 'tick 2 queued late', vi: 'tick 2 vào hàng muộn' },
      say: {
        en: 'Tick 1 is done, so its promise is fulfilled, and only now is tick 2 queued. It goes behind the await continuation.',
        vi: 'Tick 1 chạy xong, promise của nó được fulfilled, và đến giờ tick 2 mới được xếp hàng. Nó đứng sau phần tiếp nối của await.',
      },
    },
    {
      at: { k: 'console', text: 'await thenable' },
      focus: 'console',
      say: {
        en: 'The async function resumes exactly where it paused, and prints await thenable. It landed between tick 1 and tick 2.',
        vi: 'Async function chạy tiếp đúng tại chỗ đã dừng, và in ra await thenable. Nó nằm giữa tick 1 và tick 2.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'tick 2' },
      focus: 'console',
      say: {
        en: 'Now tick 2 runs and prints.',
        vi: 'Giờ tick 2 chạy và in ra.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 5 },
      focus: 'microtasks',
      say: {
        en: 'Tick 2 is done, so tick 3 is queued. The chain keeps adding one link at a time.',
        vi: 'Tick 2 xong, nên tick 3 được xếp hàng. Chuỗi cứ thêm từng mắt xích một.',
      },
    },
    {
      at: { k: 'console', text: 'tick 3' },
      focus: 'console',
      say: {
        en: 'Tick 3 runs and prints. The queue is empty now.',
        vi: 'Tick 3 chạy và in ra. Hàng đợi giờ đã trống.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'loop',
      say: {
        en: 'Nothing else is waiting. The run is complete.',
        vi: 'Không còn gì đang chờ. Chương trình chạy xong.',
      },
    },
  ],
  why: [
    {
      focus: 'microtasks',
      title: { en: 'A thenable is not trusted', vi: 'Thenable không được tin ngay' },
      say: {
        en: 'Why this order? First: an object with a then method is only a thenable. The engine must call its then method to learn the result, and calling it is itself a microtask.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: object có phương thức then chỉ là thenable. Engine phải gọi phương thức then của nó để biết kết quả, và việc gọi đó tự nó là một microtask.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'It costs one extra tick', vi: 'Tốn thêm một tick' },
      say: {
        en: 'Second: awaiting a native promise costs one microtask. Awaiting a thenable costs two: one job calls then, and another resumes the function. That is the extra tick.',
        vi: 'Thứ hai: khi chờ một promise gốc, chỉ cần một microtask. Còn khi chờ một thenable thì cần tới hai: một lần để gọi hàm then, và một lần để chạy tiếp hàm. Đó chính là nhịp thêm vào.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'A chain adds one link per tick', vi: 'Chuỗi then thêm một mắt xích mỗi tick' },
      say: {
        en: 'Third: each dot then link is queued only after the link before it finishes. So the await continuation slipped into the line between tick 1 and tick 2.',
        vi: 'Thứ ba: mỗi mắt xích chấm then chỉ được xếp hàng sau khi mắt xích trước chạy xong. Nên phần tiếp nối của await chen vào hàng giữa tick 1 và tick 2.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'Still one drain', vi: 'Vẫn chỉ một lượt chạy' },
      say: {
        en: 'And all of this happens in one drain of the Microtask Queue, before the event loop takes any other Task.',
        vi: 'Và tất cả diễn ra trong một lượt chạy hết Microtask Queue, trước khi event loop lấy bất kỳ Task nào khác.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Awaiting a thenable first queues a microtask that calls its then method.',
        vi: 'Await một thenable trước hết xếp một microtask để gọi phương thức then của nó.',
      },
      {
        en: 'That costs one extra tick compared with awaiting a native promise.',
        vi: 'Việc đó tốn thêm một tick so với await một promise gốc.',
      },
      {
        en: 'A dot then chain is queued one link at a time, so other work can slip in between.',
        vi: 'Chuỗi chấm then được xếp hàng từng mắt xích một, nên việc khác có thể chen vào giữa.',
      },
    ],
    model: {
      en: 'Count the microtasks, not the lines',
      vi: 'Hãy đếm microtask, đừng đếm dòng',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: tick 1, await thenable, tick 2, and tick 3.',
          vi: 'Vậy thứ tự cuối cùng là: tick 1, await thenable, tick 2, và tick 3.',
        },
      },
      {
        say: {
          en: 'Keep this model: when order is tied up in microtasks, count how many microtasks each path costs, and who joins the line first.',
          vi: 'Hãy giữ mô hình này: khi thứ tự nằm trong các microtask, hãy đếm mỗi đường đi tốn bao nhiêu microtask, và ai vào hàng trước.',
        },
        pause: 2,
      },
    ],
  },
})
