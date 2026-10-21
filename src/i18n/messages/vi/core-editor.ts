import type en from '../en/core-editor'

export default {
  editor: {
    region: 'Trình soạn code',
    code: 'Code',
    script: 'Script',
    run: 'Chạy',
    cancel: 'Hủy',
    running: 'Đang chạy',
    runningText: 'Đang chạy…',
    readOnly: 'Chỉ đọc trong lúc replay.',
    edit: 'Sửa (sẽ bỏ Trace)',
  },
  examples: {
    button: 'Ví dụ',
    menuLabel: 'Nạp một Script mẫu',
    items: {
      awaitVsThen: {
        title: 'await và then',
        description: 'Promise được await tiếp tục chạy trước khi then nối tiếp làm xong bước thứ hai.',
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
    button: 'Cài đặt nâng cao',
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
    promises: 'Promise, async/await, generator, async generator, for await',
    timers: 'setTimeout, setInterval, clearTimeout, clearInterval',
    microtask: 'queueMicrotask',
    messageChannel: 'MessageChannel',
    console: 'console.log / info / warn / error',
    clock: 'Date.now() và performance.now() (Virtual Clock)',
    random: 'Math.random (seed theo từng Run)',
  },
  unsupported: {
    title: 'Script dùng API chưa được hỗ trợ',
    touching: '— chạm vào một trong số này sẽ ném UnsupportedApiError.',
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
