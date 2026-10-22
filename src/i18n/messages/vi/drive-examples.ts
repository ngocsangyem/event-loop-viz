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
  requestAnimationFrame: {
    frame: 'Cả hai callback được đăng ký khi Script đang chạy. Chúng chờ lần rendering đầu tiên, khoảng 4 ms sau, và chạy chung ở đó.',
    microBetween: 'Reaction của promise trong raf1 chạy trước raf2: sau mỗi callback của animation frame có một microtask checkpoint. Chrome 155 in raf1, raf1-micro, raf2.',
  },
  postMessageListeners: {
    oneTask: 'postMessage xếp một Task cho event message, chứ không phải mỗi listener một Task.',
    betweenListeners: 'Microtask của L1 chạy trước L2. Event loop gọi từng listener khi stack trống, nên sau mỗi listener có một checkpoint.',
  },
  clickIsSynchronous: {
    sameStack: 'C2 chạy ngay sau C1, bên trong click(). Script vẫn còn trên stack, nên không có checkpoint nào giữa các listener.',
    afterScript: 'Cả hai reaction phải chờ Script chạy xong. Khi chính event loop bắn event (ví dụ message), sau mỗi listener có một checkpoint.',
  },
  fetchMockApi: {
    latency: "Dòng // {'@'}fetch cho request này độ trễ ảo 30 ms. Promise vẫn pending cho tới khi một Task networking mang response về.",
    microFirst: 'Microtask của chính Script chạy trước: không response nào đến được trước khi checkpoint của Script kết thúc.',
    oneHop: 'json() cần thêm một Task networking, nên nó resolve sau hop 1. Trong Chrome 155, body của URL data: cần hai.',
  },
  dynamicImport: {
    microFirst: 'Cả ba microtask nối nhau chạy trước khi module được tải: import() cần một Task riêng.',
    inTask: 'Module chạy bên trong Task networking đã tải nó. Promise của import() resolve ở checkpoint của Task đó, trước timer 0 ms.',
  },
  topLevelAwait: {
    awaitNull: 'await null trong module chạy tiếp trong một microtask, nên b được in trước Task của timer.',
    awaitTimer: 'await thứ hai chờ một timer 5 ms, trong lúc đó timer 0 ms đã chạy. Module kết thúc ở một Task sau.',
  },
  messagePortTransfer: {
    newObject: 'e.ports[0] là một object MessagePort mới, không phải b.port2. Việc transfer đã vô hiệu hoá object cũ.',
    queued: 'b.port1 gửi ping trước khi port mới tồn tại. Message chờ sẵn và đến nơi ngay khi onmessage khởi động port mới.',
  },
  finalizationRegistry: {
    queued: 'gc() thu hồi object đã đăng ký và xếp cleanup thành một Task ngay. Callback không chạy bên trong gc().',
    ownTask: 'Task cleanup chạy sau các microtask của Task timer, và trước timer 0 ms được đặt sau đó.',
  },
  atomicsWaitAsync: {
    syncAnswers: 'waitAsync trả lời ngay khi giá trị khác (not-equal) hoặc timeout bằng 0 (timed-out). Chỉ khi thật sự chờ nó mới trả về promise.',
    wakeTask: 'notify xếp việc đánh thức thành một Task, nên nó chạy sau Task timer đã có sẵn trong hàng, chứ không trong microtask của notify.',
  },
} satisfies typeof en
