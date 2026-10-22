import type en from '../en/drive-info'

export default {
  callStack: { title: 'Call stack', body: 'Gọi một hàm tạo ra một execution context và đẩy nó lên một stack; cái trên đỉnh là code đang chạy. Khi lời gọi trả về, nó bị gỡ ra và hàm gọi chạy tiếp.' },
  console: { title: 'console.log', body: 'Console Standard để trình duyệt tự quyết cách in output. Nếu console đang đóng, trình duyệt có thể giữ lại message để hiện sau.' },
  setTimeout: { title: 'setTimeout', body: 'setTimeout trả về id ngay. Khi hết thời gian chờ, HTML xếp một task vào nguồn task timer để chạy callback, nên độ trễ là tối thiểu chứ không chính xác.' },
  timerClamp: { title: 'Mức sàn 4 ms', body: 'HTML: nếu cấp lồng của timer lớn hơn 5 và độ trễ nhỏ hơn 4 ms, độ trễ thành 4 ms.' },
  eventLoop: { title: 'Event loop', body: 'Mỗi vòng, event loop lấy task cũ nhất từ một task queue; chọn queue nào là do trình duyệt. Sau task đó nó chạy một microtask checkpoint.' },
  checkpoint: { title: 'Microtask checkpoint', body: 'Checkpoint chạy microtask liên tục khi microtask queue chưa trống, nên microtask vào hàng trong lúc đó chạy trước task kế tiếp. Một checkpoint cũng chạy ngay sau script, khi call stack trống.' },
  promiseJobs: { title: 'then và microtask queue', body: 'then trên một promise đã settle xếp reaction job ngay; trên promise pending thì reaction được giữ lại tới khi promise settle. HTML chạy các job này từ microtask queue.' },
  await: { title: 'await', body: 'Hàm async chạy đồng bộ tới await, ở đó quyền điều khiển trả về hàm gọi nó. Await một promise gốc dùng lại chính promise đó, nên việc chạy tiếp chỉ chờ một reaction job.' },
  thenable: { title: 'Thenable', body: 'Resolve một promise bằng object có method then sẽ xếp thêm một job, job này gọi then đó.' },
  asyncGenerator: { title: 'Async generator', body: 'Gọi hàm async generator không chạy thân hàm; next() mới chạy tiếp nó. Trong async generator, yield await giá trị của nó trước.' },
  postMessage: { title: 'MessagePort.postMessage', body: 'postMessage trên một port thêm một task vào port message queue của port bên kia. Handler onmessage chạy trong task đó.' },
  unhandledRejection: { title: 'Rejection chưa xử lý', body: 'Promise bị reject mà không có handler được gom lại. Ở cuối microtask checkpoint, HTML xếp một task thuộc nguồn task DOM manipulation để báo chúng. Có handler trước lúc đó thì không bị báo.' },
  busyLoop: { title: 'Vòng lặp bận làm trễ timer', body: 'Callback của timer không chạy được tới khi code gọi setTimeout xong, nên một vòng lặp dài làm nó trễ. Trong app này, Date.now() đọc Virtual Clock.' },
} satisfies typeof en
