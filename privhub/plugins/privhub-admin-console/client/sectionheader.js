/**
 * sectionheader — 内容区顶部的「页面标题 + 操作按钮」条。
 *
 * 统一各管理页的标题层级：标题、计数徽章、右侧主操作、下方 Tab 分区。
 *
 * @module privhub-admin-console/client/sectionheader
 */

const AdminSectionHeader = {
  name: 'admin-section-header',
  props: {
    title: { type: String, required: true },
    /** 标题右侧的灰色说明（如「共 12 条」） */
    meta: { type: String, default: '' },
    /** 当前 Tab（'key' 值）；为空则不渲染 Tab 行 */
    tab: { type: String, default: '' },
    /** [{ key, label, badge? }] */
    tabs: { type: Array, default: () => [] },
    /** 是否显示刷新按钮（由 AdminShell 统一提供 reload） */
    refreshable: { type: Boolean, default: true },
  },
  emits: ['update:tab', 'refresh'],
  template: `
    <div class="ad-sh">
      <div class="ad-sh-row">
        <h2 class="ad-sh-title">{{ title }}</h2>
        <span v-if="meta" class="ad-sh-meta">{{ meta }}</span>
        <div class="ad-sh-actions">
          <slot name="actions"></slot>
          <button v-if="refreshable" class="ad-btn ad-btn-sm" title="刷新当前管理页" @click="$emit('refresh')">↻ 刷新</button>
        </div>
      </div>
      <div v-if="tabs.length" class="ad-tabs" role="tablist">
        <div
          v-for="t in tabs" :key="t.key"
          class="ad-tab"
          :class="{ on: t.key === tab }"
          role="tab"
          :aria-selected="t.key === tab ? 'true' : 'false'"
          @click="$emit('update:tab', t.key)"
        >
          {{ t.label }}<span v-if="t.badge" class="ad-tab-badge">{{ t.badge }}</span>
        </div>
      </div>
    </div>
  `,
}

export { AdminSectionHeader }
