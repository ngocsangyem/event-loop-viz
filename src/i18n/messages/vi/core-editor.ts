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
    title: 'Được hỗ trợ trong mô hình Chrome 155',
    group: { timer: 'Timer · Web API', job: 'Job · Promise', console: 'Log · Console' },
    footer: 'Mọi thứ khác là Unsupported API và chặn Run ngay từ trước khi chạy.',
    promises: 'Promise, async/await, generator, async generator, for await',
    timers: 'setTimeout, setInterval, clearTimeout, clearInterval',
    microtask: 'queueMicrotask',
    messageChannel: 'MessageChannel',
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
    hint: 'Có một timer đến hạn chỉ trong vòng 2 ms sau khi một đoạn tính toán kết thúc, nên timing thật của Chrome có thể sắp xếp Run này khác đi.',
  },
  halt: {
    withLimit: 'Đã dừng: vượt Budget {name} ({limit} {unit}).',
    noLimit: 'Đã dừng: vượt Budget {name}.',
    name: { nodes: 'node', tasks: 'Task', 'virtual-time': 'thời gian ảo', events: 'event' },
    unit: { nodes: 'node', tasks: 'Task', 'virtual-time': 'ms', events: 'event' },
  },
} satisfies typeof en
