/**
 * ui — 管理后台的通用展示组件集合（骨架级复用件）。
 *
 * 这些组件【只做展示与交互】，不碰任何业务接口：
 *   AdminEmptyState / AdminSkeleton / AdminErrorState / AdminConfirmDialog /
 *   AdminToast / AdminBulkBar / AdminDataTable / AdminListDetail
 *
 * 业务页面通过 props + slot 使用它们，样式全部在 styles.js（卸载插件即消失）。
 *
 * @module privhub-admin-console/client/ui
 */

import { adminState, setCollapsed } from './store.js'
import { confirmState, settleConfirm } from './confirm.js'
import { toasts, dismissToast } from './toast.js'

/* ============ 空状态：图标 + 标题 + 说明 + 主按钮 ============ */
const AdminEmptyState = {
  name: 'admin-empty-state',
  props: {
    icon: { type: String, default: '📭' },
    title: { type: String, required: true },
    desc: { type: String, default: '' },
    actionText: { type: String, default: '' },
    hint: { type: String, default: '' },
  },
  emits: ['action'],
  template: `
    <div class="ad-empty">
      <div class="ad-empty-icon">{{ icon }}</div>
      <div class="ad-empty-title">{{ title }}</div>
      <div v-if="desc" class="ad-empty-desc">{{ desc }}</div>
      <button v-if="actionText" class="ad-btn ad-btn-primary" @click="$emit('action')">{{ actionText }}</button>
      <div v-if="hint" class="ad-empty-hint">{{ hint }}</div>
    </div>
  `,
}

/* ============ 骨架屏：列表行 / 卡片两种形态，绝不整屏 spinner ============ */
const AdminSkeleton = {
  name: 'admin-skeleton',
  props: {
    /** 'rows' 列表行 | 'card' 详情卡片 | 'grid' 概览卡片 */
    variant: { type: String, default: 'rows' },
    rows: { type: Number, default: 6 },
    /** 内容区最窄宽度（px）：小于它自动切换成卡片形态，避免窄栏里塞大表格 */
    minWidth: { type: Number, default: 0 },
  },
  data() { return { narrow: false } },
  mounted() {
    if (!this.minWidth || typeof ResizeObserver === 'undefined') return
    this._ro = new ResizeObserver((entries) => {
      const w = entries[0] && entries[0].contentRect ? entries[0].contentRect.width : 0
      this.narrow = w > 0 && w < this.minWidth
    })
    this._ro.observe(this.$el)
  },
  beforeUnmount() { if (this._ro) { this._ro.disconnect(); this._ro = null } },
  computed: {
    shape() { return this.narrow ? 'card' : this.variant },
    count() { return Math.max(1, Math.min(24, Number(this.rows) || 6)) },
  },
  template: `
    <div class="ad-skeleton" :class="'is-' + shape" aria-busy="true" aria-label="加载中">
      <div v-for="i in count" :key="i" class="ad-sk-item">
        <div class="ad-sk-bar w40"></div>
        <div class="ad-sk-bar w70"></div>
        <div v-if="shape !== 'rows'" class="ad-sk-bar w55"></div>
      </div>
    </div>
  `,
}

/* ============ 局部错误卡片：错误信息 + 重试（不整页白屏） ============ */
const AdminErrorState = {
  name: 'admin-error-state',
  props: {
    message: { type: String, default: '加载失败' },
    detail: { type: String, default: '' },
    retryText: { type: String, default: '重 试' },
  },
  emits: ['retry'],
  template: `
    <div class="ad-error">
      <div class="ad-error-icon">⚠️</div>
      <div class="ad-error-body">
        <div class="ad-error-title">{{ message }}</div>
        <div v-if="detail" class="ad-error-detail">{{ detail }}</div>
      </div>
      <button class="ad-btn" @click="$emit('retry')">{{ retryText }}</button>
    </div>
  `,
}

/* ============ 危险操作确认：支持「输入关键词才能确认」 ============ */
const AdminConfirmDialog = {
  name: 'admin-confirm-dialog',
  data() { return { st: confirmState } },
  computed: {
    canConfirm() {
      if (!this.st.require) return true
      return String(this.st.input || '').trim() === this.st.require
    },
  },
  methods: {
    ok() { if (this.canConfirm) settleConfirm(true) },
    cancel() { settleConfirm(false) },
    onKeydown(e) {
      if (e.key === 'Escape') { e.stopPropagation(); this.cancel() }
      else if (e.key === 'Enter' && this.canConfirm) { e.preventDefault(); this.ok() }
    },
  },
  template: `
    <div v-if="st.open" class="ad-mask" @click.self="cancel" @keydown="onKeydown">
      <div class="ad-dialog" :class="{ danger: st.danger }" role="dialog" aria-modal="true">
        <div class="ad-dialog-head">
          <span class="ad-dialog-icon">{{ st.danger ? '⚠️' : '❓' }}</span>
          <span class="ad-dialog-title">{{ st.title }}</span>
        </div>
        <div class="ad-dialog-body">
          <div v-if="st.message" class="ad-dialog-msg">{{ st.message }}</div>
          <div v-if="st.detail" class="ad-dialog-detail">{{ st.detail }}</div>
          <div v-if="st.require" class="ad-dialog-req">
            <div class="ad-dialog-req-hint">此操作不可撤销，请输入 <b>{{ st.require }}</b> 以确认：</div>
            <input
              class="ad-input"
              v-model="st.input"
              :placeholder="st.require"
              autofocus
              @keydown.enter.prevent="ok"
            />
          </div>
        </div>
        <div class="ad-dialog-foot">
          <button class="ad-btn" @click="cancel">{{ st.cancelText }}</button>
          <button
            class="ad-btn"
            :class="st.danger ? 'ad-btn-danger' : 'ad-btn-primary'"
            :disabled="!canConfirm"
            @click="ok"
          >{{ st.confirmText }}</button>
        </div>
      </div>
    </div>
  `,
}

/* ============ Toast 容器：右下角堆叠，3 类语义色 ============ */
const AdminToast = {
  name: 'admin-toast',
  data() { return { list: toasts } },
  methods: {
    icon(t) { return t === 'error' ? '⛔' : t === 'warn' ? '⚠️' : t === 'info' ? 'ℹ️' : '✅' },
    close(id) { dismissToast(id) },
  },
  template: `
    <div class="ad-toasts" role="status" aria-live="polite">
      <div v-for="t in list" :key="t.id" class="ad-toast" :class="'is-' + t.type">
        <span class="ad-toast-icon">{{ icon(t.type) }}</span>
        <span class="ad-toast-msg">{{ t.msg }}</span>
        <button class="ad-toast-x" title="关闭" @click="close(t.id)">✕</button>
      </div>
    </div>
  `,
}

/* ============ 批量操作栏：有选中时才浮现 ============ */
const AdminBulkBar = {
  name: 'admin-bulk-bar',
  props: {
    /** 选中数量（0 时整条不显示） */
    count: { type: Number, default: 0 },
    /** 单位名，如「个用户」 */
    unit: { type: String, default: '项' },
  },
  emits: ['clear'],
  template: `
    <div v-if="count > 0" class="ad-bulk">
      <span class="ad-bulk-count">已选 {{ count }} {{ unit }}</span>
      <div class="ad-bulk-actions"><slot></slot></div>
      <button class="ad-btn ad-btn-sm" @click="$emit('clear')">取消选择</button>
    </div>
  `,
}

/* ============ 数据表：统一表头 / 行高 / 选中态 / 空行 ============ */
const AdminDataTable = {
  name: 'admin-data-table',
  props: {
    /** 列定义：{ key, label, width?, align?, nowrap? } */
    columns: { type: Array, default: () => [] },
    rows: { type: Array, default: () => [] },
    /** 行标识字段 */
    rowKey: { type: String, default: 'id' },
    /** 可多选（表头带全选） */
    selectable: { type: Boolean, default: false },
    /** 已选 id 数组（v-model:selection） */
    selection: { type: Array, default: () => [] },
    /** 行是否可选中（返回 false 则不渲染复选框） */
    selectableRow: { type: Function, default: null },
    /** 点击行是否触发 row-click */
    clickable: { type: Boolean, default: false },
    emptyText: { type: String, default: '暂无数据' },
  },
  emits: ['update:selection', 'row-click'],
  computed: {
    ids() { return this.rows.map((r) => r[this.rowKey]) },
    allChecked() { return this.rows.length > 0 && this.ids.every((id) => this.selection.includes(id)) },
    someChecked() { return this.selection.length > 0 && !this.allChecked },
  },
  methods: {
    cellValue(row, col) {
      if (typeof col.render === 'function') return col.render(row)
      const v = row[col.key]
      return v === undefined || v === null || v === '' ? '—' : v
    },
    isSelected(row) { return this.selection.includes(row[this.rowKey]) },
    canSelect(row) { return this.selectableRow ? this.selectableRow(row) !== false : true },
    toggleRow(row) {
      if (!this.selectable || !this.canSelect(row)) return
      const id = row[this.rowKey]
      const next = this.selection.slice()
      const i = next.indexOf(id)
      if (i >= 0) next.splice(i, 1)
      else next.push(id)
      this.$emit('update:selection', next)
    },
    toggleAll() {
      if (!this.selectable) return
      const selectable = this.rows.filter((r) => this.canSelect(r)).map((r) => r[this.rowKey])
      if (this.allChecked) {
        this.$emit('update:selection', this.selection.filter((id) => !selectable.includes(id)))
      } else {
        const next = this.selection.slice()
        for (const id of selectable) if (!next.includes(id)) next.push(id)
        this.$emit('update:selection', next)
      }
    },
  },
  template: `
    <div class="ad-table-wrap">
      <table class="ad-table">
        <thead>
          <tr>
            <th v-if="selectable" class="ad-th-check">
              <input
                type="checkbox"
                :checked="allChecked"
                :indeterminate.prop="someChecked"
                title="全选 / 取消全选"
                @change="toggleAll"
              />
            </th>
            <th
              v-for="col in columns" :key="col.key"
              :style="{ width: col.width || 'auto', textAlign: col.align || 'left' }"
            >{{ col.label }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in rows" :key="row[rowKey]"
            :class="{ on: isSelected(row), clickable: clickable }"
            @click="clickable && $emit('row-click', row)"
          >
            <td v-if="selectable" class="ad-td-check" @click.stop>
              <input
                v-if="canSelect(row)"
                type="checkbox"
                :checked="isSelected(row)"
                @change="toggleRow(row)"
              />
            </td>
            <td
              v-for="col in columns" :key="col.key"
              :style="{ textAlign: col.align || 'left' }"
              :class="{ nowrap: col.nowrap }"
            >
              <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">{{ cellValue(row, col) }}</slot>
            </td>
          </tr>
          <tr v-if="!rows.length">
            <td :colspan="columns.length + (selectable ? 1 : 0)" class="ad-table-empty">{{ emptyText }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  `,
}

/* ============ 列表-详情容器：左列表（可拖拽 280-480） + 右详情 ============ */
const AdminListDetail = {
  name: 'admin-list-detail',
  props: {
    /** 列表最小宽度 */
    min: { type: Number, default: 280 },
    /** 列表最大宽度 */
    max: { type: Number, default: 480 },
    /** 详情是否已选中对象（<768px 时决定显示列表还是详情） */
    hasDetail: { type: Boolean, default: false },
  },
  data() { return { st: adminState, dragging: false } },
  computed: {
    width() { return Math.min(this.max, Math.max(this.min, this.st.detailWidth || 320)) },
    mobileDetail() { return this.st.mobileDetail && this.hasDetail },
  },
  methods: {
    setCollapsed,
    startDrag(e) {
      e.preventDefault()
      this.dragging = true
      const startX = e.clientX
      const startW = this.width
      const move = (ev) => {
        const next = Math.min(this.max, Math.max(this.min, startW + (ev.clientX - startX)))
        this.st.detailWidth = next
      }
      const up = () => {
        this.dragging = false
        document.removeEventListener('mousemove', move)
        document.removeEventListener('mouseup', up)
        try { localStorage.setItem('privhub_admin_detail_w', String(this.st.detailWidth)) } catch { /* 忽略 */ }
      }
      document.addEventListener('mousemove', move)
      document.addEventListener('mouseup', up)
    },
    backToList() { this.st.mobileDetail = false },
  },
  mounted() {
    try {
      const saved = parseInt(localStorage.getItem('privhub_admin_detail_w') || '', 10)
      if (saved >= this.min && saved <= this.max) this.st.detailWidth = saved
    } catch { /* 忽略 */ }
  },
  template: `
    <div class="ad-ld" :class="{ dragging: dragging, 'show-detail': mobileDetail }">
      <div class="ad-ld-list" :style="{ width: width + 'px' }">
        <slot name="list"></slot>
      </div>
      <div class="ad-ld-grip" title="拖拽调整列表宽度" @mousedown="startDrag"></div>
      <div class="ad-ld-detail">
        <div class="ad-ld-backbar">
          <button class="ad-btn ad-btn-sm" @click="backToList">← 返回列表</button>
        </div>
        <slot name="detail"></slot>
      </div>
    </div>
  `,
}

export {
  AdminEmptyState, AdminSkeleton, AdminErrorState, AdminConfirmDialog,
  AdminToast, AdminBulkBar, AdminDataTable, AdminListDetail,
}
