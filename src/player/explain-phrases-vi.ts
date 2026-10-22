import type { TaskSource, TraceEvent, WebApiKind } from '../trace/trace-event'
import type { ExplainPhrases } from './explain-phrases-types'

// Technical terms (call stack, Task, Job, Checkpoint, Budget, promise, callback...) stay in
// English, as Vietnamese developers write them; the sentences around them are Vietnamese.

const taskSource = (source: TaskSource): string => {
  switch (source) {
    case 'script':
      return 'Script ban đầu'
    case 'timer':
      return 'một timer'
    case 'port-message':
      return 'một message của MessagePort'
    case 'dom-manipulation':
      return 'trình duyệt (thông báo rejection)'
    case 'posted-message':
      return 'window.postMessage'
    case 'networking':
      return 'mạng (một response của fetch, một lần đọc body hoặc một import)'
    case 'javascript-engine':
      return 'JavaScript engine (cleanup của FinalizationRegistry hoặc Atomics.waitAsync được đánh thức)'
    case 'animation-frame':
      return 'bước rendering (một callback của requestAnimationFrame)'
  }
}

const webApi = (api: WebApiKind): string => {
  switch (api) {
    case 'requestAnimationFrame':
      return 'Callback của requestAnimationFrame chờ lần rendering kế tiếp'
    case 'fetch':
      return 'Request fetch đang chạy'
    case 'body':
      return 'Body của response đang được đọc'
    case 'import':
      return 'import() đang tải một module'
    case 'waitAsync':
      return 'Atomics.waitAsync chờ một Atomics.notify'
  }
}

const checkpointReason = (reason: 'task-end' | 'script-end' | 'callback-end'): string => {
  switch (reason) {
    case 'task-end':
      return 'Task vừa kết thúc'
    case 'script-end':
      return 'Script đã chạy xong'
    case 'callback-end':
      return 'một callback trả về khi stack trống'
  }
}

const viaWork = (via: 'then' | 'await' | 'asyncgen' | 'from-sync'): string => {
  switch (via) {
    case 'then':
      return '.then'
    case 'await':
      return 'await'
    case 'asyncgen':
      return 'async generator'
    case 'from-sync':
      return 'for-await (sync iterable)'
  }
}

const exceptionOrigin = (origin: 'script' | 'task-callback' | 'microtask-callback' | 'event-listener'): string => {
  switch (origin) {
    case 'script':
      return 'Script'
    case 'task-callback':
      return 'callback của một Task'
    case 'microtask-callback':
      return 'callback của một Job'
    case 'event-listener':
      return 'một event listener'
  }
}

type JobEnqueue = Extract<TraceEvent, { k: 'job:enqueue' }>

function jobWork(e: JobEnqueue, promiseInline: (pid: string) => string): string {
  const target = e.pid ? promiseInline(e.pid) : 'một promise'
  switch (e.jobKind) {
    case 'reaction':
      return `chạy reaction ${e.outcome === 'reject' ? 'rejection' : 'fulfillment'} của ${target}`
    case 'thenable':
      return `gọi method then của thenable mà ${target} đã resolve với`
    case 'microtask':
      return 'chạy một callback của queueMicrotask'
  }
}

export const VI_PHRASES: ExplainPhrases = {
  promiseRef: (pid, line, atStart) =>
    line === undefined ? `Promise ${pid}` : `${atStart ? 'Promise' : 'promise'} ở dòng ${line}`,
  timerRef: (tid, line, atStart) =>
    line === undefined
      ? `${atStart ? 'Timer' : 'timer'} ${tid}`
      : `${atStart ? 'Timer' : 'timer'} đặt ở dòng ${line}`,
  describe: {
    'run:start': () => 'Run bắt đầu: Script chạy như Task đầu tiên.',
    'run:halted': (e) =>
      e.reason === 'natural'
        ? 'Run kết thúc tự nhiên: không còn Task hay Job nào để chạy.'
        : `Run bị dừng vì Budget ${e.reason}${e.limit === undefined ? '' : ` (${e.limit})`} đã cạn; không có gì sau điểm này được thực thi.`,
    'task:queue': (e, name) =>
      e.source === 'timer' && e.tid !== undefined
        ? `Đã đến giờ của ${name.timer(e.tid)}: callback của nó vào Task Queue thành Task ${e.taskId}. Nó chạy khi call stack trống và event loop chọn đến nó.`
        : e.source === 'animation-frame'
          ? `Bước rendering chạy lần lượt từng callback của requestAnimationFrame; callback này hiện là Task ${e.taskId}, và một Checkpoint diễn ra ngay sau nó trước callback kế tiếp.`
          : `Task ${e.taskId} vào hàng đợi, nguồn gốc là ${taskSource(e.source)}${e.dueUs === undefined ? '' : `, đến hạn ở ${e.dueUs / 1000} ms thời gian ảo`}. Nó chạy khi call stack trống và event loop chọn đến nó.`,
    'task:begin': (e) => `Event loop bắt đầu chạy Task ${e.taskId}.`,
    'task:end': (e) => `Task ${e.taskId} chạy xong. Checkpoint diễn ra trước Task kế tiếp.`,
    'checkpoint:begin': (e) =>
      `Checkpoint bắt đầu (${checkpointReason(e.reason)}): mọi Job trong hàng đợi chạy ngay bây giờ, kể cả Job do Job khác tạo ra, trước khi làm bất cứ việc gì khác.`,
    'checkpoint:end': (e) =>
      `Checkpoint kết thúc (${checkpointReason(e.reason)}): hàng đợi Job đã trống.`,
    'job:enqueue': (e, name) =>
      `Job ${e.jobId} vào hàng đợi để ${jobWork(e, name.promiseInline)}. Job chạy ở Checkpoint kế tiếp chứ không phải ngay lúc này.`,
    'job:begin': (e) => `Job ${e.jobId} bắt đầu. Các Job chạy trọn vẹn, từng cái một.`,
    'job:end': (e) => `Job ${e.jobId} chạy xong; Job kế tiếp trong hàng đợi (nếu có) sẽ chạy.`,
    'frame:push': (e) =>
      e.builtin
        ? `Engine đi vào hàm built-in ${e.label}.`
        : `Lời gọi ${e.label} bắt đầu, frame của nó được đẩy lên call stack.`,
    'frame:pop': (e) =>
      e.builtin
        ? `Hàm built-in ${e.label} trả về.`
        : `${e.label} trả về và frame của nó bị lấy khỏi call stack.`,
    'timer:init': (e) =>
      `Timer ${e.tid} hẹn sau ${e.requestedMs} ms${e.clampedMs !== e.requestedMs ? `, nhưng bị nâng lên ${e.clampedMs} ms vì timer lồng sâu phải chờ ít nhất 4 ms (mức lồng ${e.nesting})` : ''}${e.repeat ? ', lặp lại' : ''}. Callback của nó thành Task khi đủ thời gian ảo trôi qua.`,
    'timer:fire': (e, name) =>
      `Event loop chọn Task của ${name.timer(e.tid)}; callback của nó chạy ngay bây giờ.`,
    'timer:clear': (e, name) =>
      `${name.timerStart(e.tid)} đã bị clear, nên callback của nó sẽ không chạy.`,
    'webapi:start': (e) =>
      `${webApi(e.api)}${e.detail ? ` (${e.detail})` : ''}. Nó nằm ngoài event loop cho đến khi ${e.taskId ? `Task ${e.taskId} của nó` : 'một Task'} vào hàng đợi${e.dueUs === undefined ? '' : `, ở ${e.dueUs / 1000} ms thời gian ảo`}.`,
    'webapi:cancel': (e) => `Thao tác ${e.opId} đã bị huỷ, nên callback của nó sẽ không chạy.`,
    'render:frame': (e) =>
      `Một lần rendering ở ${e.frameMs} ms: ${e.callbacks} callback của requestAnimationFrame chạy ngay bây giờ, cùng một timestamp. Callback chúng đăng ký thêm sẽ chờ frame kế tiếp.`,
    'promise:create': (e) => `Promise mới (${e.pid}) vừa tạo, ban đầu ở trạng thái pending.`,
    'promise:reaction': (e, name) =>
      `${name.promise(e.pid)} nhận một reaction qua ${viaWork(e.via)}. ${e.pending ? 'Promise vẫn đang pending nên reaction phải đợi đến khi nó settle.' : 'Promise đã settle từ trước nên reaction vào hàng đợi thành Job ngay.'}`,
    'promise:resolve': (e, name) =>
      e.with === 'thenable'
        ? `${name.promise(e.pid)} resolve với một thenable, nên một Job được xếp hàng để gọi method then của nó; promise vẫn pending cho đến khi Job đó chạy.`
        : e.with === 'self'
          ? `${name.promise(e.pid)} resolve với chính nó, đây là TypeError nên nó bị reject.`
          : `${name.promise(e.pid)} resolve với một giá trị thường nên settle ngay.`,
    'promise:settle': (e, name) =>
      `${name.promise(e.pid)} đã ${e.state}, nên các reaction của nó được xếp vào hàng đợi thành Job, chạy ở Checkpoint kế tiếp.`,
    'await:suspend': (e, name) =>
      `Hàm async ${e.fid} tạm dừng ở await${e.awaitedPid ? `, chờ ${name.promiseInline(e.awaitedPid)}` : ''}. Nó chạy tiếp trong một Job khi promise đang await đã settle.`,
    'await:resume': (e) =>
      `Hàm async ${e.fid} chạy tiếp sau await${e.mode === 'throw' ? ' vì promise đang await bị reject, nên await ném lỗi' : e.mode === 'next' ? ' với giá trị đã fulfilled' : ''}.`,
    'asyncgen:yield': (e) =>
      `Async generator ${e.gid} yield một giá trị cho bên nhận và tạm dừng đến yêu cầu kế tiếp.`,
    'asyncgen:resume': (e) => `Async generator ${e.gid} chạy tiếp để phục vụ yêu cầu kế tiếp.`,
    'asyncgen:return-await': (e) =>
      `Async generator ${e.gid} await giá trị truyền vào return() rồi mới kết thúc.`,
    'rejection:track': (e, name) =>
      e.op === 'reject'
        ? `${name.promise(e.pid)} bị reject khi chưa gắn handler nào, nên host bắt đầu theo dõi nó như một rejection có thể không được xử lý.`
        : `Một handler vừa gắn vào ${name.promiseInline(e.pid)} sau khi nó đã bị reject, nên nó không còn bị coi là unhandled.`,
    'rejection:notify': (e, name) =>
      e.outcome === 'unhandled'
        ? `Không có handler nào gắn kịp lúc, nên ${name.promiseInline(e.pid)} được báo là unhandled rejection: ${e.message}`
        : `Handler gắn muộn, nên host báo rejectionhandled cho ${name.promiseInline(e.pid)}: ${e.message}`,
    'exception:report': (e) =>
      `Một exception thoát ra khỏi ${exceptionOrigin(e.origin)} và được báo lên console: ${e.message}${e.unsupportedApi ? ` (${e.unsupportedApi} chưa được simulator hỗ trợ)` : ''}`,
    console: (e) => `console.${e.level} in ra ${JSON.stringify(e.text)}.`,
  },
}
