<template>
  <div v-if="show" class="sketch-animation-overlay">
    <div class="sketch-container">
      <!-- 画布容器 -->
      <div class="canvas-wrapper">
        <canvas
          ref="canvasRef"
          class="sketch-canvas"
          :width="canvasWidth"
          :height="canvasHeight"
        />
        <!-- 原始图片（隐藏，用于处理） -->
        <img
          ref="imageRef"
          src="/src/assets/晓美焰4.jpg"
          class="hidden-image"
          @load="onImageLoad"
          crossorigin="anonymous"
        />
      </div>

      <!-- 动画完成后的文字提示 -->
      <div v-if="showText" class="sketch-text">
        <h2>欢迎进入博博の客</h2>
        <p>正在进入首页...</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['animation-complete'])

const canvasRef = ref(null)
const imageRef = ref(null)
const showText = ref(false)

// 画布尺寸（全屏）
const canvasWidth = ref(window.innerWidth)
const canvasHeight = ref(window.innerHeight)

// 动画状态
let ctx = null
let imageData = null
let edgeLines = []
let drawnIndex = 0
let isAnimating = false

// 边缘检测参数
const threshold = 20 // 边缘检测阈值

// 图片加载完成
const onImageLoad = () => {
  if (!canvasRef.value || !imageRef.value) return

  const img = imageRef.value
  const canvas = canvasRef.value

  // 调整画布尺寸为全屏，保持图片比例
  const aspectRatio = img.naturalWidth / img.naturalHeight
  const screenWidth = window.innerWidth
  const screenHeight = window.innerHeight

  if (aspectRatio > screenWidth / screenHeight) {
    canvasWidth.value = screenWidth
    canvasHeight.value = screenWidth / aspectRatio
  } else {
    canvasHeight.value = screenHeight
    canvasWidth.value = screenHeight * aspectRatio
  }

  // 下一帧更新画布尺寸
  nextTick(() => {
    canvas.width = canvasWidth.value
    canvas.height = canvasHeight.value
    ctx = canvas.getContext('2d')

    // 预处理图片
    preprocessImage(img)
  })
}

// 图片预处理和边缘检测
const preprocessImage = (img) => {
  if (!ctx) return

  const { width, height } = ctx.canvas

  // 绘制图片到画布
  ctx.drawImage(img, 0, 0, width, height)
  imageData = ctx.getImageData(0, 0, width, height)

  // 清空画布准备绘制动画
  ctx.clearRect(0, 0, width, height)

  // 进行边缘检测
  detectEdges(imageData.data, width, height)
}

// 边缘检测算法
const detectEdges = (data, width, height) => {
  const visited = new Set()
  edgeLines = []

  // 使用灰度差进行边缘检测
  const getGray = (i) =>
    data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const i = (y * width + x) * 4
      const key = `${x},${y}`

      if (visited.has(key)) continue

      const g = getGray(i)
      const dx = getGray(i + 4) - g // 水平方向灰度差
      const dy = getGray(i + width * 4) - g // 垂直方向灰度差
      const mag = Math.sqrt(dx * dx + dy * dy) // 梯度强度

      if (mag > threshold) {
        // 检测到边缘，开始追踪线条
        const line = []
        traceLine(x, y, visited, line, width, height, data, threshold)

        if (line.length > 15) {
          // 只保留足够长的线条
          edgeLines.push(line)
        }
      }
    }
  }

  // 随机打乱线条顺序，增加手绘随机感
  edgeLines = edgeLines.sort(() => Math.random() - 0.5)
}

// 线条追踪与提取
const traceLine = (
  startX,
  startY,
  visited,
  line,
  width,
  height,
  data,
  threshold
) => {
  const stack = [[startX, startY]]
  const getGray = (i) =>
    data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114

  while (stack.length > 0 && line.length < 100) {
    // 限制线条长度
    const [x, y] = stack.pop()
    const key = `${x},${y}`

    if (visited.has(key)) continue
    visited.add(key)
    line.push([x, y])

    // 检查8个邻接像素
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue

        const nx = x + dx
        const ny = y + dy
        const nkey = `${nx},${ny}`

        if (nx < 1 || nx >= width - 1 || ny < 1 || ny >= height - 1) continue
        if (visited.has(nkey)) continue

        const ni = (ny * width + nx) * 4
        const ng = getGray(ni)
        const ndx = getGray(ni + 4) - ng
        const ndy = getGray(ni + width * 4) - ng
        const nmag = Math.sqrt(ndx * ndx + ndy * ndy)

        if (nmag > threshold) {
          stack.push([nx, ny])
        }
      }
    }
  }
}

// 手绘效果动画
const startSketchAnimation = () => {
  if (!ctx || !edgeLines.length) return

  ctx.strokeStyle = 'white'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  drawnIndex = 0
  isAnimating = true

  const linesPerFrame = 12 // 每帧绘制12条线

  const drawNext = () => {
    if (!isAnimating) return

    for (let i = 0; i < linesPerFrame && drawnIndex < edgeLines.length; i++) {
      const line = edgeLines[drawnIndex]

      if (line.length > 1) {
        ctx.beginPath()
        for (let j = 0; j < line.length; j++) {
          const [x, y] = line[j]
          if (j === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }

      drawnIndex++
    }

    // 继续下一帧
    if (drawnIndex < edgeLines.length) {
      setTimeout(() => {
        requestAnimationFrame(drawNext)
      }, 280) // 280ms延迟
    } else {
      // 线稿绘制完成，开始颜色渐现
      setTimeout(() => {
        startColorAnimation()
      }, 800) // 等待时间
    }
  }

  requestAnimationFrame(drawNext)
}

// 颜色渐现效果
const startColorAnimation = () => {
  if (!ctx || !imageRef.value || !imageData) return

  let opacity = 0
  const img = imageRef.value
  const { width, height } = ctx.canvas

  const fadeIn = () => {
    if (!isAnimating) return

    opacity += 0.05 // 适中的颜色渐现速度

    // 清空画布
    ctx.clearRect(0, 0, width, height)

    // 重画白色线稿
    ctx.globalAlpha = 1
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 1.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    edgeLines.forEach((line) => {
      if (line.length > 1) {
        ctx.beginPath()
        for (let j = 0; j < line.length; j++) {
          const [x, y] = line[j]
          if (j === 0) {
            ctx.moveTo(x, y)
          } else {
            ctx.lineTo(x, y)
          }
        }
        ctx.stroke()
      }
    })

    // 叠加原图，透明度逐渐增加
    ctx.globalAlpha = opacity
    ctx.drawImage(img, 0, 0, width, height)

    if (opacity >= 1) {
      // 动画完成
      setTimeout(() => {
        showText.value = true
        setTimeout(() => {
          emit('animation-complete')
        }, 1800) // 文字显示时间
      }, 800) // 等待时间
    } else {
      requestAnimationFrame(fadeIn)
    }
  }

  requestAnimationFrame(fadeIn)
}

// 开始动画
const startAnimation = async () => {
  if (!imageRef.value?.complete) {
    // 如果图片还没加载完成，等待
    await new Promise((resolve) => {
      imageRef.value.onload = resolve
    })
  }

  // 等待DOM更新
  await nextTick()

  if (edgeLines.length === 0) {
    // 如果还没有边缘数据，重新处理
    preprocessImage(imageRef.value)
    // 等待边缘检测完成
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  startSketchAnimation()
}

// 重置动画状态
const resetAnimation = () => {
  showText.value = false
  isAnimating = false
  drawnIndex = 0
  edgeLines = []

  if (ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  }
}

// 监听显示状态变化
watch(
  () => props.show,
  (newVal) => {
    if (newVal) {
      resetAnimation()
      nextTick(() => {
        startAnimation()
      })
    } else {
      isAnimating = false
    }
  }
)

defineExpose({
  startAnimation,
  resetAnimation
})
</script>

<style scoped>
.sketch-animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(5px);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 9999;
  animation: fadeIn 0.3s ease-in-out;
}

.sketch-container {
  text-align: center;
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 30px;
}

.canvas-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

.sketch-canvas {
  display: block;
  max-width: 100vw;
  max-height: 100vh;
  object-fit: contain;
}

.hidden-image {
  display: none;
}

.sketch-text {
  position: absolute;
  top: 80px;
  left: 50%;
  animation: textFadeIn 0.8s ease-in-out;
  animation-fill-mode: forwards;
  color: white;
  z-index: 10;
}

.sketch-text h2 {
  font-family: 'Zhi Mang Xing';
  font-size: 36px;
  color: white;
  margin-bottom: 15px;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.8),
    0 0 40px rgba(255, 255, 255, 0.8);
  font-weight: normal;
  letter-spacing: 3px;
  transform: rotate(-2deg);
  font-style: italic;
}

.sketch-text p {
  font-family: 'Zhi Mang Xing';
  font-size: 20px;
  color: rgba(255, 255, 255, 0.95);
  margin: 0;
  font-weight: normal;
  letter-spacing: 2px;
  transform: rotate(1deg);
  font-style: italic;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes textFadeIn {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

@media (max-width: 600px) {
  .sketch-text {
    top: 60px;
  }

  .sketch-text h2 {
    font-size: 30px;
    letter-spacing: 2px;
    transform: rotate(-1deg);
  }

  .sketch-text p {
    font-size: 18px;
    letter-spacing: 1px;
    transform: rotate(0.5deg);
  }
}
</style>
