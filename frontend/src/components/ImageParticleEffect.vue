<template>
  <canvas
    ref="canvasRef"
    class="particle-canvas"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  imageSrc: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  fontSize: {
    type: Number,
    default: 40
  },
  fontFamily: {
    type: String,
    default: 'ZCOOL XiaoWei, Microsoft YaHei, serif'
  }
})

const canvasRef = ref(null)
const particles = ref([])
const mouse = ref({ x: -1000, y: -1000 })
let animationId = null

// 粒子类
class ImageParticle {
  constructor(x, y, color) {
    this.originalX = x
    this.originalY = y
    this.x = x
    this.y = y
    this.vx = 0
    this.vy = 0
    this.color = color
  }

  update(mouseX, mouseY) {
    const dx = this.x - mouseX
    const dy = this.y - mouseY
    const distance = Math.sqrt(dx * dx + dy * dy)
    const repulsionRadius = 60 // 减小作用范围
    const repulsionForce = 1 // 减小斥力强度
    const friction = 0.08
    const returnSpeed = 0.01

    // 鼠标排斥
    if (distance < repulsionRadius) {
      const angle = Math.atan2(dy, dx)
      const ratio = (repulsionRadius - distance) / repulsionRadius
      const force = ratio * ratio * repulsionForce

      this.vx += Math.cos(angle) * force
      this.vy += Math.sin(angle) * force
    }

    // 回弹
    this.vx += (this.originalX - this.x) * returnSpeed
    this.vy += (this.originalY - this.y) * returnSpeed

    // 摩擦
    this.vx *= 1 - friction
    this.vy *= 1 - friction

    this.x += this.vx
    this.y += this.vy
  }

  draw(ctx) {
    ctx.fillStyle = this.color
    ctx.beginPath()
    ctx.arc(this.x, this.y, 2, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 生成粒子
const generateParticles = () => {
  const canvas = canvasRef.value

  particles.value = []
  const spacing = 4

  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.onload = () => {
    // 创建临时画布
    const tempCanvas = document.createElement('canvas')
    const tempCtx = tempCanvas.getContext('2d')

    // 计算缩放
    const scale =
      Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8
    tempCanvas.width = img.width * scale
    tempCanvas.height = img.height * scale

    // 绘制图片
    tempCtx.drawImage(img, 0, 0, tempCanvas.width, tempCanvas.height)

    // 获取像素数据
    const imageData = tempCtx.getImageData(
      0,
      0,
      tempCanvas.width,
      tempCanvas.height
    )
    const data = imageData.data

    // 计算偏移，使图片居中
    const offsetX = (canvas.width - tempCanvas.width) / 2
    const offsetY = (canvas.height - tempCanvas.height) / 2

    // 遍历像素生成粒子
    for (let y = 0; y < tempCanvas.height; y += spacing) {
      for (let x = 0; x < tempCanvas.width; x += spacing) {
        const index = (y * tempCanvas.width + x) * 4
        const alpha = data[index + 3]

        if (alpha > 128) {
          // 只在非透明像素处创建粒子
          const r = data[index]
          const g = data[index + 1]
          const b = data[index + 2]

          // 保持原色
          const color = `rgba(${r}, ${g}, ${b}, ${alpha / 255})`

          particles.value.push(
            new ImageParticle(x + offsetX, y + offsetY, color)
          )
        }
      }
    }

    // 开始动画
    animate()
  }
  img.src = props.imageSrc
}

// 动画循环
const animate = () => {
  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')

  ctx.clearRect(0, 0, canvas.width, canvas.height)

  particles.value.forEach((particle) => {
    particle.update(mouse.value.x, mouse.value.y)
    particle.draw(ctx)
  })

  animationId = requestAnimationFrame(animate)
}

// 鼠标移动处理
const handleMouseMove = (e) => {
  const canvas = canvasRef.value
  const rect = canvas.getBoundingClientRect()
  mouse.value = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  }
}

const handleMouseLeave = () => {
  mouse.value = { x: -1000, y: -1000 }
}

// 初始化画布
const initCanvas = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  // 设置画布尺寸
  canvas.width = canvas.offsetWidth
  canvas.height = canvas.offsetHeight

  generateParticles()
}

// 窗口大小变化处理
const handleResize = () => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  setTimeout(() => {
    initCanvas()
  }, 100)
}

onMounted(() => {
  initCanvas()
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  window.removeEventListener('resize', handleResize)
})

// 监听图片源变化
watch(
  () => props.imageSrc,
  () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    initCanvas()
  }
)
</script>

<style scoped>
.particle-canvas {
  width: 80%;
  height: 380px;
  cursor: crosshair;
  background-color: #d7d5d5;
  border-radius: 10px;
}
</style>
