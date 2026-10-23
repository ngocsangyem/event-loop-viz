import type en from '../en/core'
import editor from './core-editor'
import playback from './core-playback'
import panels from './core-panels'
import drive from './core-drive'

export default {
  ...editor,
  ...playback,
  ...panels,
  ...drive,
  app: {
    title: 'Event Loop Visualizer',
    tagline: 'Mô hình Chrome 155',
  },
  header: {
    visualization: 'Cách hiển thị',
    panels: 'Bảng',
    panelsView: 'Xem dạng bảng',
    diagram: 'Sơ đồ',
    diagramView: 'Xem dạng sơ đồ',
    threeD: 'Cảnh 3D',
    threeDView: 'Xem dạng 3D',
    share: 'Chia sẻ',
    shareCopied: 'Đã chép liên kết',
    shareHint: 'Chép liên kết này để chia sẻ Script',
    shareUrl: 'Liên kết chia sẻ',
    theme: 'Giao diện',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    language: 'Ngôn ngữ',
    languageSwitch: 'Chuyển ngôn ngữ sang {name}',
    edit: 'Sửa',
    replay: 'Phát lại',
    replayRun: 'Phát lại · Lần chạy #{n}',
    keys: 'Phím',
    keysHint: 'In phím tắt cạnh các nút',
    menu: 'Menu',
    guides: 'Hướng dẫn',
    shareCopiedShort: 'Đã chép',
  },
  switch: {
    on: 'Bật',
    off: 'Tắt',
  },
  /** The `[V]TRACE` word in the dock that shows the Why rail and its Trace Events. */
  tracePanel: { open: 'Trace', close: 'Ẩn Trace' },
  shortcuts: {
    title: 'Phím tắt',
    hint: 'Phím tắt không hoạt động khi bạn đang gõ trong trình soạn code hay ô nhập.',
    play: 'Phát / tạm dừng',
    step: 'Lùi / tiến một bước',
    tick: 'Tick trước / sau',
    task: 'Task trước / sau',
    ends: 'Bước đầu / bước cuối hoặc Halt',
    tour: 'Điểm dừng tour trước / sau',
    ask: 'Mở / đóng Hỏi AI',
    mode: 'Sửa Script / quay lại Phát lại',
    run: 'Chạy Script',
    esc: 'Hủy lần chạy · đóng bảng hoặc hộp thoại',
    views: 'Bảng · Sơ đồ · Cảnh 3D',
    prefs: 'Ngôn ngữ · giao diện · liên kết chia sẻ',
    sheet: 'Bảng này',
    trace: 'Hiện / ẩn panel Trace',
    drive: 'Bắt đầu / kết thúc Drive me',
    groups: { playback: 'Phát lại', guides: 'Hướng dẫn', app: 'Script và ứng dụng' },
  },
} satisfies typeof en
