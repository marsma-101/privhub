/**
 * privhub-trash-ui · client — 回收站视图（trash-view slot）+ 图标栏角标
 *
 * 消费骨架桥 nav（trashList/trashView/fmtTime）与 bus：
 *   - listen trash:changed → 刷新列表与角标
 *   - 角标计数：写入骨架的反应式 window.PrivHub.badges.trash
 *     （由 shell 的 app-iconbar 组件读取渲染；此前曾写 window.PrivHub.trashBadge
 *      这个无任何读取方的死变量，导致角标看起来「始终为 0」）
 *
 * ## 与主索引的关系（2026-11 扁平化后已落地）
 *
 * 主索引（`privhub-svc-fileindex`）是回收站的**唯一数据源**：`/privhub/api/trash-list`
 * 现在优先读索引里的 `trashed` 条目（返回 `source: 'index'`），物理 `trash.json`
 * 只在索引不可用时兜底（`source: 'physical'`）。本视图不需要区分这两种来源。
 *
 * 关于 `t.id` 与 `t.fileId`：
 *   - **物理回收站条目**：`id` 是回收站记录 id（`<时间戳>_<4字节hex>`，见 core 的
 *     `moveToTrash`），`fileId` 为空 —— 这类条目是扁平化之前删的，还没有主索引身份。
 *   - **虚拟回收站条目**：`id` 与 `fileId` **是同一个值**（主索引的 fileId，形如
 *     `Fmwd...`）。这不是巧合也不是遗留瑕疵：扁平化后文件只有索引这一个身份，
 *     回收站记录只是该条目上的一个 `trashed` 标记，不存在「记录 id ≠ 文件 id」。
 *
 * ⚠ 仍然不要把 `t.id` 直接拿去拼 `/f/<id>` 来预览回收站里的文件：
 *   `/f/<id>` 只服务**未删除**的条目（`auth.ts` 会拒掉 `trashed === true`）。
 *   想预览回收站内容，先恢复再预览。
 *
 * `restoreTrash` / `purgeTrash` 认的是 `t.id`，两种来源都用它，调用方无需分支。
 *
 * @module privhub-trash-ui/client
 */

const { nav, bus } = window.PrivHub

const TrashView = {
  name: 'trash-view',
  data() { return { nav } },
  computed: {
    isAdmin() { const u = window.PrivHub.AUTH.user; return u && u.role === 'admin' },
    // 项目上下文：只显示当前项目内的回收条目（整个项目删除的条目视为该项目）
    shown() {
      if (!this.nav.project) return []
      return this.nav.trashList.filter((t) => t.project === this.nav.project || t.relPath === '')
    },
  },
  methods: {
    async restore(t) { await nav.restoreTrash(t) },
    async purge(t) { await nav.purgeTrash(t) },
    async clean() { await nav.cleanExpiredTrash() },
    /* 角标口径与骨架 loadTrash 保持一致：
     * 已选项目 → 该项目条目数（含整项目删除的条目）；未选项目 → 全部可见条目数。
     * 两处必须用同一规则，否则切换项目时角标会互相覆盖。 */
    updateBadge() {
      if (!window.PrivHub.badges) return
      const cur = this.nav.project
      const list = this.nav.trashList || []
      window.PrivHub.badges.trash = cur
        ? list.filter((t) => t.project === cur || t.relPath === '').length
        : list.length
    },
  },
  watch: {
    // 切换项目时角标口径随之变化
    'nav.project'() { this.updateBadge() },
  },
  mounted() {
    this._off = bus.on('trash:changed', () => { this.updateBadge() })
    this.updateBadge()
  },
  beforeUnmount() { if (this._off) this._off() },
  template: `
    <div style="display:contents">
      <div class="main-head">
        <span class="breadcrumb"><span style="color:var(--text)">🗑️ 回收站</span></span>
        <span class="crumb" style="margin-left:8px">{{ nav.project ? '当前项目：' + nav.project + '（' + shown.length + ' 项）' : '未选择项目' }}</span>
        <span class="spacer"></span>
        <button v-if="isAdmin" class="icon-btn" @click="clean">🧹 清空 30 天前条目</button>
      </div>
      <div class="main-body">
        <div v-if="!nav.project" class="empty">
          <div style="font-size:15px;margin-bottom:6px">请先选择一个项目</div>
          <div>回收站仅显示当前项目内的条目。返回文件视图，在左侧选择项目后再查看。</div>
          <button class="btn btn-primary" style="width:auto;margin-top:14px" @click="nav.backToWelcome">去选择项目 →</button>
        </div>
        <div v-else-if="shown.length === 0" class="empty">当前项目回收站是空的</div>
        <div v-else class="file-table-wrap">
          <div class="file-table-head" style="grid-template-columns:1fr 110px 130px 140px 170px">
            <span class="col-name">名称</span>
            <span class="col-size">来源项目</span>
            <span class="col-type">删除人</span>
            <span class="col-time">删除时间</span>
            <span class="col-time">操作</span>
          </div>
          <div v-for="t in shown" :key="t.id" class="file-table-row" style="grid-template-columns:1fr 110px 130px 140px 170px;cursor:default">
            <span class="col-name" :title="t.relPath === '' ? '整个项目' : ('原路径：' + (t.relPath || '项目根目录'))"><span class="tico">{{ t.relPath === '' ? '📦' : (t.isDir ? '📁' : '📄') }}</span>{{ t.name }}</span>
            <span class="col-size">{{ t.relPath === '' ? '（项目本身）' : t.project }}</span>
            <span class="col-type">{{ t.deletedBy }}</span>
            <span class="col-time">{{ nav.fmtTime(t.deletedAt) }}</span>
            <span>
              <button class="small-btn" @click="restore(t)">↩ 恢复</button>
              <button class="small-btn danger" style="margin-left:6px" @click="purge(t)">彻底删除</button>
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-trash-ui',
  slots: {
    'trash-view': TrashView,
    /* 管理控制台「内容治理 > 回收站」用同一组件渲染（同一份实现、两处入口） */
    'admin-trash': TrashView,
  },
}
