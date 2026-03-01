<script setup>
import { artGetChannelsService } from '@/api/article.js'
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: {
    type: [Number, String]
  },
  width: {
    type: String
  }
})
const emit = defineEmits(['update:modelValue'])
const channelList = ref([])

// 用于实现 v-model 的中间变量
const proxyValue = ref(props.modelValue)
watch(
  () => props.modelValue,
  (val) => (proxyValue.value = val)
)
watch(proxyValue, (val) => emit('update:modelValue', val))

const getChannelList = async () => {
  const res = await artGetChannelsService()
  channelList.value = res.data.data
}
getChannelList()
</script>

<template>
  <el-select
    v-model="proxyValue"
    :style="{ width: width || '220px', maxWidth: '320px' }"
  >
    <el-option
      v-for="channel in channelList"
      :key="channel.id"
      :label="channel.cate_name"
      :value="channel.id"
    ></el-option>
  </el-select>
</template>
