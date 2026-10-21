import type en from '../en/core-panels'

export default {
  panels: {
    about: 'Giới thiệu {title}',
    running: 'đang chạy',
    due: 'hạn {due}',
    callStack: {
      title: 'Call Stack',
      info: 'Các frame của đoạn code đang chạy, frame trên cùng ở đầu. Event loop chỉ lấy Task kế tiếp khi stack đã trống. Built-in do built-in khác gọi sẽ bị ẩn.',
      empty: 'Trống',
    },
    eventLoop: {
      title: 'Event Loop',
      info: 'Mỗi vòng chạy Task cũ nhất cho đến hết, rồi xả sạch hàng đợi microtask, rồi chờ Task kế tiếp.',
      phase: 'Pha',
      clock: 'Đồng hồ',
      tick: 'Tick',
      task: 'Task',
      microtasks: 'Microtask',
      idle: 'Đang chờ Task kế tiếp',
      running: 'Đang chạy một Task',
      draining: 'Đang xả microtask',
      halted: 'Run đã kết thúc',
    },
    microtaskQueue: {
      title: 'Microtask Queue',
      info: 'Promise reaction, thenable resolution và callback của queueMicrotask. Hàng đợi này được xả hết sau mỗi Task, trước khi Task kế tiếp bắt đầu.',
      empty: 'Chưa có microtask nào trong hàng đợi',
    },
    taskQueue: {
      title: 'Task Queue',
      info: 'Macrotask: chính Script, callback của timer và message của MessagePort. Event loop chạy một Task rồi xả hàng đợi microtask.',
      empty: 'Chưa có task nào trong hàng đợi',
    },
    webApis: {
      title: 'Web APIs',
      info: 'Các timer mà trình duyệt đang đếm ngược. Khi đến hạn, callback của timer chuyển sang Task Queue.',
      empty: 'Không có timer nào đang chờ',
      callback: 'callback',
      delay: 'độ trễ',
      browser: 'Trình duyệt',
      left: 'còn {left}',
      clamped: 'tăng từ {requested}ms',
      repeats: 'lặp lại',
      more: '+{count} nữa',
    },
    taskSource: { script: 'Script', timer: 'Timer', 'port-message': 'MessagePort', 'dom-manipulation': 'DOM' },
    chip: { label: '{kind}: {code}', awaitResume: '{fn} sau await', line: 'dòng {line}', anonymous: '(ẩn danh)' },
    jobKind: { reaction: 'Promise reaction', thenable: 'Resolve thenable', microtask: 'queueMicrotask' },
  },
  console: {
    title: 'Console',
    info: 'Observable Output tính đến lúc này: các dòng console, exception không bắt và unhandled rejection.',
    empty: 'Bước này chưa có output console nào.',
  },
} satisfies typeof en
