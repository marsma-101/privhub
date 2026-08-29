/**
 * privhub-trash-ui · client — 回收站视图（trash-view slot）+ 图标栏角标
 *
 * 消费骨架桥 nav（trashList/trashView/fmtTime）与 bus：
 *   - listen trash:changed → 刷新列表与角标
 *   - 角标计数 = 待恢复条目数（通过 manifest barItems.badge 回传不行，
 *     改为监听 trash:changed 后更新 window.PrivHub.trashBadge，骨架轮询渲染）
 *
 * @module privhub-trash-ui/client
 */

const { api, nav, bus } = window.PrivHub

/* 角标：骨架图标栏渲染 barItems.badge 为响应式值（见骨架 openBarItem/模板） */
window.PrivHub.trashBadge = 0

const TrashView = {
  name: 'trash-view',
  data() { return { nav } },
  computed: {
    isAdmin() { const u = window.PrivHub.AUTH.user; return u && u.role === 'admin' },
  },
  methods: {
    async restore(t) { await nav.restoreTrash(t) },
    async purge(t) { await nav.purgeTrash(t) },
    async clean() { await nav.cleanExpiredTrash() },
    updateBadge() {
      window.PrivHub.badges.trash = this.nav.trashList.length
    },
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
        <span class="crumb" style="margin-left:8px">共 {{ nav.trashList.length }} 项（{{ isAdmin ? '全部用户' : '仅我删除的' }}）</span>
        <span class="spacer"></span>
        <button v-if="isAdmin" class="icon-btn" @click="clean">🧹 清空 30 天前条目</button>
      </div>
      <div class="main-body">
        <div v-if="nav.trashList.length === 0" class="empty">回收站是空的</div>
        <div v-else class="file-table-wrap">
          <div class="file-table-head" style="grid-template-columns:1fr 110px 130px 140px 170px">
            <span class="col-name">名称</span>
            <span class="col-size">来源项目</span>
            <span class="col-type">删除人</span>
            <span class="col-time">删除时间</span>
            <span class="col-time">操作</span>
          </div>
          <div v-for="t in nav.trashList" :key="t.id" class="file-table-row" style="grid-template-columns:1fr 110px 130px 140px 170px;cursor:default">
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
  },
}
