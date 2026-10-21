import type en from '../en/core'
import editor from './core-editor'
import playback from './core-playback'
import panels from './core-panels'

export default {
  ...editor,
  ...playback,
  ...panels,
  app: {
    title: 'Event Loop Visualizer',
    tagline: 'Chạy từng bước một event loop mô phỏng của trình duyệt',
  },
  header: {
    visualization: 'Cách hiển thị',
    panels: 'Bảng',
    panelsView: 'Xem dạng bảng',
    diagram: 'Sơ đồ',
    diagramView: 'Xem dạng sơ đồ',
    threeD: '3D',
    threeDView: 'Xem dạng 3D',
    share: 'Chia sẻ',
    shareCopied: 'Đã chép liên kết',
    shareHint: 'Chép liên kết này để chia sẻ Script',
    shareUrl: 'Liên kết chia sẻ',
    theme: 'Giao diện',
    themeSystem: 'Hệ thống',
    themeLight: 'Sáng',
    themeDark: 'Tối',
    language: 'Ngôn ngữ',
    askAi: 'Hỏi AI',
  },
} satisfies typeof en
