<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import ChannelSelect from './ChannelSelect.vue'
import { Plus } from '@element-plus/icons-vue'
import EditorJS from '@editorjs/editorjs'
import Header from '@editorjs/header'
import Paragraph from '@editorjs/paragraph'
import Image from '@editorjs/image'
import Code from '@editorjs/code'
import Quote from '@editorjs/quote'
import Marker from '@editorjs/marker'
import InlineCode from '@editorjs/inline-code'
import Delimiter from '@editorjs/delimiter'
import Table from '@editorjs/table'
import Embed from '@editorjs/embed'
import Checklist from '@editorjs/checklist'
import Warning from '@editorjs/warning'
import SimpleImage from '@editorjs/simple-image'
import {
  artPublishService,
  artGetDetailService,
  artEditService,
  artUploadImageService
} from '@/api/article'
import { baseURL } from '@/utils/request'
import axios from 'axios'

// 控制抽屉显示隐藏
const visibleDrawer = ref(false)

// 表单引用
const formRef = ref()

// 提交状态
const submitLoading = ref(false)

// 默认数据
const defaultForm = {
  title: '', // 标题
  cate_id: '', // 分类id
  cover_img: '', // 封面图片 file 对象
  content: '', // string 内容
  state: '' // 状态
}

// 准备数据
const formModel = ref({ ...defaultForm })

// Editor.js 实例
let editorInstance = null

// Editor.js 配置
const editorConfig = {
  holder: 'editorjs-container',
  placeholder: '请输入文章内容...',
  minHeight: 300,
  tools: {
    header: {
      class: Header,
      config: {
        placeholder: '请输入标题...',
        levels: [1, 2, 3, 4, 5, 6],
        defaultLevel: 2
      }
    },
    paragraph: {
      class: Paragraph,
      config: {
        placeholder: '请输入段落内容...'
      }
    },
    checklist: {
      class: Checklist,
      inlineToolbar: true,
      config: {
        placeholder: '请输入待办事项...'
      }
    },
    quote: {
      class: Quote,
      inlineToolbar: true,
      config: {
        quotePlaceholder: '请输入引用内容...',
        captionPlaceholder: '引用来源'
      }
    },
    warning: {
      class: Warning,
      inlineToolbar: true,
      config: {
        titlePlaceholder: '警告标题',
        messagePlaceholder: '请输入警告内容...'
      }
    },
    code: {
      class: Code,
      config: {
        placeholder: '请输入代码...'
      }
    },
    table: {
      class: Table,
      inlineToolbar: true,
      config: {
        rows: 2,
        cols: 3,
        withHeadings: true
      }
    },
    image: {
      class: Image,
      config: {
        uploader: {
          uploadByFile: async (file) => {
            // 验证文件
            const allowedTypes = [
              'image/jpeg',
              'image/jpg',
              'image/png',
              'image/gif',
              'image/webp'
            ]
            if (!allowedTypes.includes(file.type)) {
              throw new Error('只支持 JPG、PNG、GIF、WEBP 格式的图片')
            }

            if (file.size > 5 * 1024 * 1024) {
              throw new Error('图片大小不能超过 5MB')
            }

            try {
              // 使用真正的后端 API 上传图片
              const response = await artUploadImageService(file)
              return {
                success: 1,
                file: {
                  url: baseURL + response.data.data.url
                }
              }
            } catch (error) {
              console.error('图片上传失败:', error)
              throw new Error('图片上传失败，请重试')
            }
          }
        }
      }
    },
    simpleImage: {
      class: SimpleImage,
      config: {
        placeholder: '请输入图片URL...'
      }
    },
    embed: {
      class: Embed,
      config: {
        services: {
          youtube: true,
          bilibili: {
            regex: /https?:\/\/www\.bilibili\.com\/video\/([a-zA-Z0-9]+)/,
            embedUrl:
              'https://player.bilibili.com/player.html?bvid=<%= remote_id %>',
            html: '<iframe style="width:100%; height:320px;" frameborder="0" allowfullscreen></iframe>',
            height: 320,
            width: 580
          },
          coub: true,
          codepen: {
            regex: /https?:\/\/codepen\.io\/([^/?&]*)\/pen\/([^/?&]*)/,
            embedUrl:
              'https://codepen.io/<%= remote_id %>?height=300&theme-id=0&default-tab=css,result&embed-version=2',
            html: "<iframe height='300' scrolling='no' frameborder='no' allowtransparency='true' allowfullscreen='true' style='width: 100%;'></iframe>",
            height: 300,
            width: 600,
            id: (groups) => groups.join('/embed/')
          }
        }
      }
    },
    marker: {
      class: Marker
    },
    inlineCode: {
      class: InlineCode
    },
    delimiter: {
      class: Delimiter
    }
  },
  data: {
    blocks: []
  },
  onChange: async () => {
    try {
      // 当编辑器内容改变时只触发字数统计，不触发表单验证
      await updateContentLength()
      // 移除表单验证，避免在输入过程中频繁触发验证错误
    } catch (error) {
      console.error('Editor onChange error:', error)
    }
  }
}

// 初始化编辑器
const initEditor = async () => {
  if (editorInstance) {
    await editorInstance.destroy()
  }

  editorInstance = new EditorJS(editorConfig)
  await editorInstance.isReady
}

// 获取编辑器内容
const getEditorContent = async () => {
  if (!editorInstance) return ''

  try {
    const outputData = await editorInstance.save()
    return JSON.stringify(outputData)
  } catch (error) {
    console.error('获取编辑器内容失败:', error)
    return ''
  }
}

// 设置编辑器内容
const setEditorContent = async (content) => {
  if (!editorInstance) return

  try {
    let data = { blocks: [] }
    if (content) {
      // 如果是 ，转换为简单的段落
      if (content.startsWith('<')) {
        const textContent = content.replace(/<[^>]*>/g, '').trim()
        if (textContent) {
          data = {
            blocks: [
              {
                type: 'paragraph',
                data: {
                  text: textContent
                }
              }
            ]
          }
        }
      } else {
        // JSON 格式的 Editor.js 数据
        data = JSON.parse(content)
      }
    }

    await editorInstance.render(data)
  } catch (error) {
    console.error('设置编辑器内容失败:', error)
  }
}

// 表单验证规则
const rules = {
  title: [
    { required: true, message: '请输入文章标题', trigger: 'blur' },
    { min: 1, max: 100, message: '标题长度在 1 到 100 个字符', trigger: 'blur' }
  ],
  cate_id: [{ required: true, message: '请选择文章分类', trigger: 'change' }],
  cover_img: [{ required: true, message: '请上传文章封面', trigger: 'change' }],
  content: [
    { required: true, message: '请输入文章内容', trigger: 'blur' },
    { min: 10, message: '文章内容至少需要10个字符', trigger: 'blur' }
  ]
}

// 自定义验证器：验证图片文件
const validateCoverImg = (rule, value, callback) => {
  if (!value) {
    callback(new Error('请上传文章封面图片'))
  } else if (value instanceof File) {
    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

    // 对于从服务器转换过来的文件，可能没有正确的 MIME 类型
    // 我们通过文件名后缀来判断
    const fileName = value.name || ''
    const fileExtension = fileName.split('.').pop()?.toLowerCase()
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'webp']

    const hasValidType = allowedTypes.includes(value.type)
    const hasValidExtension = allowedExtensions.includes(fileExtension)

    if (!hasValidType && !hasValidExtension) {
      callback(new Error('只支持 JPG、PNG、WEBP 格式的图片'))
    } else if (value.size > 5 * 1024 * 1024) {
      // 5MB
      callback(new Error('图片大小不能超过 5MB'))
    } else {
      callback()
    }
  } else if (typeof value === 'string' && value.trim() !== '') {
    // 如果是字符串（图片URL），也认为是有效的
    callback()
  } else {
    callback()
  }
}

// 自定义验证器：验证文章内容
const validateContent = async (rule, value, callback) => {
  try {
    if (!editorInstance) {
      callback(new Error('请输入文章内容'))
      return
    }

    const content = await getEditorContent()
    if (!content) {
      callback(new Error('请输入文章内容'))
      return
    }

    const data = JSON.parse(content)
    if (!data.blocks || data.blocks.length === 0) {
      callback(new Error('请输入文章内容'))
      return
    }

    // 使用当前的字数统计值
    const currentLength = contentLength.value

    if (currentLength < 10) {
      callback(new Error('文章内容至少需要10个字符'))
    } else if (currentLength > 50000) {
      callback(new Error('文章内容不能超过50000个字符'))
    } else {
      callback()
    }
  } catch (error) {
    console.error('内容验证错误:', error)
    callback(new Error('请输入文章内容'))
  }
}

// 更新验证规则，使用自定义验证器
rules.cover_img = [{ validator: validateCoverImg, trigger: 'change' }]
rules.content = [{ validator: validateContent, trigger: 'blur' }]

// 字数统计
const contentLength = ref(0)

// 辅助函数：移除HTML标签并计算文本长度
const getTextLength = (text) => {
  if (!text) return 0

  // 移除HTML标签
  let cleanText = text.replace(/<[^>]*>/g, '')

  // 将HTML实体和特殊字符转换为普通字符
  cleanText = cleanText
    .replace(/&nbsp;/g, ' ') // HTML非换行空格
    .replace(/\u00A0/g, ' ') // Unicode非换行空格
    .replace(/\u2009/g, ' ') // 细空格
    .replace(/\u200A/g, ' ') // 毛细空格
    .replace(/\u2002/g, ' ') // en空格
    .replace(/\u2003/g, ' ') // em空格
    .replace(/\u2007/g, ' ') // 数字空格
    .replace(/\u2008/g, ' ') // 标点空格
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&hellip;/g, '…')

  // 将多个连续的空白字符标准化为单个空格
  cleanText = cleanText.replace(/\s+/g, ' ')

  // 不要使用trim()，保留空格计数

  return cleanText.length
}

// 更新字数统计
const updateContentLength = async () => {
  try {
    const content = await getEditorContent()
    if (!content) {
      contentLength.value = 0
      return
    }

    const data = JSON.parse(content)
    let textLength = 0
    if (data.blocks) {
      data.blocks.forEach((block) => {
        switch (block.type) {
          case 'paragraph':
          case 'header': {
            if (block.data && block.data.text) {
              textLength += getTextLength(block.data.text)
            }
            break
          }
          case 'list': {
            if (block.data && block.data.items) {
              block.data.items.forEach((item) => {
                if (typeof item === 'object' && item.content) {
                  textLength += getTextLength(item.content)
                } else if (typeof item === 'string') {
                  textLength += getTextLength(item)
                }
              })
            }
            break
          }
          case 'checklist': {
            if (block.data && block.data.items) {
              block.data.items.forEach((item) => {
                if (item.text) {
                  textLength += getTextLength(item.text)
                }
              })
            }
            break
          }
          case 'quote': {
            if (block.data) {
              if (block.data.text) {
                textLength += getTextLength(block.data.text)
              }
              if (block.data.caption) {
                textLength += getTextLength(block.data.caption)
              }
            }
            break
          }
          case 'warning': {
            if (block.data) {
              if (block.data.title) {
                textLength += getTextLength(block.data.title)
              }
              if (block.data.message) {
                textLength += getTextLength(block.data.message)
              }
            }
            break
          }
          case 'code': {
            if (block.data && block.data.code) {
              textLength += block.data.code.trim().length
            }
            break
          }
          case 'table': {
            if (block.data && block.data.content) {
              block.data.content.forEach((row) => {
                if (Array.isArray(row)) {
                  row.forEach((cell) => {
                    if (cell) {
                      textLength += getTextLength(cell)
                    }
                  })
                }
              })
            }
            break
          }
          case 'embed': {
            if (block.data && block.data.caption) {
              textLength += getTextLength(block.data.caption)
            }
            break
          }
          // 对于图片、分割线等不包含文本的块类型，不计入字数
          case 'image':
          case 'simpleImage': {
            if (block.data && block.data.caption) {
              textLength += getTextLength(block.data.caption)
            }
            break
          }
          case 'delimiter':
            // 分割线不计入字数
            break
          default: {
            // 对于未知的块类型，尝试提取可能的文本内容
            if (block.data) {
              const blockText = JSON.stringify(block.data)
                .replace(/<[^>]*>/g, '')
                .replace(/[{}",]/g, ' ')
              textLength += blockText.trim().length
            }
            break
          }
        }
      })
    }
    contentLength.value = textLength
  } catch (error) {
    contentLength.value = 0
  }
}

// 图片上传相关逻辑
const imgUrl = ref('')
const onSelectFile = (uploadFile) => {
  const file = uploadFile.raw

  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('只支持 JPG、PNG、WEBP 格式的图片')
    return
  }

  // 验证文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  imgUrl.value = URL.createObjectURL(file) // 预览图片
  formModel.value.cover_img = file // 将图片对象存入表单

  // 触发表单验证
  nextTick(() => {
    formRef.value?.validateField('cover_img')
  })
}

// 提交
const emit = defineEmits(['success'])
const onPublish = async (state) => {
  // 先获取编辑器内容并设置到表单中
  try {
    const content = await getEditorContent()
    formModel.value.content = content
  } catch (error) {
    console.error('获取编辑器内容失败:', error)
    ElMessage.error('获取文章内容失败')
    return
  }

  // 进行表单验证
  // 对于编辑模式，如果是从服务器转换的文件对象，跳过某些验证
  try {
    // 先清除之前的验证错误
    formRef.value?.clearValidate()

    // 手动验证各个字段
    if (!formModel.value.title || formModel.value.title.trim() === '') {
      ElMessage.error('请输入文章标题')
      return
    }

    if (!formModel.value.cate_id) {
      ElMessage.error('请选择文章分类')
      return
    }

    if (!formModel.value.cover_img) {
      ElMessage.error('请上传文章封面')
      return
    }

    // 验证内容
    const data = JSON.parse(formModel.value.content || '{}')
    if (!data.blocks || data.blocks.length === 0) {
      ElMessage.error('请输入文章内容')
      return
    }

    if (contentLength.value < 10) {
      ElMessage.error('文章内容至少需要10个字符')
      return
    }

    if (contentLength.value > 50000) {
      ElMessage.error('文章内容不能超过50000个字符')
      return
    }
  } catch (error) {
    ElMessage.error('请完善表单信息')
    return
  }

  submitLoading.value = true

  try {
    // 将已发布还是草稿状态，存入 formModel
    formModel.value.state = state

    // 确保 cate_id 是数字类型
    if (formModel.value.cate_id !== '') {
      formModel.value.cate_id = Number(formModel.value.cate_id)
    }

    // 将普通对象 => 转换成 => formData对象
    const fd = new FormData()

    // 只添加后端需要的字段，避免发送不允许的字段
    const allowedFields = ['title', 'cate_id', 'cover_img', 'content', 'state']
    if (formModel.value.id) {
      allowedFields.push('id') // 编辑时需要 id
    }

    for (let key of allowedFields) {
      if (formModel.value[key] !== undefined && formModel.value[key] !== '') {
        fd.append(key, formModel.value[key])
      }
    }

    // 发请求
    if (formModel.value.id) {
      // 编辑操作
      await artEditService(fd)
      ElMessage.success('修改成功')
      // 提交成功后更新原始数据，避免关闭时提示未保存
      originalData.value = {
        title: formModel.value.title,
        cate_id: formModel.value.cate_id,
        content: formModel.value.content,
        cover_img: formModel.value.cover_img
      }
      visibleDrawer.value = false
      emit('success', 'edit')
    } else {
      // 添加操作
      await artPublishService(fd)
      ElMessage.success('添加成功')
      visibleDrawer.value = false
      // 通知到父组件，添加成功了
      emit('success', 'add')
    }
  } catch (error) {
    console.error('提交失败:', error)
    ElMessage.error('操作失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// 组件对外暴露一个方法 open，基于open传来的参数，区分添加还是编辑
// open({})  => 表单无需渲染，说明是添加
// open({ id, ..., ... })  => 表单需要渲染，说明是编辑
// open调用后，可以打开抽屉

// 重置表单
const resetForm = async () => {
  formModel.value = { ...defaultForm }
  imgUrl.value = ''
  contentLength.value = 0

  // 重置编辑器
  if (editorInstance) {
    await setEditorContent('')
  }

  nextTick(() => {
    formRef.value?.clearValidate()
  })
}

// 保存初始数据用于比较
const originalData = ref({})

// 检查表单是否有未保存的更改
const hasUnsavedChanges = () => {
  // 如果是新建文章，只要有任何内容就算有更改
  if (!formModel.value.id) {
    return (
      formModel.value.title.trim() !== '' ||
      formModel.value.cate_id !== '' ||
      formModel.value.cover_img !== '' ||
      (formModel.value.content &&
        formModel.value.content.trim() !== '' &&
        formModel.value.content !== '<p><br></p>')
    )
  }

  // 如果是编辑文章，比较当前值与原始值
  return (
    formModel.value.title !== originalData.value.title ||
    formModel.value.cate_id !== originalData.value.cate_id ||
    formModel.value.content !== originalData.value.content ||
    // 对于图片，如果是新上传的File对象，说明有更改
    (formModel.value.cover_img instanceof File &&
      formModel.value.cover_img !== originalData.value.cover_img)
  )
}

// 关闭抽屉前确认
const handleClose = async () => {
  if (hasUnsavedChanges()) {
    try {
      await ElMessageBox.confirm('当前有未保存的更改，确定要关闭吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      visibleDrawer.value = false
      resetForm()
    } catch {
      // 用户取消关闭
    }
  } else {
    visibleDrawer.value = false
    resetForm()
  }
}

const open = async (row) => {
  visibleDrawer.value = true // 显示抽屉

  // 等待编辑器初始化
  await nextTick()
  await initEditor()

  if (row.id) {
    // 需要基于 row.id 发送请求，获取编辑对应的详情数据，进行回显
    const res = await artGetDetailService(row.id)
    formModel.value = res.data.data

    // 保存原始数据用于比较
    originalData.value = {
      title: formModel.value.title || '',
      cate_id: formModel.value.cate_id || '',
      content: formModel.value.content || '',
      cover_img: formModel.value.cover_img || ''
    }

    // 设置编辑器内容
    if (formModel.value.content) {
      await setEditorContent(formModel.value.content)
      await updateContentLength()
    }

    // 图片需要单独处理回显
    if (formModel.value.cover_img) {
      imgUrl.value = baseURL + formModel.value.cover_img
      // 注意：提交给后台，需要的数据格式，是file对象格式
      // 需要将网络图片地址 => 转换成 file对象，存储起来, 将来便于提交
      const file = await imageUrlToFileObject(
        imgUrl.value,
        formModel.value.cover_img
      )
      if (file) {
        formModel.value.cover_img = file
        // 更新原始数据中的cover_img为转换后的file对象
        originalData.value.cover_img = file
      }
    }
  } else {
    // 新建文章时清空原始数据
    originalData.value = {}
    await resetForm()
  }

  // 清除表单验证错误状态
  await nextTick()
  formRef.value?.clearValidate()
}

// 将网络图片地址转换为 File 对象的函数
async function imageUrlToFileObject(imageUrl, filename) {
  try {
    // 使用 Axios 下载图片数据
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' })

    // 从响应头或文件名推断 MIME 类型
    let mimeType = response.headers['content-type']

    // 如果响应头没有正确的 MIME 类型，根据文件扩展名推断
    if (!mimeType || !mimeType.startsWith('image/')) {
      const extension = filename.split('.').pop()?.toLowerCase()
      switch (extension) {
        case 'jpg':
        case 'jpeg':
          mimeType = 'image/jpeg'
          break
        case 'png':
          mimeType = 'image/png'
          break
        case 'webp':
          mimeType = 'image/webp'
          break
        case 'gif':
          mimeType = 'image/gif'
          break
        default:
          mimeType = 'image/jpeg' // 默认为 jpeg
      }
    }

    // 将下载的数据转换成 Blob 对象
    const blob = new Blob([response.data], { type: mimeType })

    // 创建 File 对象，确保有正确的 MIME 类型
    const file = new File([blob], filename, { type: mimeType })

    return file
  } catch (error) {
    console.error('Error converting image URL to File object:', error)
    return null
  }
}

// 销毁编辑器
onBeforeUnmount(async () => {
  if (editorInstance) {
    try {
      await editorInstance.destroy()
      editorInstance = null
    } catch (error) {
      console.error('销毁编辑器失败:', error)
    }
  }
})

defineExpose({
  open
})
</script>

<template>
  <el-drawer
    v-model="visibleDrawer"
    :title="formModel.id ? '编辑文章' : '添加文章'"
    direction="rtl"
    size="50%"
    :close-on-click-modal="false"
    :before-close="handleClose"
  >
    <!-- 发表文章表单 -->
    <el-form
      :model="formModel"
      :rules="rules"
      ref="formRef"
      label-width="100px"
      @submit.prevent
    >
      <el-form-item label="文章标题" prop="title">
        <el-input
          v-model="formModel.title"
          placeholder="请输入标题"
          maxlength="100"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="文章分类" prop="cate_id">
        <channel-select
          v-model="formModel.cate_id"
          width="100%"
          placeholder="请选择文章分类"
        />
      </el-form-item>

      <el-form-item label="文章封面" prop="cover_img">
        <div class="upload-container">
          <el-upload
            class="avatar-uploader"
            :show-file-list="false"
            :auto-upload="false"
            :on-change="onSelectFile"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            drag
          >
            <img v-if="imgUrl" :src="imgUrl" class="avatar" />
            <div v-else class="upload-placeholder">
              <el-icon class="avatar-uploader-icon"><Plus /></el-icon>
              <div class="upload-text">
                <p>点击或拖拽图片到此处上传</p>
                <p class="upload-tip">
                  支持 JPG、PNG、WEBP 格式，大小不超过 5MB
                </p>
              </div>
            </div>
          </el-upload>
        </div>
      </el-form-item>

      <el-form-item label="文章内容" prop="content">
        <div class="editor-container">
          <div class="editor-header">
            <span class="word-count">字数: {{ contentLength }}</span>
          </div>
          <div class="editor">
            <!-- Editor.js 容器 -->
            <div id="editorjs-container" class="editorjs-container"></div>
          </div>
        </div>
      </el-form-item>

      <el-form-item>
        <div class="submit-buttons">
          <el-button
            @click="onPublish('已发布')"
            type="primary"
            :loading="submitLoading"
            :disabled="submitLoading"
          >
            {{ submitLoading ? '发布中...' : '发布' }}
          </el-button>
          <el-button
            @click="onPublish('草稿')"
            type="info"
            :loading="submitLoading"
            :disabled="submitLoading"
          >
            {{ submitLoading ? '保存中...' : '保存草稿' }}
          </el-button>
        </div>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<style lang="scss" scoped>
.upload-container {
  width: 100%;

  .avatar-uploader {
    :deep(.el-upload) {
      border: 2px dashed var(--el-border-color);
      border-radius: 5px;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transition: var(--el-transition-duration-fast);
      width: 100%;
      height: 200px;
      display: flex;
      align-items: center;
      justify-content: center;

      &:hover {
        border-color: var(--el-color-primary);
      }

      &.is-dragover {
        border-color: var(--el-color-primary);
        background-color: var(--el-color-primary-light-9);
      }
    }

    .avatar {
      width: 100%;
      height: 200px;
      display: block;
      object-fit: cover;
      border-radius: 6px;
    }

    .upload-placeholder {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      color: var(--el-text-color-secondary);

      .avatar-uploader-icon {
        font-size: 32px;
        margin-bottom: 12px;
      }

      .upload-text {
        text-align: center;

        p {
          margin: 4px 0;
        }

        .upload-tip {
          font-size: 12px;
          color: var(--el-text-color-placeholder);
        }
      }
    }
  }
}

.editor-container {
  width: 100%;

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;

    .word-count {
      font-size: 12px;
      color: var(--el-text-color-secondary);
    }
  }

  .editor {
    width: 100%;

    .editorjs-container {
      border: 1px solid var(--el-border-color);
      border-radius: 6px;
      min-height: 300px;
      padding: 16px;
      background: white;

      :deep(.ce-block__content) {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }

      :deep(.ce-toolbar__content) {
        max-width: none !important;
      }

      :deep(.ce-paragraph) {
        line-height: 1.6;
        font-size: 14px;
      }

      :deep(.ce-header) {
        font-weight: 600;
        margin: 16px 0 8px 0;
      }

      :deep(.ce-code__textarea) {
        background-color: #f6f8fa;
        border: 1px solid #e1e4e8;
        border-radius: 6px;
        padding: 12px;
        font-family: 'SFMono-Regular', 'Consolas', 'Liberation Mono', monospace;
        font-size: 13px;
        line-height: 1.45;
      }

      :deep(.ce-quote) {
        border-left: 4px solid #dfe2e5;
        padding-left: 16px;
        margin-left: 0;
        color: #6a737d;
        background-color: #f6f8fa;
        padding: 8px 16px;
        border-radius: 0 4px 4px 0;
      }

      :deep(.ce-list) {
        margin: 12px 0;
      }

      :deep(.ce-delimiter) {
        margin: 20px 0;
        text-align: center;
        border-bottom: 1px solid #eaecef;
        position: relative;

        &::before {
          content: '* * *';
          position: absolute;
          left: 50%;
          top: -8px;
          transform: translateX(-50%);
          background: white;
          padding: 0 16px;
          color: #666;
        }
      }

      :deep(.ce-toolbar__plus) {
        color: var(--el-color-primary);
      }

      :deep(.ce-toolbar__settings-btn) {
        color: var(--el-color-primary);
      }

      :deep(.ce-inline-toolbar) {
        background: var(--el-color-primary);
        border-radius: 4px;
      }

      // 新增块类型样式
      :deep(.ce-table) {
        border-collapse: collapse;
        margin: 16px 0;

        td,
        th {
          border: 1px solid #e1e4e8;
          padding: 8px 12px;
          min-width: 40px;
        }

        th {
          background: #f6f8fa;
          font-weight: 600;
        }
      }

      :deep(.cdx-checklist) {
        .cdx-checklist__item {
          display: flex;
          align-items: flex-start;
          margin: 6px 0;

          .cdx-checklist__item-checkbox {
            margin-right: 8px;
            margin-top: 2px;
          }

          .cdx-checklist__item-text {
            flex: 1;
            line-height: 1.5;
          }
        }
      }

      :deep(.cdx-warning) {
        background: #fff3cd;
        border: 1px solid #ffeaa7;
        border-radius: 6px;
        padding: 12px 16px;
        margin: 16px 0;

        .cdx-warning__title {
          font-weight: 600;
          color: #856404;
          margin-bottom: 6px;
        }

        .cdx-warning__message {
          color: #856404;
          line-height: 1.5;
        }
      }

      :deep(.ce-embed) {
        text-align: center;
        margin: 16px 0;

        iframe {
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
      }

      :deep(.ce-raw-tool) {
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 6px;
        padding: 12px;
        font-family: monospace;
        font-size: 13px;
      }
    }
  }
}

.submit-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  width: 100%;
  margin-top: 20px;
}

// 表单样式优化
:deep(.el-form-item__label) {
  font-weight: 500;
  color: var(--el-text-color-primary);
}

:deep(.el-form-item__error) {
  font-size: 12px;
}

// 抽屉样式优化
:deep(.el-drawer__header) {
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  .el-drawer__title {
    font-size: 18px;
    font-weight: 600;
  }
}

:deep(.el-drawer__body) {
  padding: 20px;
}
</style>
