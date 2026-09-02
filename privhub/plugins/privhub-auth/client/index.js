/**
 * privhub-auth · client 端 — 登录/注册组件（挂 auth slot）
 *
 * 通过 window.PrivHub 与骨架通信：
 *   - PrivHub.api(path, opts)    统一 fetch（自动带 token）
 *   - PrivHub.AUTH               reactive 登录态（token / user）
 *   - PrivHub.logout()           清除登录态
 *
 * @module privhub-auth/client
 */

const AuthView = {
  name: 'auth-view',
  data() {
    return { mode: 'login', username: '', password: '', displayName: '', err: '', busy: false }
  },
  methods: {
    async submit() {
      if (this.busy) return // E5：提交中防重复提交
      const { api, AUTH } = window.PrivHub
      this.err = ''
      this.busy = true
      try {
        if (this.mode === 'login') {
          const r = await api('/privhub/api/login', { method: 'POST', body: JSON.stringify({ username: this.username, password: this.password }) })
          if (!r.ok) { this.err = r.error || '登录失败'; return }
          AUTH.token = r.token; AUTH.user = r.user
          localStorage.setItem('privhub_token', r.token)
        } else {
          if (this.password.length < 6) { this.err = '密码至少6位'; return }
          const r = await api('/privhub/api/register', { method: 'POST', body: JSON.stringify({ username: this.username, password: this.password, displayName: this.displayName }) })
          if (!r.ok) { this.err = r.error || '注册失败'; return }
          this.mode = 'login'; this.err = '注册成功，请登录'
        }
      } finally { this.busy = false }
    },
  },
  template: `
    <div class="auth-wrap">
      <div class="auth-card">
        <h1><span class="logo-dot"></span>私域枢纽</h1>
        <div class="auth-sub">公司内部文件管理系统</div>
        <div class="field"><label>用户名</label><input v-model="username" placeholder="请输入用户名" /></div>
        <div class="field" v-if="mode === 'register'"><label>显示名（可选）</label><input v-model="displayName" placeholder="显示名" /></div>
        <div class="field"><label>密码</label><input v-model="password" type="password" @keyup.enter="submit" placeholder="请输入密码" /></div>
        <button class="btn btn-primary" :disabled="busy" @click="submit">{{ busy ? '提交中…' : (mode === 'login' ? '登 录' : '注 册') }}</button>
        <div class="auth-err">{{ err }}</div>
        <div class="auth-switch">
          <template v-if="mode === 'login'">
            没有账号？<a @click="mode='register'; err=''">申请注册</a>
          </template>
          <template v-else>
            已有账号？<a @click="mode='login'; err=''">返回登录</a>
          </template>
        </div>
      </div>
    </div>
  `,
}

export default {
  id: 'privhub-auth',
  slots: {
    auth: AuthView,
  },
}
