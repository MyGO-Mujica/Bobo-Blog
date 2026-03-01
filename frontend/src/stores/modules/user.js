import { defineStore } from 'pinia'
import { ref } from 'vue'
import { userGetInfoService } from '../../api/user'

// 用户模块 token setToken removeToken
export const useUserStore = defineStore(
  'mygo-user',
  () => {
    const token = ref('')
    const setToken = (newToken) => {
      token.value = newToken
    }
    const removeToken = () => {
      token.value = ''
    }

    const user = ref({})
    const getUser = async () => {
      const res = await userGetInfoService() // 请求获取数据
      user.value = res.data.data

      // 确保角色字段存在，默认为普通用户
      user.value.role = user.value.role || 'user'
    }
    const setUser = (obj) => {
      user.value = obj
    }

    // 检查是否为管理员
    const isAdmin = () => {
      return user.value?.role === 'admin'
    }

    return {
      token,
      setToken,
      removeToken,
      user,
      getUser,
      setUser,
      isAdmin
    }
  },
  {
    persist: true
  }
)
