<template>
  <canvas
    ref="canvasRef"
    class="text-particle-canvas"
    @mousemove="handleMouseMove"
    @mouseleave="handleMouseLeave"
  />
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
  text: {
    type: String,
    required: true
  },
  fontSize: {
    type: Number,
    default: 48
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

// 粒子类（与图片粒子相同）
class TextParticle {
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
    const repulsionRadius = 60
    const repulsionForce = 1.2
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
    ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 生成文字粒子
const generateTextParticles = () => {
  const canvas = canvasRef.value
  if (!canvas) return

  particles.value = []
  const spacing = 3

  // 创建临时画布用于渲染文字
  const tempCanvas = document.createElement('canvas')
  const tempCtx = tempCanvas.getContext('2d')

  // 设置字体
  tempCtx.font = `${props.fontSize}px ${props.fontFamily}`
  tempCtx.fillStyle = 'white'
  tempCtx.textAlign = 'center'
  tempCtx.textBaseline = 'middle'

  // 测量文字尺寸
  const metrics = tempCtx.measureText(props.text)
  const textWidth = metrics.width
  const textHeight = props.fontSize

  // 设置临时画布尺寸
  tempCanvas.width = textWidth + 40
  tempCanvas.height = textHeight + 20

  // 重新设置字体（画布尺寸改变后字体会重置）
  tempCtx.font = `${props.fontSize}px ${props.fontFamily}`
  tempCtx.fillStyle = 'white'
  tempCtx.textAlign = 'center'
  tempCtx.textBaseline = 'middle'

  // 绘制文字到临时画布
  tempCtx.fillText(props.text, tempCanvas.width / 2, tempCanvas.height / 2)

  // 获取像素数据
  const imageData = tempCtx.getImageData(
    0,
    0,
    tempCanvas.width,
    tempCanvas.height
  )
  const data = imageData.data

  // 计算偏移，使文字居中
  const offsetX = (canvas.width - tempCanvas.width) / 2
  const offsetY = (canvas.height - tempCanvas.height) / 2

  // 遍历像素生成粒子
  for (let y = 0; y < tempCanvas.height; y += spacing) {
    for (let x = 0; x < tempCanvas.width; x += spacing) {
      const index = (y * tempCanvas.width + x) * 4
      const alpha = data[index + 3]

      if (alpha > 128) {
        // 只在非透明像素处创建粒子
        const color = 'rgba(255, 255, 255, 0.9)'

        particles.value.push(new TextParticle(x + offsetX, y + offsetY, color))
      }
    }
  }

  // 开始动画
  animate()
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

  generateTextParticles()
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

// 监听文字变化
watch(
  () => [props.text, props.fontSize, props.fontFamily],
  () => {
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    initCanvas()
  }
)
</script>

<style scoped>
.text-particle-canvas {
  width: 100%;
  height: 150px;
  cursor: crosshair;
  background-color: transparent;
  display: block;
}
</style>
