import axios from 'axios'
import { useUserStore } from '@/stores'
import router from '@/router'
// 开发环境默认直连后端；Docker 生产环境通过 Nginx 反向代理（设为空字符串）
const baseURL = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:3007'

const instance = axios.create({
  // TODO 1. 基础地址，超时时间
  baseURL,
  timeout: 10000
})

// 添加一个标志来防止重复显示401错误提示
let isRedirecting = false

// 请求拦截器
instance.interceptors.request.use(
  (config) => {
    // TODO 2. 携带token
    const useStore = useUserStore()
    if (useStore.token) {
      config.headers.Authorization = useStore.token
    }
    return config
  },
  (err) => Promise.reject(err)
)

// 响应拦截器
instance.interceptors.response.use(
  (res) => {
    // TODO 4. 摘取核心响应数据
    if (res.data.status === 0) {
      return res
    }
    // TODO 3. 处理业务失败
    // 处理业务失败, 给错误提示，抛出错误
    ElMessage.error(res.data.message || '服务异常')
    return Promise.reject(res.data)
  },
  (err) => {
    // TODO 5. 处理401错误
    // 错误的特殊情况 => 401 权限不足 或 token 过期 => 拦截到登录
    if (err.response?.status === 401) {
      // 防止重复提示和重复跳转
      if (!isRedirecting) {
        isRedirecting = true
        ElMessage.error('token过期或无效，请重新登录！')

        // 清除用户信息
        const useStore = useUserStore()
        useStore.removeToken()

        // 跳转到登录页
        router.push('/login').then(() => {
          // 跳转完成后重置标志
          isRedirecting = false
        })
      }
      return Promise.reject(err)
    }

    // 错误的默认情况 => 只要给提示
    ElMessage.error(err.response?.data?.message || '服务异常')
    return Promise.reject(err)
  }
)

export default instance
export { baseURL }
