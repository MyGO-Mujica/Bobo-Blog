<script setup>
import { userRegisterService, userLoginService } from '@/api/user.js'
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useUserStore } from '@/stores'
import { useRouter } from 'vue-router'
import * as THREE from 'three' // 必须导入 THREE
import FOG from 'vanta/dist/vanta.fog.min'
import SketchAnimation from '@/components/SketchAnimation.vue'
const isRegister = ref(false)
const showAnimation = ref(false) // 控制动画显示

// 整个的用于提交的form数据对象
const formModel = ref({
  username: '',
  password: '',
  repassword: ''
})

// 表单验证
const validateForm = () => {
  // 用户名验证
  if (!formModel.value.username) {
    ElMessage.error('请输入用户名')
    return false
  }
  if (
    formModel.value.username.length < 5 ||
    formModel.value.username.length > 10
  ) {
    ElMessage.error('用户名必须是 5-10位 的字符')
    return false
  }

  // 密码验证
  if (!formModel.value.password) {
    ElMessage.error('请输入密码')
    return false
  }
  if (!/^\S{6,15}$/.test(formModel.value.password)) {
    ElMessage.error('密码必须是 6-15位 的非空字符')
    return false
  }

  // 注册时验证确认密码
  if (isRegister.value) {
    if (!formModel.value.repassword) {
      ElMessage.error('请输入确认密码')
      return false
    }
    if (formModel.value.password !== formModel.value.repassword) {
      ElMessage.error('两次输入密码不一致')
      return false
    }
  }

  return true
}

const register = async () => {
  // 注册成功之前，先进行校验，校验成功 → 请求，校验失败 → 自动提示
  if (!validateForm()) return

  const regName = formModel.value.username
  await userRegisterService(formModel.value)
  ElMessage.success('注册成功')
  isRegister.value = false
  // 自动填充用户名，清空密码
  formModel.value = {
    username: regName,
    password: '',
    repassword: ''
  }
}

const userStore = useUserStore()
const router = useRouter()
const login = async () => {
  if (!validateForm()) return

  const res = await userLoginService(formModel.value)
  userStore.setToken(res.data.token)
  ElMessage.success('登录成功')

  // 显示动画而不是直接跳转
  showAnimation.value = true
}

// 动画完成后的回调
const onAnimationComplete = () => {
  showAnimation.value = false
  router.push('/')
}

// 切换的时候，重置表单内容
watch(isRegister, (val) => {
  if (val) {
    // 切到注册时清空所有
    formModel.value = {
      username: '',
      password: '',
      repassword: ''
    }
  }
})
// 定义响应式引用
const vantaRef = ref(null) // 用于关联模板中的 div
let vantaEffect = null // 用于存储 Vanta 实例

// 组件挂载后初始化 Vanta
onMounted(() => {
  // 使用 FOG 效果，黑白红色系（黑色占比最大，白色次之，红色最少）
  vantaEffect = FOG({
    el: vantaRef.value,
    THREE: THREE,
    mouseControls: true,
    touchControls: true,
    gyroControls: false,
    minHeight: 200.0,
    minWidth: 200.0,
    highlightColor: 0xeae7e7,
    midtoneColor: 0xf91f00,
    lowlightColor: 0xffffff,
    baseColor: 0x2e2e2e,
    blurFactor: 0.49,
    speed: 1
  })
})

// 组件卸载前销毁 Vanta 实例，防止内存泄漏
onBeforeUnmount(() => {
  if (vantaEffect) {
    vantaEffect.destroy()
  }
})
</script>

<template>
  <div class="login-page-container" ref="vantaRef">
    <!-- 左上角动图和标题 -->
    <div class="header-section">
      <img src="@/assets/qb.gif" alt="动图" class="header-gif" />
      <h1 class="header-title">博博の客</h1>
    </div>

    <transition name="card-switch-anim" mode="out-in">
      <div class="form" :key="isRegister">
        <!-- 注册相关表单 -->
        <div v-if="isRegister">
          <div class="title">Welcome</div>
          <div class="subtitle">sign up to continue</div>
          <input
            v-model="formModel.username"
            class="input"
            type="text"
            placeholder="请输入用户名"
            @keyup.enter="register"
          />

          <input
            v-model="formModel.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="register"
          />

          <input
            v-model="formModel.repassword"
            class="input"
            type="password"
            placeholder="请输入再次密码"
            @keyup.enter="register"
          />

          <button @click="register" class="button-confirm">注册</button>

          <div class="link-container">
            <a href="#" @click.prevent="isRegister = false" class="link">
              ← 返回登录
            </a>
          </div>
        </div>

        <!-- 登录相关表单 -->
        <div v-else>
          <div class="title">Log In</div>
          <div class="subtitle">欢迎来到博博の客</div>

          <input
            v-model="formModel.username"
            class="input"
            type="text"
            placeholder="请输入用户名"
            @keyup.enter="login"
          />

          <input
            v-model="formModel.password"
            class="input"
            type="password"
            placeholder="请输入密码"
            @keyup.enter="login"
          />

          <button @click="login" class="button-confirm">登录</button>

          <div class="link-container">
            <a href="#" @click.prevent="isRegister = true" class="link">
              没有账号？立即注册 →
            </a>
          </div>
        </div>
      </div>
    </transition>

    <!-- 登录成功后的简笔画动画 -->
    <SketchAnimation
      :show="showAnimation"
      @animation-complete="onAnimationComplete"
    />
  </div>
</template>

<style src="./LoginPage.ak.scss" scoped></style>
