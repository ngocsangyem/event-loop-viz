import type en from '../en/core-editor'

export default {
  editor: {
    region: 'Trình soạn code',
    title: 'Script',
    script: 'Script',
    editing: 'Đang sửa',
    locked: 'Khóa khi đang chạy',
    sourceTitle: 'Source',
    readOnlyTag: 'Chỉ đọc',
    run: 'Chạy',
    cancel: 'Hủy',
    running: 'Đang chạy',
    runningText: 'Đang chạy…',
    recording: 'Đang ghi Trace…',
    budget: 'Budget {tasks} Task · {events} event · {seconds} s',
    editLabel: 'Sửa',
    edit: 'Sửa (sẽ bỏ Trace)',
  },
  source: {
    legend: 'Việc đang chờ do dòng này tạo ra',
    run: 'Run',
    runNumber: 'Run #{n}',
    endedNaturally: 'Kết thúc tự nhiên',
    halted: 'Halt · Budget',
    events: '{n} Trace Event',
    ticks: '{n} Tick',
    stats: '{events} · {ticks} · {from} → {to} ms',
  },
  syntax: {
    title: 'SyntaxError',
    goToLine: 'Đến dòng {line}',
  },
  examples: {
    button: 'Ví dụ',
    custom: 'Tùy chỉnh',
    menuLabel: 'Nạp một Script mẫu',
    items: {
      awaitVsThen: {
        title: 'await và then',
        description: 'Promise được await tiếp tục chạy trước khi then nối tiếp làm xong bước thứ hai.',
      },
      syncPromiseAsyncTimeout: {
        title: 'Sync, promise, async, timer',
        description: 'Code đồng bộ chạy trước, rồi tới promise reaction và await, timer 0 ms chạy sau cùng.',
      },
      timersAndClamp: {
        title: 'Timer và clamp',
        description: 'Các timer 0 ms lồng nhau bị nâng lên 4 ms khi độ lồng đủ sâu.',
      },
      thenables: {
        title: 'Thenable',
        description: 'Await một object có method then tốn thêm vài tick microtask.',
      },
      asyncGenerators: {
        title: 'Async generator',
        description: 'yield trong async generator sẽ await toán hạng của nó trước khi resolve next().',
      },
      messageChannelVsTimeout: {
        title: 'MessageChannel và setTimeout',
        description: 'Message được post là một nguồn task riêng và chạy đua với timer 0 ms.',
      },
      unhandledRejection: {
        title: 'Unhandled rejection',
        description: 'Rejection được báo sau microtask checkpoint, trước một timer đến sau.',
      },
      busyWait: {
        title: 'Busy-wait',
        description: 'Vòng lặp chặn làm đồng hồ chạy tới và trì hoãn một timer vốn đã đến hạn.',
      },
      infiniteLoop: {
        title: 'Vòng lặp vô hạn',
        description: 'Vòng lặp chạy mất kiểm soát bị Budget thực thi chặn lại, thay vì làm treo tab.',
      },
      requestAnimationFrame: {
        title: 'requestAnimationFrame',
        description: 'Các callback của animation frame chạy lần lượt, sau mỗi cái là một microtask checkpoint.',
      },
      postMessageListeners: {
        title: 'Listener của window.postMessage',
        description: 'Event loop bắn event message: microtask chạy xen giữa các listener.',
      },
      clickIsSynchronous: {
        title: 'click() chạy listener ngay',
        description: 'element.click() dispatch ngay trên stack, nên microtask chờ đến khi Script chạy xong.',
      },
      fetchMockApi: {
        title: 'fetch một API (giả lập)',
        description: 'Response đến như một Task networking sau độ trễ; đọc body tốn thêm một Task nữa.',
      },
      dynamicImport: {
        title: 'import() động',
        description: 'import() tải và chạy module trong một Task, sau các microtask hiện tại.',
      },
      topLevelAwait: {
        title: 'Top-level await',
        description: 'Module tạm dừng ở await như một hàm async, để timer chạy xen vào giữa.',
      },
      messagePortTransfer: {
        title: 'Chuyển MessagePort',
        description: 'Port được chuyển đi đến nơi như một object mới, vẫn nối với port cũ bên kia.',
      },
      finalizationRegistry: {
        title: 'gc() và FinalizationRegistry',
        description: 'Sau gc(), các callback cleanup chạy trong một Task riêng, sau các microtask hiện tại.',
      },
      atomicsWaitAsync: {
        title: 'Atomics.waitAsync và notify',
        description: 'Atomics.wait sẽ chặn luồng nên ném lỗi trên trang; waitAsync được đánh thức trong một Task do notify xếp hàng.',
      },
    },
  },
  settings: {
    button: 'Cài đặt Run',
    hint: 'Giá trị đã đổi áp dụng cho lần Run sau, và được lưu trong Trace cũng như liên kết chia sẻ.',
    field: {
      nodes: 'Node Budget',
      tasks: 'Task Budget',
      virtualMs: 'Virtual time Budget (ms)',
      events: 'Event Budget',
      nodeCostUs: 'Chi phí mỗi node (µs)',
    },
  },
  supportedApis: {
    button: 'API được hỗ trợ',
    buttonShort: 'API',
    title: 'Được hỗ trợ trong mô hình Chrome 155',
    group: { timer: 'Timer · Web API', dom: 'Task · DOM và event', job: 'Job · Promise và engine', console: 'Log · Console' },
    footer: 'Worker, XMLHttpRequest, WebSocket và requestIdleCallback là Unsupported API và chặn Run ngay từ trước khi chạy.',
    promises: 'Promise, async/await, generator, async generator, for await',
    timers: 'setTimeout, setInterval, clearTimeout, clearInterval',
    raf: 'requestAnimationFrame, cancelAnimationFrame (mỗi frame 16,7 ms)',
    microtask: 'queueMicrotask',
    messageChannel: 'MessageChannel, MessagePort, chuyển (transfer) port',
    postMessage: 'window.postMessage (structured clone)',
    fetch: "fetch với URL data:, và URL http(s) khai báo bằng dòng // {'@'}fetch; Response, Headers",
    window: 'window, self, onmessage, onerror, onunhandledrejection',
    dom: 'document, element: createElement, append, querySelector, textContent, click()',
    events: 'addEventListener, dispatchEvent, Event, CustomEvent, MessageEvent',
    modules: 'Module: import / export, top-level await, import() URL data:',
    weak: 'WeakRef, FinalizationRegistry, gc()',
    atomics: 'SharedArrayBuffer, Atomics (wait ném lỗi trên window, waitAsync + notify)',
    console: 'console.log / info / warn / error',
    clock: 'Date.now() và performance.now() (Virtual Clock)',
    random: 'Math.random (seed theo từng Run)',
  },
  unsupported: {
    title: 'Unsupported API · Run bị chặn',
    line: 'Dòng {line}',
  },
  timing: {
    badge: 'Nhạy về thời gian: thứ tự phụ thuộc vào thời gian tính toán và có thể khác trên trình duyệt của bạn.',
    hint: 'Có một timer đến hạn chỉ trong vòng 2 ms sau khi một đoạn tính toán kết thúc, hoặc trong vòng 4 ms quanh một lần rendering, nên timing thật của Chrome có thể sắp xếp Run này khác đi.',
  },
  halt: {
    withLimit: 'Đã dừng: vượt Budget {name} ({limit} {unit}).',
    noLimit: 'Đã dừng: vượt Budget {name}.',
    name: { nodes: 'node', tasks: 'Task', 'virtual-time': 'thời gian ảo', events: 'event' },
    unit: { nodes: 'node', tasks: 'Task', 'virtual-time': 'ms', events: 'event' },
  },
} satisfies typeof en
