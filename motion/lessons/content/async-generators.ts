import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'async-generators',
  panels: ['microtasks'],
  intro: {
    question: {
      en: 'Does the line after yield ever print, and when does the result of next arrive?',
      vi: 'Dòng sau yield có bao giờ được in ra không, và kết quả của next đến lúc nào?',
    },
    lines: [
      {
        say: {
          en: 'This script creates an async generator, then calls next on it once. The generator has a log before its yield, and another log after it.',
          vi: 'Script này tạo một async generator, rồi gọi next trên nó đúng một lần. Generator có một lệnh log trước yield, và một lệnh log sau yield.',
        },
      },
      {
        say: {
          en: 'Before we run it, guess the order of the lines. And ask yourself: will the line after yield ever print?',
          vi: 'Trước khi chạy, bạn hãy đoán thứ tự các dòng. Và tự hỏi: dòng sau yield có bao giờ được in ra không?',
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
      at: { k: 'frame:pop', where: { label: 'g' } },
      focus: 'stack',
      note: { en: 'body has not run', vi: 'thân hàm chưa chạy' },
      say: {
        en: 'Line two calls g. For an async generator, this only creates the generator object. The body does not run yet, so g start has not printed. The call returns at once.',
        vi: 'Dòng hai gọi g. Với async generator, việc này chỉ tạo ra object generator. Thân hàm chưa chạy, nên g start chưa được in. Lời gọi trả về ngay.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'call next' },
      focus: 'console',
      say: {
        en: 'Line three is a plain log. It prints call next.',
        vi: 'Dòng ba là một lệnh log bình thường. Nó in ra call next.',
      },
    },
    {
      at: { k: 'console', text: 'g:start' },
      focus: 'stack',
      note: { en: 'next starts the body', vi: 'next mới chạy thân hàm' },
      say: {
        en: 'Line four calls next. Now the generator body starts, synchronously, right on top of the stack. It prints g start.',
        vi: 'Dòng bốn gọi next. Giờ thân generator mới bắt đầu chạy, đồng bộ, ngay trên đỉnh stack. Nó in ra g start.',
      },
    },
    {
      at: { k: 'job:enqueue' },
      focus: 'microtasks',
      note: { en: 'yield awaits first', vi: 'yield await trước' },
      say: {
        en: 'Then it reaches yield. In an async generator, yield first awaits its value. The value here is an already fulfilled promise, so the rest of the generator is queued as a microtask.',
        vi: 'Rồi nó gặp yield. Trong async generator, yield trước hết await giá trị của nó. Giá trị ở đây là một promise đã fulfilled sẵn, nên phần còn lại của generator được xếp vào hàng như một microtask.',
      },
    },
    {
      at: { k: 'frame:pop', where: { label: 'g' }, nth: 2 },
      focus: 'stack',
      say: {
        en: 'The generator pauses, and its frame leaves the stack. The call to next returns a promise, but that promise is still pending.',
        vi: 'Generator tạm dừng, và frame của nó rời khỏi stack. Lời gọi next trả về một promise, nhưng promise đó vẫn đang pending.',
      },
      pause: 0.9,
    },
    {
      at: { k: 'console', text: 'sync end' },
      focus: 'console',
      say: {
        en: 'The script attaches dot then to that pending promise, so nothing is queued for it. Then the last line prints sync end.',
        vi: 'Script gắn chấm then vào promise đang pending đó, nên chưa có gì được xếp hàng cho nó. Rồi dòng cuối in ra sync end.',
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
      say: {
        en: 'The event loop starts draining the Microtask Queue. It will not stop until the queue is empty.',
        vi: 'Event loop bắt đầu chạy hết Microtask Queue. Nó sẽ không dừng cho tới khi hàng đợi trống.',
      },
    },
    {
      at: { k: 'job:enqueue', nth: 2 },
      focus: 'microtasks',
      note: { en: 'yield completes next', vi: 'yield hoàn tất next' },
      say: {
        en: 'The generator resumes at its yield. The yield is done, so the promise from next is fulfilled with the value v. That queues the dot then callback.',
        vi: 'Generator chạy tiếp tại yield. Yield hoàn tất, nên promise của next được fulfilled với giá trị v. Việc đó xếp callback của chấm then vào hàng.',
      },
    },
    {
      at: { k: 'frame:pop', where: { label: 'g' }, nth: 3 },
      focus: 'code',
      note: { en: 'stops at yield', vi: 'dừng ở yield' },
      say: {
        en: 'The generator does not continue. It stops at the yield and waits for the next call to next. Nobody calls it again, so g after yield never prints.',
        vi: 'Generator không chạy tiếp. Nó dừng tại yield và chờ lời gọi next kế tiếp. Không ai gọi lại, nên g after yield không bao giờ được in.',
      },
      pause: 1.2,
    },
    {
      at: { k: 'console', text: 'next resolved v' },
      focus: 'console',
      say: {
        en: 'The queued callback runs, reads the value, and prints next resolved v.',
        vi: 'Callback đã xếp hàng chạy, đọc giá trị, và in ra next resolved v.',
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
      focus: 'code',
      title: { en: 'Calling g only creates the generator', vi: 'Gọi g chỉ tạo generator' },
      say: {
        en: 'Why this order? First: calling a generator function does not run its body. The body starts at the first call to next, and then it runs synchronously, like any function.',
        vi: 'Vì sao lại theo thứ tự này? Thứ nhất: gọi một generator function không chạy thân hàm. Thân hàm bắt đầu ở lần gọi next đầu tiên, rồi chạy đồng bộ như mọi hàm khác.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'yield awaits its operand', vi: 'yield await giá trị của nó' },
      say: {
        en: 'Second: in an async generator, yield awaits the value before handing it out. That pause is why the result of next arrives only after the script ends, in a microtask. The body itself ran at once, which is why g start prints before sync end.',
        vi: 'Thứ hai: trong async generator, yield await giá trị trước khi đưa ra. Chỗ dừng đó là lý do kết quả của next chỉ đến sau khi script kết thúc, trong một microtask. Còn thân hàm đã chạy ngay, nên g start in trước sync end.',
      },
    },
    {
      focus: 'microtasks',
      title: { en: 'next always returns a promise', vi: 'next luôn trả về promise' },
      say: {
        en: 'Third: next returns a promise, never the value itself. The dot then callback can only run in a microtask, after the script ends.',
        vi: 'Thứ ba: next trả về một promise, không bao giờ trả thẳng giá trị. Callback chấm then chỉ chạy được trong một microtask, sau khi script kết thúc.',
      },
    },
    {
      focus: 'code',
      title: { en: 'A generator moves only when asked', vi: 'Generator chỉ chạy khi được gọi' },
      say: {
        en: 'And a generator moves only when someone calls next. One call runs it to the first yield, so the code after yield stays asleep.',
        vi: 'Và generator chỉ tiến lên khi có người gọi next. Một lần gọi chỉ chạy tới yield đầu tiên, nên code sau yield vẫn ngủ yên.',
      },
    },
  ],
  recap: {
    takeaways: [
      {
        en: 'Calling an async generator function creates the generator. The body starts at next.',
        vi: 'Gọi async generator function chỉ tạo generator. Thân hàm bắt đầu ở next.',
      },
      {
        en: 'In an async generator, yield awaits its value, and next always returns a promise.',
        vi: 'Trong async generator, yield await giá trị của nó, và next luôn trả về promise.',
      },
      {
        en: 'The code after yield runs only if next is called again.',
        vi: 'Code sau yield chỉ chạy nếu next được gọi lại.',
      },
    ],
    model: {
      en: 'Each next runs to the next yield',
      vi: 'Mỗi lần next chạy tới yield kế tiếp',
    },
    lines: [
      {
        say: {
          en: 'So the final order is: call next, g start, sync end, and next resolved v. The line after yield never prints.',
          vi: 'Vậy thứ tự cuối cùng là: call next, g start, sync end, và next resolved v. Dòng sau yield không bao giờ được in.',
        },
      },
      {
        say: {
          en: 'Keep this model: a generator pauses at each yield, and every next call is one step forward, delivered through a promise.',
          vi: 'Hãy giữ mô hình này: generator dừng ở mỗi yield, và mỗi lần gọi next là một bước tiến, được trao qua một promise.',
        },
        pause: 2,
      },
    ],
  },
})
