/**
 * privhub-admin · client 端 — 用户管理（挂 admin slot，弹窗形态）
 *
 * 通过 window.PrivHub.api 调后端；根元素为 modal-mask，点击遮罩或「关闭」
 * 时 $emit('close')，由骨架关闭弹窗。
 *
 * @module privhub-admin/client
 */

const { api } = window.PrivHub

const UserAdmin = {
  name: 'user-admin',
  data() {
    return {
      adminUsers: [],
      adminAllProjects: [],
      editUser: null,
      resetPwdUser: null,
      resetPwdValue: '',
    }
  },
  async mounted() {
    await this.load()
  },
  methods: {
    async load() {
      const r = await api('/privhub/api/admin/users')
      if (r.ok) { this.adminUsers = r.users; this.adminAllProjects = r.allProjects }
    },
    openEditUser(u) { this.editUser = JSON.parse(JSON.stringify(u)) },
    toggleProject(p) {
      const i = this.editUser.projects.indexOf(p)
      if (i >= 0) this.editUser.projects.splice(i, 1)
      else this.editUser.projects.push(p)
    },
    async saveUser() {
      const r = await api('/privhub/api/admin/user-update', { method: 'POST', body: JSON.stringify(this.editUser) })
      if (r.ok) { this.editUser = null; await this.load() }
      else window.PrivHub.toast(r.error || '保存失败', 'error')
    },
    async deleteUser(u) {
      if (!confirm('确认删除用户 ' + u.username + ' ？')) return
      const r = await api('/privhub/api/admin/user-delete', { method: 'POST', body: JSON.stringify({ username: u.username }) })
      if (r.ok) await this.load()
      else window.PrivHub.toast(r.error || '删除失败', 'error')
    },
    openResetPwd(u) { this.resetPwdUser = u; this.resetPwdValue = '' },
    async submitResetPwd() {
      const u = this.resetPwdUser
      if (!u) return
      if (this.resetPwdValue.length < 6) { window.PrivHub.toast('新密码至少6位', 'error'); return }
      const r = await api('/privhub/api/admin/user-reset-password', { method: 'POST', body: JSON.stringify({ username: u.username, newPassword: this.resetPwdValue }) })
      if (r.ok) { this.resetPwdUser = null; this.resetPwdValue = ''; window.PrivHub.toast('密码已重置'); await this.load() }
      else window.PrivHub.toast(r.error || '重置失败', 'error')
    },
  },
  template: `
    <div class="view-page">
      <div class="view-inner">
        <h2>👥 用户管理</h2>
        <div class="modal-body">
          <table class="u-table">
            <thead><tr><th>用户名</th><th>显示名</th><th>角色</th><th>负责项目</th><th>操作</th></tr></thead>
            <tbody>
              <tr class="u-row" v-for="u in adminUsers" :key="u.username">
                <td>{{ u.username }}</td>
                <td>{{ u.displayName }}</td>
                <td>{{ u.role === 'admin' ? '管理员' : '普通用户' }}</td>
                <td><span class="u-project-chip" v-for="p in u.projects" :key="p">{{ p }}</span></td>
                <td>
                  <button class="small-btn" @click="openEditUser(u)">编辑</button>
                  <button class="small-btn" @click="openResetPwd(u)">重置密码</button>
                  <button class="small-btn danger" @click="deleteUser(u)" v-if="u.username !== 'admin'">删除</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="modal-foot">
          <button class="btn btn-ghost" @click="$emit('close')">关 闭</button>
        </div>
      </div>

      <!-- 编辑用户 -->
      <div v-if="editUser" class="modal-mask" @click.self="editUser = null">
        <div class="modal" style="width:420px">
          <h2>编辑用户：{{ editUser.username }}</h2>
          <div class="modal-body">
            <div class="field"><label>显示名</label><input v-model="editUser.displayName" /></div>
            <div class="field">
              <label>角色</label>
              <select v-model="editUser.role" style="width:100%;padding:9px;border-radius:6px;border:1px solid var(--line);background:var(--bg);color:var(--text)">
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>
            <div class="field">
              <label>负责的项目（勾选其可访问的项目）</label>
              <div style="display:flex;flex-wrap:wrap;gap:8px">
                <span v-for="p in adminAllProjects" :key="p" class="u-project-chip" style="cursor:pointer;padding:4px 10px" :style="editUser.projects.includes(p) ? 'background:rgba(90,130,200,.25)' : ''" @click="toggleProject(p)">{{ p }}</span>
              </div>
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="editUser = null">取 消</button>
            <button class="btn btn-primary" style="width:auto" @click="saveUser">保 存</button>
          </div>
        </div>
      </div>

      <!-- 重置密码 -->
      <div v-if="resetPwdUser" class="modal-mask" @click.self="resetPwdUser = null">
        <div class="modal" style="width:380px">
          <h2>🔑 重置密码：{{ resetPwdUser.username }}</h2>
          <div class="modal-body">
            <div class="field">
              <label>新密码（至少6位）</label>
              <input v-model="resetPwdValue" type="text" placeholder="输入新密码" />
            </div>
            <div style="font-size:12px;color:var(--muted)">
              重置后该用户的旧密码立即失效，原有登录会话将被强制退出。
            </div>
          </div>
          <div class="modal-foot">
            <button class="btn btn-ghost" @click="resetPwdUser = null">取 消</button>
            <button class="btn btn-primary" style="width:auto" @click="submitResetPwd">确认重置</button>
          </div>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-admin',
  drawerWidth: 560,
  slots: {
    admin: UserAdmin,
  },
}
