/**
 * deps — 对外部桥的依赖收敛点。
 *
 * 全插件只在这里解构 window.PrivHub / window.Vue，其余模块一律从本模块 import。
 * 好处：桥的键增删只需改这一处；也让「谁依赖骨架」一眼可见。
 *
 * @module privhub-admin-console/client/deps
 */

const { api, nav, bus, AUTH, toast, manifests, barItems } = window.PrivHub
const { reactive, computed } = window.Vue

export { api, nav, bus, AUTH, toast, manifests, barItems, reactive, computed }
