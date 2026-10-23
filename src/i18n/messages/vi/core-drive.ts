import type en from '../en/core-drive'
import examples from './drive-examples'
import narration from './drive-narration'
import info from './drive-info'

export default {
  drive: {
    examples,
    narration,
    info,
    ai: {
      keyTitle: 'Kết nối OpenRouter để chạy Drive me cho Script này',
      keyBody: 'Script này chưa có hướng dẫn soạn sẵn. Có key OpenRouter, AI sẽ viết hướng dẫn từ Run này. Script và Trace chỉ được gửi đi khi bạn bấm Drive me.',
      connect: 'Kết nối',
      formatBody: 'Câu trả lời của AI không có bước nào dùng được. Thử lại, hoặc chọn model khác trong settings.',
      retry: 'Thử lại',
    },
    region: 'Hướng dẫn Drive me',
    progress: 'Bước {current} / {total}',
    escHint: 'Nhấn Esc hoặc Kết thúc để thoát bất cứ lúc nào.',
    prev: 'Trước',
    next: 'Tiếp',
    done: 'Xong',
    end: 'Kết thúc',
    why: 'Tại sao',
    infoButton: 'Bên trong',
    infoSource: 'Nguồn',
    start: 'Drive me',
    stop: 'Kết thúc Drive me',
    loading: 'Đang chuẩn bị hướng dẫn…',
    emptyTitle: 'Script này chưa có hướng dẫn',
    emptyBody: 'Nạp một ví dụ để theo hướng dẫn từng bước của nó, hoặc tự đi qua replay bằng các nút playback.',
    errorTitle: 'Không bắt đầu được hướng dẫn',
    errorBody: 'Có lỗi khi chuẩn bị các bước. Thử lại, hoặc tự đi qua replay.',
  },
} satisfies typeof en
