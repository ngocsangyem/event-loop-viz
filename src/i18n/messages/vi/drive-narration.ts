import type en from '../en/drive-narration'

export default {
  anonymous: 'hàm ẩn danh',
  callbackOnLine: 'callback ở dòng {line}',
  callback: 'callback',
  restOf: 'phần còn lại của {name}',
  scriptStart: {
    title: 'Script lên call stack',
    body: 'Event loop chạy Script như Task đầu tiên. Khi chạy, Script nằm trên call stack, và không gì khác chạy được tới khi nó xong.',
  },
  call: {
    title: '{Name}() lên call stack',
    body: 'Dòng {line} gọi {name}, nên một frame mới được đặt lên đỉnh call stack.',
    anonymous: { title: 'Hàm ở dòng {line} được gọi', body: 'Một frame mới cho nó được đặt lên đỉnh call stack.' },
  },
  builtinCall: {
    title: '{Name} lên call stack',
    body: 'Dòng {line} gọi built-in {name}. Built-in lên call stack như mọi hàm khác và rời đi khi trả về.',
    repeated: {
      title: '{Name} chạy {count} lần',
      body: 'Dòng {line} gọi {name} liên tục trong một vòng lặp: {count} lần liền nhau, mỗi lần lên call stack rồi rời đi. Trong lúc đó không gì khác chạy được.',
    },
  },
  console: {
    title: 'In ra {text}',
    body: 'Dòng chữ được ghi vào console. Sau đó lời gọi trả về và rời call stack.',
  },
  timer: {
    title: 'Một timer {ms} ms bắt đầu trong Web APIs',
    body: 'setTimeout giao {callback} cho một timer rồi trả về ngay. Callback chờ ở đó tới khi timer tới hạn.',
    clamped: {
      title: 'Timer này xin {requested} ms nhưng nhận {ms} ms',
      body: 'Nó được đặt từ sâu trong một chuỗi callback của timer (cấp lồng {nesting}), nên HTML nâng độ trễ lên {ms} ms. Callback chờ trong Web APIs.',
    },
    repeat: {
      title: 'Một timer lặp {ms} ms bắt đầu trong Web APIs',
      body: 'setInterval giao {callback} cho một timer tới hạn mỗi {ms} ms.',
    },
  },
  webApi: {
    requestAnimationFrame: {
      title: 'Một callback của requestAnimationFrame chờ frame kế tiếp',
      body: 'requestAnimationFrame giao {callback} cho trình duyệt và trả về một id ngay. Nó chạy ở lần rendering kế tiếp, sau các Task đã đến hạn.',
    },
    fetch: {
      title: 'fetch gửi một request: {detail}',
      body: 'fetch trả về một promise pending ngay lập tức. Request chạy bên ngoài event loop; khi response về, một Task thuộc nguồn networking settle promise đó.',
    },
    body: {
      title: 'Body của response được đọc: {detail}',
      body: 'Đọc body cũng là bất đồng bộ: nó settle trong một Task networking, không phải trong Task hiện tại.',
    },
    import: {
      title: 'import() bắt đầu tải {detail}',
      body: 'import() trả về một promise pending ngay lập tức. Module được tải trong một Task networking, Task đó chạy module rồi settle promise.',
    },
    waitAsync: {
      title: 'Atomics.waitAsync chờ ở {detail}',
      body: 'Promise nó trả về settle trong một Task riêng khi Atomics.notify đánh thức nó.',
    },
  },
  frame: {
    title: 'Một lần rendering: {count} callback của animation frame',
    body: 'Trình duyệt vẽ một frame khoảng mỗi 16,7 ms. Trước khi vẽ, nó chạy các callback của requestAnimationFrame đang chờ, cùng timestamp {ms} ms.',
  },
  taskQueued: {
    timer: {
      title: 'Timer tới hạn: Task #{task} vào hàng',
      body: '{Callback} vào task queue. Nó vẫn chờ tới khi call stack trống và event loop lấy nó ra.',
    },
    portMessage: {
      title: 'Message vào hàng thành Task #{task}',
      body: 'postMessage đã xếp một Task cho handler onmessage, {callback}. Nó chờ trong task queue.',
    },
    domManipulation: {
      title: 'Task #{task} vào hàng',
      body: 'Trình duyệt tự xếp một Task, thuộc nguồn task DOM manipulation. Nó chờ trong task queue.',
    },
    postedMessage: {
      title: 'Message của window vào hàng thành Task #{task}',
      body: 'window.postMessage đã xếp một Task thuộc nguồn posted message. Khi nó chạy, mọi listener của message được gọi, sau mỗi listener có một microtask checkpoint.',
    },
    networking: {
      title: 'Mạng xếp Task #{task}',
      body: 'Một response của fetch, một lần đọc body hoặc một lần tải import() đã xong, nên một Task thuộc nguồn networking vào task queue. Promise settle khi Task đó chạy.',
    },
    javascriptEngine: {
      title: 'Engine xếp Task #{task}',
      body: 'Cleanup của FinalizationRegistry hoặc Atomics.waitAsync được đánh thức chạy thành một Task riêng. Nó chờ trong task queue.',
    },
    animationFrame: {
      title: 'Rendering: Task #{task} là một callback của requestAnimationFrame',
      body: 'Đã đến lúc rendering. Từng callback của requestAnimationFrame đang chờ chạy ngay bây giờ, lần lượt, sau mỗi cái có một microtask checkpoint.',
    },
    other: { title: 'Task #{task} vào hàng', body: 'Nó chờ trong task queue.' },
  },
  jobQueued: {
    function: {
      title: '{Callback} vào hàng thành Job #{job}',
      body: 'Promise của nó đã settle, nên reaction vào microtask queue ngay. Nó chờ ở đó tới khi call stack trống.',
    },
    reject: {
      title: '{Callback} vào hàng thành Job #{job}',
      body: 'Promise của nó bị reject, nên handler rejection này vào microtask queue.',
    },
    await: {
      title: '{Callback} vào hàng thành Job #{job}',
      body: 'Giá trị được await đã sẵn sàng, nên việc chạy tiếp sau await thành một Job trong microtask queue.',
    },
    thenable: {
      title: 'Job #{job} vào hàng để gọi một method then',
      body: 'Giá trị có method then riêng, nên một Job sẽ gọi nó trước khi những gì đang chờ giá trị đó chạy tiếp được.',
    },
    microtask: { title: '{Callback} vào hàng thành Job #{job}', body: 'queueMicrotask đưa nó thẳng vào microtask queue.' },
    builtin: { title: 'Job #{job} vào hàng', body: 'Một bước built-in của promise chờ trong microtask queue.' },
  },
  await: {
    title: 'await tạm dừng {name}',
    body: '{Name} rời call stack ở dòng {line}, và hàm gọi nó chạy tiếp. Nó sẽ chạy tiếp sau, trong một Job.',
  },
  rejected: { title: 'Promise bị reject', body: 'Dòng {line} reject một promise.' },
  scriptEnd: {
    title: 'Script chạy tới cuối',
    body: 'Nó rời call stack. Task Script đã xong và call stack trống.',
  },
  checkpoint: {
    title: 'Microtask Checkpoint: số Job đang chờ: {jobs}',
    body: 'Call stack trống, các Job chạy lần lượt, cũ nhất trước, tới khi microtask queue trống. Job vào hàng trong lúc này cũng chạy trong Checkpoint này.',
    empty: { title: 'Microtask Checkpoint: không có Job', body: 'Microtask queue trống, nên Checkpoint kết thúc ngay.' },
  },
  checkpointEnd: {
    title: 'Microtask queue đã trống',
    body: 'Số Job đã chạy trong Checkpoint này: {jobs}. Giờ event loop có thể lấy Task kế tiếp.',
  },
  taskStart: {
    timer: { title: 'Event loop lấy Task #{task}: một callback của timer', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    portMessage: { title: 'Event loop lấy Task #{task}: một message', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    domManipulation: { title: 'Event loop lấy Task #{task}: một Task của trình duyệt', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    postedMessage: { title: 'Event loop lấy Task #{task}: một message của window', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    networking: { title: 'Event loop lấy Task #{task}: một Task của mạng', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    javascriptEngine: { title: 'Event loop lấy Task #{task}: một Task của engine', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
    animationFrame: { title: 'Task #{task} chạy: một callback của requestAnimationFrame', body: 'Bước rendering gọi các callback đang chờ frame này, từng cái một.' },
    other: { title: 'Event loop lấy Task #{task}', body: 'Call stack và microtask queue đều trống, nên event loop lấy Task kế tiếp từ task queue.' },
  },
  callbackStart: {
    job: { title: 'Job #{id} chạy {callback}', body: 'Job rời microtask queue và callback của nó lên call stack.' },
    task: { title: 'Task #{id} chạy {callback}', body: 'Callback lên call stack.' },
  },
  builtinJob: { title: 'Job #{job} chạy một bước built-in', body: 'Job rời microtask queue. Nó chỉ chạy code của engine, không có code nào của Script.' },
  resume: { title: '{Name} chạy tiếp sau await', body: 'Job của nó đưa nó trở lại call stack, đúng chỗ đã tạm dừng.' },
  genResume: { title: 'next() chạy tiếp {name}', body: 'Thân generator lên call stack và chạy từ chỗ cũ: từ đầu, ở lần đầu tiên.' },
  genYield: { title: 'yield trao giá trị', body: 'Generator dừng ở yield, và promise của next() được settle với giá trị đó.' },
  rejectionReport: {
    unhandled: { title: 'Uncaught (in promise) {message}', body: 'Promise bị reject vẫn không có handler, nên trình duyệt báo lỗi trong console.' },
    handled: { title: 'Một handler muộn được báo', body: 'Một handler được thêm sau khi rejection đã bị báo, nên trình duyệt báo rằng giờ nó đã được xử lý.' },
  },
  exception: { title: 'Uncaught {message}', body: 'Không code nào trên call stack bắt exception này. Trình duyệt báo lỗi và chạy tiếp Task hoặc Job kế tiếp.' },
  halt: {
    natural: { title: 'Run kết thúc', body: 'Không còn Task, Job hay timer nào, nên không gì chạy nữa.' },
    budget: { title: 'Halt: vượt Budget {reason}', body: 'Run bị dừng ở đây, tại {limit}, để tab không bao giờ bị treo.' },
  },
} satisfies typeof en
