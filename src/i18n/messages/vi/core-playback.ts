import type en from '../en/core-playback'

export default {
  transport: {
    region: 'Phát lại',
    start: 'Về đầu',
    backTask: 'Lùi một Task',
    backTick: 'Lùi một Tick',
    prev: 'Bước trước',
    next: 'Bước sau',
    forwardTick: 'Tiến một Tick',
    forwardTask: 'Tiến một Task',
    end: 'Đến cuối',
    play: 'Phát',
    pause: 'Tạm dừng',
    speed: 'Tốc độ',
    autostart: 'Tự phát',
    autostartHint: 'Tự phát ngay khi Run xong',
    word: {
      start: 'Đầu',
      task: 'Task',
      tick: 'Tick',
      prev: 'Trước',
      next: 'Sau',
      end: 'Cuối',
    },
  },
  scrubber: {
    timeline: 'Dòng thời gian',
    step: 'Bước {step} / {total}',
    marker: '{family} ở event {seq}',
  },
  eventList: {
    region: 'Event',
    filter: 'Lọc theo nhóm',
    showAll: 'Hiện mọi event',
  },
  detail: {
    region: 'Chi tiết event',
    bookkeeping: '(bookkeeping)',
    specStep: 'Bước spec',
    payload: 'Payload',
    source: 'Mã nguồn',
    cause: 'Nguyên nhân',
    sourceLine: 'dòng {line}, cột {column}',
    noSource: 'không có vị trí mã nguồn',
    noCause: 'không có (host khởi động)',
  },
} satisfies typeof en
