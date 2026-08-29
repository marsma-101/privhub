/**
 * privhub-files-preview · client — 预览条（preview slot）
 *
 * 读取骨架桥 nav.selected / nav.preview / nav.rightOpen：
 *   - image：preview-raw 直载
 *   - text：内容高亮展示
 *   - pdf：iframe 直载
 * 其余类型显示「暂不支持预览」。
 *
 * @module privhub-files-preview/client
 */

const { nav, previewImageUrl, previewPdfUrl } = window.PrivHub

const PreviewPanel = {
  name: 'files-preview',
  data() { return { nav } },
  computed: {
    selected() { return nav.selected },
    preview() { return nav.preview },
  },
  template: `
    <div class="right-panel">
      <div class="right-head">
        <span>预览</span>
        <span class="right-close" @click="nav.rightOpen = false">✕</span>
      </div>
      <div class="right-body">
        <div v-if="!selected" class="preview-empty">选中文件后在此预览</div>
        <div v-else-if="selected.isDir" class="preview-empty">📁 文件夹<br/>{{ selected.name }}</div>
        <div v-else-if="preview && preview.type === 'image'" style="text-align:center">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <img class="preview-img" :src="previewImageUrl(selected.name)" alt="preview" />
        </div>
        <div v-else-if="preview && preview.type === 'text'" style="text-align:left">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <pre class="preview-text">{{ preview.data }}</pre>
        </div>
        <div v-else-if="preview && preview.type === 'pdf'" style="text-align:center">
          <div style="font-weight:600;margin-bottom:10px">{{ selected.name }}</div>
          <iframe class="preview-pdf" :src="previewPdfUrl(selected.name)"></iframe>
        </div>
        <div v-else class="preview-empty">
          <div style="font-size:30px;margin-bottom:10px">📄</div>
          {{ selected ? selected.name : '' }}<br/>暂不支持预览该文件类型
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-files-preview',
  slots: {
    preview: PreviewPanel,
  },
}
