<template>
  <div class="home-page">
    <div class="particle-container">
      <!-- 图片粒子效果 -->
      <div class="image-particle-section">
        <ImageParticleEffect :imageSrc="imageSrc" />
      </div>

      <!-- 文字粒子效果 -->
      <div class="text-particle-section">
        <TextParticleEffect
          text="欢迎来到博博の客"
          :fontSize="40"
          fontFamily="ZCOOL XiaoWei"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import ImageParticleEffect from '@/components/ImageParticleEffect.vue'
import TextParticleEffect from '@/components/TextParticleEffect.vue'
import imageSrc from '@/assets/小圆黑logo.png'
</script>

<style scoped>
.home-page {
  width: 100%;
  height: 80vh;
  background: linear-gradient(135deg, #808080 0%, #000000 100%);
  padding: 0;
  margin: 0;
  overflow: hidden;
  border-radius: 25px;
}

.particle-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.image-particle-section {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.text-particle-section {
  width: 100%;
  margin-bottom: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .text-particle-section {
    margin-bottom: 30px;
  }
}
</style>
