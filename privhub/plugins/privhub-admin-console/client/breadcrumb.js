/**
 * breadcrumb — 顶部栏面包屑。
 *
 * 最后一项为当前位置（不可点），前面的都可点击返回上级。
 * `admin:home` 事件表示「回到管理概览」。
 *
 * @module privhub-admin-console/client/breadcrumb
 */

const AdminBreadcrumb = {
  name: 'admin-breadcrumb',
  props: {
    /** [{ label, key? }]；key 为空表示当前项 */
    items: { type: Array, default: () => [] },
  },
  emits: ['pick'],
  template: `
    <nav class="ad-crumb" aria-label="位置">
      <template v-for="(it, i) in items" :key="i">
        <span v-if="i > 0" class="ad-crumb-sep">/</span>
        <span
          class="ad-crumb-item"
          :class="{ on: i === items.length - 1, linkable: i < items.length - 1 }"
          :title="i < items.length - 1 ? '返回' + it.label : it.label"
          @click="i < items.length - 1 && $emit('pick', it)"
        >{{ it.label }}</span>
      </template>
    </nav>
  `,
}

export { AdminBreadcrumb }
