import { defineLesson } from './define-lesson'

export default defineLesson({
  id: 'infinite-loop',
  panels: [],
  intro: {
    question: {
      en: 'A script prints start, then loops forever… what happens next?',
      vi: 'Một script in ra start, rồi lặp mãi mãi… chuyện gì xảy ra tiếp theo?',
    },
    lines: [
      {
        say: {
          en: 'This script has only two lines. It prints start, and then enters a loop that never ends.',
          vi: 'Đoạn script này chỉ có hai dòng. Nó in ra start, rồi bước vào một vòng lặp không bao giờ kết thúc.',
        },
      },
      {
        say: {
          en: 'There are no timers and no promises here. So what does the browser do with a script that never finishes? Think about it.',
          vi: 'Ở đây không có timer và cũng không có promise. Vậy trình duyệt làm gì với một script không bao giờ kết thúc? Bạn hãy nghĩ thử.',
        },
        pause: 1.6,
      },
    ],
  },
  overview: [
    {
      focus: 'stack',
      say: {
        en: 'First, the Call Stack. This is where JavaScript actually runs code. A frame stays on the stack for as long as its code runs.',
        vi: 'Đầu tiên là Call Stack, tức ngăn xếp lời gọi. Đây là nơi JavaScript thực sự chạy code. Một frame ở lại trên stack chừng nào code của nó còn chạy.',
      },
    },
    {
      focus: 'loop',
      say: {
        en: 'Next, the Event Loop. It is not a second thread running beside the stack. It only gets a turn when the stack is empty. Then it runs every microtask, and only after that takes the next Task.',
        vi: 'Tiếp theo là Event Loop. Nó không phải một luồng thứ hai chạy song song với stack. Nó chỉ được lượt khi stack đã trống. Lúc đó nó chạy hết các microtask, rồi mới lấy Task tiếp theo.',
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
      at: { k: 'console', text: 'start' },
      focus: 'console',
      say: {
        en: 'Line one calls console dot log, and prints start.',
        vi: 'Dòng một gọi console chấm log, và in ra start.',
      },
    },
    {
      at: { k: 'run:halted' },
      focus: 'stack',
      note: { en: 'stack never empties', vi: 'stack không bao giờ trống' },
      say: {
        en: 'The loop begins and never ends. The script frame stays on the stack, so the event loop never gets a turn. A real tab would freeze: no task, no drawing, no click. This simulator stops the run only because it has an execution budget.',
        vi: 'Vòng lặp bắt đầu và không bao giờ kết thúc. Frame của script ở lại trên stack, nên event loop không bao giờ tới lượt. Tab thật sẽ bị đơ: không task, không vẽ giao diện, không click. Trình mô phỏng này dừng lại chỉ vì nó có giới hạn thực thi.',
      },
      pause: 1.5,
    },
  ],
  why: [
    {
      focus: 'stack',
      title: { en: 'A Task runs to completion', vi: 'Task chạy đến hết' },
      say: {
        en: 'Why does it get stuck? A Task always runs to completion. Nothing can interrupt it, so a loop that never ends holds the stack forever.',
        vi: 'Vì sao nó bị kẹt? Một Task luôn chạy đến hết. Không gì ngắt được nó, nên một vòng lặp không kết thúc sẽ giữ chặt stack mãi mãi.',
      },
    },
    {
      focus: 'loop',
      title: { en: 'The loop needs an empty stack', vi: 'Event loop cần stack trống' },
      say: {
        en: 'The event loop only acts when the stack is empty. With a blocked stack, no microtask, timer, render or input ever gets its turn.',
        vi: 'Event loop chỉ hành động khi stack trống. Khi stack bị chặn, không microtask, timer, việc vẽ hay thao tác nhập liệu của người dùng nào được tới lượt.',
      },
    },
    {
      focus: 'console',
      title: { en: 'The budget is the simulator', vi: 'Giới hạn là của trình mô phỏng' },
      say: {
        en: 'And the stop you saw is not browser behavior. A real tab would keep spinning until it freezes. Here, an execution budget ends the run, so the demo can finish.',
        vi: 'Và việc dừng bạn vừa thấy không phải hành vi của trình duyệt. Một tab thật sẽ quay mãi cho đến khi bị đơ. Ở đây, một giới hạn thực thi kết thúc lượt chạy, để bài demo có thể khép lại.',
      },
    },
  ],
  recap: {
    takeaways: [
      { en: 'A Task runs to completion. Nothing interrupts it.', vi: 'Một Task chạy đến hết. Không gì ngắt được nó.' },
      { en: 'The event loop only acts when the stack is empty.', vi: 'Event loop chỉ hành động khi stack trống.' },
      { en: 'A real tab freezes. The simulator stops only by its budget.', vi: 'Tab thật sẽ bị đơ. Trình mô phỏng chỉ dừng nhờ giới hạn thực thi.' },
    ],
    model: {
      en: 'Stack never empty → the event loop never acts',
      vi: 'Stack không bao giờ trống → event loop không bao giờ hành động',
    },
    lines: [
      {
        say: {
          en: 'So the only output is: start.',
          vi: 'Vậy kết quả duy nhất là: start.',
        },
      },
      {
        say: {
          en: 'Keep this model: the event loop can only act when the stack is empty. A script that never returns blocks everything after it.',
          vi: 'Hãy giữ mô hình này: event loop chỉ hành động được khi stack trống. Một script không bao giờ trả về sẽ chặn mọi thứ phía sau nó.',
        },
        pause: 2,
      },
    ],
  },
})
