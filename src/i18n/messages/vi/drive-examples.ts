import type en from '../en/drive-examples'

export default {
  awaitVsThen: {
    awaitFirst: 'f await một promise đã fulfilled, nên Job của nó vào hàng ngay, trước các callback then ở dưới.',
    secondThen: 'then thứ hai được gọi lúc này, nhưng promise của nó (do then đầu tạo ra) vẫn pending, nên chưa có gì vào hàng cho nó.',
    then2Late: 'then2 chỉ vào hàng lúc này, sau khi then1 chạy. Job vào hàng trong một Checkpoint vẫn chạy trong chính Checkpoint đó.',
  },
  syncPromiseAsyncTimeout: {
    timerWaits: 'Kể cả 0 ms, callback không chạy được lúc này: nó cần một Task riêng, mà Task Script vẫn đang chạy.',
    asyncOrder: 'Vì vậy async that in ra trước end, còn async end sẽ in ra sau.',
    jobsFirst: 'Task của timer vào hàng trước các Job này, nhưng mọi Job đều chạy trước khi event loop lấy Task khác.',
    promiseBeforeAwait: 'Callback then vào hàng trước await, nên promise 1 in ra trước async end.',
    finalOrder: 'Thứ tự cuối cùng: start, async that, end, promise 1, async end, timeout 1.',
  },
  timersAndClamp: {
    chainGrows: 'Mỗi timer đặt từ trong callback của timer sâu hơn Task đã đặt nó một cấp lồng.',
    seventh: 'Trong Chrome, timer thứ 7 của chuỗi như vậy là cái đầu tiên bị nâng lên 4 ms.',
    t3Between: 't3 tới hạn ở 3 ms. Độ trễ 4 ms đẩy step kế tiếp ra sau nó, nên t3 chạy giữa s6 và s7.',
  },
  thenables: {
    twoTicks: 'Await một thenable tốn thêm một Tick so với await một promise gốc: một Job gọi then, một Job khác chạy tiếp hàm.',
    between: 'Vì vậy await thenable in ra giữa tick 1 và tick 2.',
  },
  asyncGenerators: {
    onlyCreates: 'Gọi g() chỉ tạo object generator. Thân hàm chưa chạy: g:start chưa in ra.',
    yieldAwaits: 'Trong async generator, yield await toán hạng của nó trước, ở đây là Promise.resolve(\'v\').',
    neverAfter: 'g dừng ở yield. g:after-yield không bao giờ chạy: không ai gọi next() lần nữa.',
  },
  messageChannelVsTimeout: {
    twoSources: 'Giờ có hai Task từ hai nguồn task đang chờ: timer và message.',
    chromeOrder: 'Spec để trình duyệt tự chọn giữa các nguồn task. Chrome lấy theo thứ tự vào hàng, nên timer đi trước.',
  },
  unhandledRejection: {
    notYet: 'Không gì xử lý rejection này. Trình duyệt chưa báo lỗi cho tới cuối microtask Checkpoint kế tiếp.',
    stillTime: 'Một handler thêm vào trong các Job này vẫn kịp bắt rejection.',
    reportTask: 'Task này sẽ báo rejection chưa được xử lý. HTML xếp nó ở cuối Checkpoint, khi microtask queue đã trống.',
    beforeTimer: 'Nó được báo trước timer vì timer chưa tới hạn tới 50 ms.',
  },
  busyWait: {
    clockMoves: 'Date.now() đọc Virtual Clock, đồng hồ này trôi khi Script chạy. Vòng lặp quay tới khi đủ 20 ms.',
    stillJobsFirst: 'Timer đã tới hạn từ lâu, nhưng Job vẫn chạy trước.',
    late: 'Nó tới hạn ở 0 ms và bắt đầu trễ khoảng 20 ms.',
  },
  infiniteLoop: {
    neverReturns: 'while (true) không bao giờ trả call stack lại, nên không Task hay Job nào chạy được. Tab thật sẽ treo; ở đây Budget node dừng Run lại.',
  },
} satisfies typeof en
