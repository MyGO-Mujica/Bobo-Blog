<script setup>
import { ref, nextTick, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
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
import Checklist from '@editorjs/checklist'
import Warning from '@editorjs/warning'
import { createPost } from '@/api/square'
import { artUploadImageService } from '@/api/article'
import { baseURL } from '@/utils/request'

// 控制抽屉显示隐藏
const visibleDrawer = ref(false)

// 表单引用
const formRef = ref()

// 提交状态
const submitLoading = ref(false)

// 默认数据
const defaultForm = {
  title: '', // 标题
  cover_img: '', // 封面图片
  content: '' // 内容
}

// 准备数据
const formModel = ref({ ...defaultForm })

// Editor.js 实例
let editorInstance = null

// 字数统计
const contentLength = ref(0)

// 封面图片预览URL
const imgUrl = ref('')

// 验证规则
const rules = {
  title: [
    { required: true, message: '请输入帖子标题', trigger: 'blur' },
    { min: 1, max: 50, message: '标题长度在 1 到 50 个字符', trigger: 'blur' }
  ],
  cover_img: [{ required: true, message: '请上传帖子封面', trigger: 'change' }],
  content: [{ validator: validateContent, trigger: 'blur' }]
}

// Editor.js 配置
const editorConfig = {
  holder: 'editorjs-container',
  placeholder: '请输入帖子内容...',
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
              // 使用后端 API 上传图片
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
    // 当编辑器内容改变时触发表单验证和字数统计
    await updateContentLength()
    nextTick(() => {
      formRef.value?.validateField('content')
    })
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

// 自定义验证器：验证帖子内容
async function validateContent(rule, value, callback) {
  try {
    const content = await getEditorContent()
    if (!content) {
      callback(new Error('请输入帖子内容'))
      return
    }

    const data = JSON.parse(content)
    if (!data.blocks || data.blocks.length === 0) {
      callback(new Error('请输入帖子内容'))
      return
    }

    // 直接使用当前的字数统计值
    const currentLength = contentLength.value

    if (currentLength < 10) {
      callback(new Error('帖子内容至少需要10个字符'))
    } else if (currentLength > 10000) {
      callback(new Error('帖子内容不能超过10000个字符'))
    } else {
      callback()
    }
  } catch (error) {
    callback(new Error('请输入帖子内容'))
  }
}

// 封面上传相关函数
const onSelectFile = (uploadFile) => {
  // 验证文件类型
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(uploadFile.raw.type)) {
    ElMessage.error('只支持 JPG、PNG、WEBP 格式的图片')
    return
  }

  // 验证文件大小 (5MB)
  if (uploadFile.raw.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }

  // 显示预览
  imgUrl.value = URL.createObjectURL(uploadFile.raw)

  // 将文件转换为base64格式
  const reader = new FileReader()
  reader.onload = (e) => {
    formModel.value.cover_img = e.target.result // base64 dataUri string

    // 触发表单验证
    nextTick(() => {
      formRef.value?.validateField('cover_img')
    })
  }
  reader.readAsDataURL(uploadFile.raw)
}

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
    if (!editorInstance) {
      contentLength.value = 0
      return
    }

    const outputData = await editorInstance.save()
    let totalLength = 0

    if (outputData && outputData.blocks) {
      outputData.blocks.forEach((block) => {
        if (block.data) {
          // 处理不同类型的块
          switch (block.type) {
            case 'paragraph':
              totalLength += getTextLength(block.data.text || '')
              break

            case 'header':
              totalLength += getTextLength(block.data.text || '')
              break

            case 'quote':
              totalLength += getTextLength(block.data.text || '')
              totalLength += getTextLength(block.data.caption || '')
              break

            case 'warning':
            case 'alert':
              totalLength += getTextLength(block.data.title || '')
              totalLength += getTextLength(
                block.data.message || block.data.text || ''
              )
              break

            case 'code':
              totalLength += getTextLength(block.data.code || '')
              totalLength += getTextLength(block.data.caption || '')
              break

            case 'image':
              // 统计图片描述
              totalLength += getTextLength(block.data.caption || '')
              break

            case 'checklist':
              if (block.data.items && Array.isArray(block.data.items)) {
                block.data.items.forEach((item) => {
                  totalLength += getTextLength(item.text || '')
                })
              }
              break

            case 'table':
              if (block.data.content && Array.isArray(block.data.content)) {
                block.data.content.forEach((row) => {
                  if (Array.isArray(row)) {
                    row.forEach((cell) => {
                      totalLength += getTextLength(cell || '')
                    })
                  }
                })
              }
              break

            case 'list':
              if (block.data.items && Array.isArray(block.data.items)) {
                block.data.items.forEach((item) => {
                  if (typeof item === 'string') {
                    totalLength += getTextLength(item)
                  } else if (typeof item === 'object' && item.content) {
                    totalLength += getTextLength(item.content)
                  } else if (typeof item === 'object' && item.text) {
                    totalLength += getTextLength(item.text)
                  }
                })
              }
              break

            case 'linkTool':
              // 统计链接的标题和描述
              if (block.data.meta) {
                totalLength += getTextLength(block.data.meta.title || '')
                totalLength += getTextLength(block.data.meta.description || '')
              }
              break

            case 'embed':
              // 统计嵌入内容的描述
              totalLength += getTextLength(block.data.caption || '')
              break

            case 'attaches': {
              // 统计附件的标题和描述
              if (block.data.file) {
                totalLength += getTextLength(
                  block.data.file.title || block.data.file.name || ''
                )
              }
              totalLength += getTextLength(block.data.title || '')
              break
            }

            case 'raw':
              // 统计原始HTML中的文本内容
              totalLength += getTextLength(block.data.html || '')
              break

            case 'marker':
            case 'inlineCode':
              totalLength += getTextLength(block.data.text || '')
              break

            default: {
              // 对于未知类型，尝试提取常见的文本字段
              const textFields = [
                'text',
                'content',
                'caption',
                'title',
                'description',
                'message'
              ]
              textFields.forEach((field) => {
                if (
                  block.data[field] &&
                  typeof block.data[field] === 'string'
                ) {
                  totalLength += getTextLength(block.data[field])
                }
              })
              break
            }
          }
        }
      })
    }

    contentLength.value = totalLength
  } catch (error) {
    console.error('更新字数统计失败:', error)
    contentLength.value = 0
  }
}

// 暴露方法
const open = async () => {
  visibleDrawer.value = true
  // 等待 DOM 更新
  await nextTick()
  await initEditor()
}

// 关闭前确认
const handleClose = (done) => {
  // 检查是否有未保存的内容
  if (
    formModel.value.title ||
    formModel.value.cover_img ||
    contentLength.value > 0
  ) {
    ElMessageBox.confirm('确定要关闭吗？未保存的内容将会丢失', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
      .then(() => {
        resetForm()
        done()
      })
      .catch(() => {
        // 用户取消关闭
      })
  } else {
    resetForm()
    done()
  }
}

// 重置表单
const resetForm = () => {
  formModel.value = { ...defaultForm }
  contentLength.value = 0
  imgUrl.value = ''
  formRef.value?.clearValidate()
}

// 发布帖子
const onPublish = async () => {
  // 表单验证
  const valid = await formRef.value.validate()
  if (!valid) return

  submitLoading.value = true

  try {
    // 获取编辑器内容
    const content = await getEditorContent()

    // 调用发布接口（cover_img已经是base64格式）
    await createPost({
      title: formModel.value.title,
      content: content,
      cover_img: formModel.value.cover_img || ''
    })

    ElMessage.success('帖子发布成功！')

    // 关闭弹窗
    visibleDrawer.value = false
    resetForm()

    // 通知父组件刷新列表
    emit('success')
  } catch (error) {
    console.error('发布帖子失败:', error)
    ElMessage.error('发布失败，请重试')
  } finally {
    submitLoading.value = false
  }
}

// 组件销毁前清理
onBeforeUnmount(() => {
  if (editorInstance) {
    editorInstance.destroy()
  }
})

// 事件发射
const emit = defineEmits(['success'])

// 暴露方法给父组件
defineExpose({
  open
})
</script>

<template>
  <el-drawer
    v-model="visibleDrawer"
    title="发布帖子"
    direction="rtl"
    size="50%"
    :before-close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formModel"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="帖子标题" prop="title">
        <el-input
          v-model="formModel.title"
          placeholder="请输入帖子标题"
          maxlength="50"
          show-word-limit
          clearable
        />
      </el-form-item>

      <el-form-item label="帖子封面" prop="cover_img">
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

      <el-form-item label="帖子内容" prop="content">
        <div class="editor-container">
          <div class="editor-header">
            <span class="word-count">字数: {{ contentLength }}</span>
          </div>
          <div class="editor">
            <div id="editorjs-container" class="editorjs-container"></div>
          </div>
        </div>
      </el-form-item>

      <el-form-item>
        <div class="submit-buttons">
          <el-button
            @click="onPublish"
            type="primary"
            :loading="submitLoading"
            :disabled="contentLength === 0"
          >
            {{ submitLoading ? '发布中...' : '发布帖子' }}
          </el-button>
          <el-button @click="visibleDrawer = false">取消</el-button>
        </div>
      </el-form-item>
    </el-form>
  </el-drawer>
</template>

<style lang="scss" scoped>
// 封面上传样式
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

// 编辑器样式
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
    }
  }
}

// 按钮样式
.submit-buttons {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  width: 100%;
  margin-top: 20px;

  :deep(.el-button--primary) {
    background-color: #6c6e74;
    border-color: #909399;
    color: #fff;
    transition: background 0.2s, color 0.2s;

    &:hover:not(:disabled) {
      background-color: #575555;
      color: #ffffff;
      border-color: #909399;
    }

    &:disabled {
      background-color: #c0c4cc;
      border-color: #c0c4cc;
      color: #fff;
      cursor: default;

      &:hover {
        background-color: #b2b4b8;
        border-color: #c0c4cc;
        color: white;
      }
    }
  }
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
