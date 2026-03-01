<script setup>
import { ref } from 'vue'
import { Delete, Edit, Picture, Position } from '@element-plus/icons-vue'
import ChannelSelect from './components/ChannelSelect.vue'
import ArticleEdit from './components/ArticleEdit.vue'
import {
  artGetListService,
  artDelService,
  artSearchService
} from '@/api/article.js'
import { createPost } from '@/api/square.js'
import { formatRelativeTime, formatDetailTime } from '@/utils/format.js'
import { baseURL } from '@/utils/request'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

const articleList = ref([]) // 文章列表
const total = ref(0) // 总条数
const loading = ref(false) // loading状态

// 定义请求参数对象
const params = ref({
  pagenum: 1, // 当前页
  pagesize: 5, // 当前生效的每页条数
  cate_id: null,
  state: '',
  keyword: '' // 搜索关键词
})

// 预览对话框相关
const previewDialogVisible = ref(false)
const previewArticle = ref({})

// 分享对话框相关
const shareDialogVisible = ref(false)
const shareArticle = ref({})
const shareForm = ref({
  title: '',
  cover_img: ''
})
const shareLoading = ref(false)

// 全局统计信息
const globalStats = ref({
  total: 0,
  published: 0,
  draft: 0
})

// 基于params参数，获取文章列表
const getArticleList = async () => {
  loading.value = true

  // 创建一个新的参数对象，确保 cate_id 是数字类型
  const queryParams = { ...params.value }
  if (queryParams.cate_id !== '') {
    queryParams.cate_id = Number(queryParams.cate_id)
  }

  // 根据是否有搜索关键词选择不同的接口
  let res
  if (queryParams.keyword && queryParams.keyword.trim()) {
    // 使用搜索接口
    res = await artSearchService(queryParams)
  } else {
    // 使用普通列表接口，移除 keyword 参数
    // eslint-disable-next-line no-unused-vars
    const { keyword, ...listParams } = queryParams
    res = await artGetListService(listParams)
  }

  articleList.value = res.data.data
  total.value = res.data.total

  // 获取全局统计信息（不分页的完整统计）
  await getGlobalStats()

  loading.value = false
}

// 获取全局统计信息
const getGlobalStats = async () => {
  try {
    // 获取所有文章（不分页）用于统计
    const statsRes = await artGetListService({ pagenum: 1, pagesize: 9999 })
    const allArticles = statsRes.data.data

    globalStats.value = {
      total: statsRes.data.total,
      published: allArticles.filter((item) => item.state === '已发布').length,
      draft: allArticles.filter((item) => item.state === '草稿').length
    }
  } catch (error) {
    console.error('获取统计信息失败:', error)
  }
}
getArticleList()

// 处理分页逻辑
const onSizeChange = (size) => {
  // console.log('当前每页条数', size)
  // 只要是每页条数变化了，那么原本正在访问的当前页意义不大了，数据大概率已经不在原来那一页了
  // 重新从第一页渲染即可
  params.value.pagenum = 1
  params.value.pagesize = size
  // 基于最新的当前页 和 每页条数，渲染数据
  getArticleList()
}
const onCurrentChange = (page) => {
  // 更新当前页
  params.value.pagenum = page
  // 基于最新的当前页，渲染数据
  getArticleList()
}

// 搜索逻辑 => 按照最新的条件，重新检索，从第一页开始展示
const onSearch = () => {
  params.value.pagenum = 1 // 重置页面
  getArticleList()
}

// 重置逻辑 => 将筛选条件清空，重新检索，从第一页开始展示
const onReset = () => {
  params.value.pagenum = 1 // 重置页面
  params.value.cate_id = null
  params.value.state = ''
  params.value.keyword = '' // 重置搜索关键词
  getArticleList()
}

const articleEditRef = ref()
// 添加逻辑
const onAddArticle = () => {
  articleEditRef.value.open({})
}
// 编辑逻辑
const onEditArticle = (row) => {
  articleEditRef.value.open(row)
}

// 删除逻辑
const onDeleteArticle = async (row) => {
  // 提示用户是否要删除
  await ElMessageBox.confirm('此操作将永久删除该文件, 是否继续?', '提示', {
    confirmButtonText: '确定',
    cancelButtonText: '取消',
    type: 'warning'
  })
  await artDelService(row.id)
  ElMessage.success('删除成功')
  // 重新渲染列表
  getArticleList()
}

// 添加或者编辑 成功的回调
const onSuccess = (type) => {
  if (type === 'add') {
    // 如果是添加，跳转到第一页显示最新文章
    params.value.pagenum = 1
  }

  getArticleList()
}

// 预览文章内容
const onPreviewArticle = (row) => {
  previewArticle.value = row
  previewDialogVisible.value = true
}

// 分享文章到广场
const onShareArticle = (row) => {
  // 只允许分享已发布的文章
  if (row.state !== '已发布') {
    ElMessage.warning('只能分享已发布的文章')
    return
  }

  shareArticle.value = row
  shareForm.value = {
    title: row.title, // 默认使用文章标题
    cover_img: row.cover_img || ''
  }
  shareDialogVisible.value = true
}

// 将图片URL转换为base64格式
const convertImageToBase64 = async (imageUrl) => {
  try {
    // 如果已经是base64格式，直接返回
    if (imageUrl.startsWith('data:')) {
      return imageUrl
    }

    // 如果是相对路径，补全为完整URL
    const fullUrl = imageUrl.startsWith('http') ? imageUrl : baseURL + imageUrl

    const response = await fetch(fullUrl)
    const blob = await response.blob()

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch (error) {
    console.error('图片转换失败:', error)
    return ''
  }
}

// 确认分享文章
const confirmShareArticle = async () => {
  shareLoading.value = true

  try {
    // 准备发布参数，直接使用文章内容
    const postData = {
      article_id: shareArticle.value.id, // 关联文章ID
      title: shareForm.value.title,
      content: shareArticle.value.content || '' // 直接使用原文章内容
    }

    // 如果有封面图片，转换为base64格式
    if (shareArticle.value.cover_img) {
      const base64Image = await convertImageToBase64(
        shareArticle.value.cover_img
      )
      if (base64Image) {
        postData.cover_img = base64Image
      }
    }

    await createPost(postData)

    ElMessage.success('文章已分享到广场')
    shareDialogVisible.value = false

    // 重置表单
    shareForm.value = {
      title: '',
      cover_img: ''
    }
  } catch (error) {
    console.error('分享文章失败:', error)
    ElMessage.error('分享失败，请重试')
  } finally {
    shareLoading.value = false
  }
}

// 取消分享
const cancelShare = () => {
  shareDialogVisible.value = false
  shareForm.value = {
    title: '',
    cover_img: ''
  }
}

// 获取文章内容预览（优先使用后端返回的summary）
const getContentPreview = (content, summary) => {
  // 优先使用后端返回的智能摘要
  if (summary && summary.trim()) {
    return summary.length > 80 ? summary.substring(0, 80) + '...' : summary
  }

  // 降级方案：客户端解析Editor.js内容
  if (!content) return '暂无内容'

  try {
    // 尝试解析 Editor.js JSON 格式
    const editorData = JSON.parse(content)
    if (editorData.blocks && Array.isArray(editorData.blocks)) {
      const textBlocks = editorData.blocks
        .filter(
          (block) =>
            block.type === 'paragraph' ||
            block.type === 'header' ||
            block.type === 'list' ||
            block.type === 'quote'
        )
        .map((block) => {
          if (block.type === 'list') {
            // 处理列表项
            const listItems = block.data.items
              .map((item) => {
                if (typeof item === 'object' && item.content) {
                  return item.content
                } else if (typeof item === 'string') {
                  return item
                }
                return ''
              })
              .join(' ')
            return listItems
          }
          return block.data.text || ''
        })
        .join(' ')

      if (textBlocks) {
        const cleanText = textBlocks.replace(/<[^>]*>/g, '') // 去除HTML标签
        return cleanText.length > 50
          ? cleanText.substring(0, 50) + '...'
          : cleanText
      }
    }
  } catch (e) {
    // 如果不是JSON格式，按原HTML处理
    const textContent = content.replace(/<[^>]*>/g, '')
    return textContent.length > 50
      ? textContent.substring(0, 50) + '...'
      : textContent
  }

  return '暂无内容'
}

// 获取状态标签类型
const getStateTagType = (state) => {
  return state === '已发布' ? 'success' : 'warning'
}

// 将Editor.js JSON格式转换为HTML用于预览
const renderEditorContent = (content) => {
  if (!content) return '<p>暂无内容</p>'

  try {
    const editorData = JSON.parse(content)
    if (!editorData.blocks || !Array.isArray(editorData.blocks)) {
      return '<p>内容格式错误</p>'
    }

    return editorData.blocks
      .map((block) => {
        switch (block.type) {
          case 'paragraph': {
            return `<p>${block.data.text || ''}</p>`
          }
          case 'header': {
            const level = block.data.level || 2
            return `<h${level}>${block.data.text || ''}</h${level}>`
          }

          case 'checklist': {
            const items = block.data.items
              .map(
                (item) =>
                  `<div class="checklist-item">
                    <input type="checkbox" ${
                      item.checked ? 'checked' : ''
                    } disabled>
                    <span>${item.text}</span>
                  </div>`
              )
              .join('')
            return `<div class="checklist">${items}</div>`
          }
          case 'quote': {
            return `<blockquote><p>${block.data.text || ''}</p><cite>${
              block.data.caption || ''
            }</cite></blockquote>`
          }
          case 'warning': {
            return `<div class="warning-block">
              <div class="warning-title">${block.data.title || '警告'}</div>
              <div class="warning-message">${block.data.message || ''}</div>
            </div>`
          }
          case 'code': {
            return `<pre><code>${block.data.code || ''}</code></pre>`
          }
          case 'table': {
            if (!block.data.content || !block.data.content.length) return ''
            const hasHeadings = block.data.withHeadings
            let tableHtml = '<table class="editor-table">'

            if (hasHeadings && block.data.content[0]) {
              tableHtml += '<thead><tr>'
              block.data.content[0].forEach((cell) => {
                tableHtml += `<th>${cell || ''}</th>`
              })
              tableHtml += '</tr></thead>'
            }

            tableHtml += '<tbody>'
            const startIndex = hasHeadings ? 1 : 0
            for (let i = startIndex; i < block.data.content.length; i++) {
              tableHtml += '<tr>'
              block.data.content[i].forEach((cell) => {
                tableHtml += `<td>${cell || ''}</td>`
              })
              tableHtml += '</tr>'
            }
            tableHtml += '</tbody></table>'
            return tableHtml
          }
          case 'image': {
            const caption = block.data.caption
              ? `<figcaption>${block.data.caption}</figcaption>`
              : ''
            const imageUrl = block.data.file?.url || ''
            const imageAlt = block.data.caption || ''
            return `<figure><img src="${imageUrl}" alt="${imageAlt}" style="max-width: 100%; height: auto;" />${caption}</figure>`
          }
          case 'simpleImage': {
            return `<img src="${
              block.data.url || ''
            }" alt="" style="max-width: 100%; height: auto;" />`
          }
          case 'embed': {
            return `<div class="embed-container">
              <iframe src="${block.data.embed || ''}" 
                      width="${block.data.width || 580}" 
                      height="${block.data.height || 320}" 
                      frameborder="0" 
                      allowfullscreen>
              </iframe>
              <p class="embed-caption">${block.data.caption || ''}</p>
            </div>`
          }
          case 'delimiter': {
            return '<hr>'
          }
          default: {
            return `<div class="unknown-block">${JSON.stringify(
              block.data
            )}</div>`
          }
        }
      })
      .join('')
  } catch (e) {
    // 如果不是JSON格式，直接返回原内容（可能是HTML）
    return content
  }
}
</script>

<template>
  <page-container title="文章管理">
    <template #extra>
      <div class="header-actions">
        <!-- 统计信息 -->
        <div class="stats-info">
          <el-tag type="info" size="small"
            >总计: {{ globalStats.total }}</el-tag
          >
          <el-tag type="success" size="small"
            >已发布: {{ globalStats.published }}</el-tag
          >
          <el-tag type="warning" size="small"
            >草稿: {{ globalStats.draft }}</el-tag
          >
        </div>
        <el-button type="primary" @click="onAddArticle">添加文章</el-button>
      </div>
    </template>

    <!-- 表单区域 -->
    <el-form inline>
      <el-form-item label="搜索关键词:">
        <el-input
          v-model="params.keyword"
          placeholder="搜索文章标题"
          style="width: 200px"
          clearable
          @keyup.enter="onSearch"
        />
      </el-form-item>
      <el-form-item label="文章分类:">
        <channel-select v-model="params.cate_id" width="140px"></channel-select>
      </el-form-item>
      <el-form-item label="发布状态:">
        <!-- 这里后台标记发布状态，就是通过中文标记的，已发布 / 草稿 -->
        <el-select v-model="params.state" style="width: 90px">
          <el-option label="已发布" value="已发布"></el-option>
          <el-option label="草稿" value="草稿"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button @click="onSearch" type="primary">搜索</el-button>
        <el-button @click="onReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 表格区域 -->
    <el-table
      :data="articleList"
      v-loading="loading"
      stripe
      border
      style="width: 100%"
      :header-cell-style="{ background: '#fafafa', color: '#333' }"
    >
      <!-- 封面图片列 -->
      <el-table-column label="封面" width="100" align="center">
        <template #default="{ row }">
          <div class="cover-cell">
            <el-image
              v-if="row.cover_img"
              :src="baseURL + row.cover_img"
              fit="cover"
              class="cover-image"
              :preview-src-list="[baseURL + row.cover_img]"
              :hide-on-click-modal="false"
              :preview-teleported="true"
            />
            <el-icon v-else class="no-cover-icon">
              <Picture />
            </el-icon>
          </div>
        </template>
      </el-table-column>

      <!-- 文章标题和内容预览 -->
      <el-table-column label="文章信息" min-width="300">
        <template #default="{ row }">
          <div
            class="article-info article-info-clickable"
            @click="onPreviewArticle(row)"
          >
            <div class="article-title">
              <span class="article-title-text">{{ row.title }}</span>
            </div>
            <div class="article-preview">
              {{ getContentPreview(row.content, row.summary) }}
            </div>
            <div class="article-meta">
              <el-tag size="small" type="info">{{ row.cate_name }}</el-tag>
              <span class="word-count" v-if="row.word_count">
                {{ row.word_count }} 字
              </span>
              <span class="pub-date">{{
                formatRelativeTime(row.pub_date)
              }}</span>
            </div>
          </div>
        </template>
      </el-table-column>

      <!-- 状态列 -->
      <el-table-column label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="getStateTagType(row.state)" size="small">
            {{ row.state }}
          </el-tag>
        </template>
      </el-table-column>

      <!-- 操作列 -->
      <el-table-column label="操作" width="160" align="center" fixed="right">
        <template #default="{ row }">
          <div class="action-buttons">
            <!-- 分享按钮 - 只对已发布的文章显示 -->
            <el-button
              v-if="row.state === '已发布'"
              circle
              plain
              size="small"
              type="success"
              :icon="Position"
              @click="onShareArticle(row)"
              title="分享到广场"
              class="share-button"
            />
            <el-button
              circle
              plain
              size="small"
              type="primary"
              :icon="Edit"
              @click="onEditArticle(row)"
            />
            <el-button
              circle
              plain
              size="small"
              type="danger"
              :icon="Delete"
              @click="onDeleteArticle(row)"
            />
          </div>
        </template>
      </el-table-column>

      <!-- 空状态 -->
      <template #empty>
        <el-empty description="暂无文章数据" :image-size="120">
          <el-button type="primary" @click="onAddArticle"
            >创建第一篇文章</el-button
          >
        </el-empty>
      </template>
    </el-table>

    <!-- 分页区域 -->
    <el-pagination
      v-model:current-page="params.pagenum"
      v-model:page-size="params.pagesize"
      :page-sizes="[2, 3, 5, 10]"
      :background="true"
      layout="jumper, total, sizes, prev, pager, next"
      :total="total"
      @size-change="onSizeChange"
      @current-change="onCurrentChange"
      style="margin-top: 20px; justify-content: flex-end"
    />

    <!-- 添加编辑的抽屉 -->
    <article-edit ref="articleEditRef" @success="onSuccess"></article-edit>

    <!-- 分享文章对话框 -->
    <el-dialog
      v-model="shareDialogVisible"
      title="分享文章到广场"
      width="500px"
      center
      :close-on-click-modal="false"
    >
      <div class="share-content">
        <!-- 文章信息展示 -->
        <div class="article-info-display">
          <div class="article-title-display">
            {{ shareArticle.title }}
          </div>
          <div class="article-meta-display">
            <el-tag type="info" size="small">{{
              shareArticle.cate_name
            }}</el-tag>
            <span class="article-date">{{
              formatDetailTime(shareArticle.pub_date)
            }}</span>
          </div>
        </div>

        <!-- 分享表单 -->
        <el-form :model="shareForm" label-width="80px" style="margin-top: 20px">
          <el-form-item label="帖子标题" required>
            <el-input
              v-model="shareForm.title"
              placeholder="请输入帖子标题"
              maxlength="50"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelShare">取消</el-button>
          <el-button
            type="primary"
            @click="confirmShareArticle"
            :loading="shareLoading"
          >
            {{ shareLoading ? '分享中...' : '分享到广场' }}
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 文章预览对话框 -->
    <el-dialog
      v-model="previewDialogVisible"
      title=""
      width="55%"
      center
      :style="{ top: '-10vh' }"
    >
      <div class="preview-content">
        <!-- 文章标题 - 左对齐 -->
        <div class="preview-title">
          {{ previewArticle.title }}
        </div>

        <!-- 发布日期和分类信息 -->
        <div class="preview-info-row">
          <div class="preview-date">
            {{ formatDetailTime(previewArticle.pub_date) }}
          </div>
          <div class="preview-meta-tags">
            <el-tag type="info" size="small">{{
              previewArticle.cate_name
            }}</el-tag>
            <el-tag :type="getStateTagType(previewArticle.state)" size="small">
              {{ previewArticle.state }}
            </el-tag>
          </div>
        </div>

        <!-- 用户信息 -->
        <div class="preview-author">
          <el-avatar :size="40" :src="userStore.user.user_pic" />
          <span class="author-name">{{
            userStore.user.nickname || userStore.user.username
          }}</span>
        </div>

        <!-- 分隔线 -->
        <el-divider />

        <!-- 文章内容 -->
        <div
          class="preview-article-content"
          v-html="renderEditorContent(previewArticle.content)"
        />
      </div>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="previewDialogVisible = false" size="small"
            >关闭</el-button
          >
        </span>
      </template>
    </el-dialog>
  </page-container>
</template>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  .stats-info {
    display: flex;
    gap: 8px;
  }
}

.cover-cell {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 60px;

  .cover-image {
    width: 60px;
    height: 60px;
    border-radius: 6px;
    cursor: pointer;

    &:hover {
      transform: scale(1.05);
      transition: transform 0.2s;
    }
  }

  .no-cover-icon {
    font-size: 24px;
    color: #c0c4cc;
  }
}

.article-info {
  .article-title {
    font-weight: 700;
    font-size: 15px;
    color: #333;
    margin-bottom: 8px;

    .article-title-text {
      display: inline-block;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .el-link {
      font-weight: inherit;

      &:hover {
        text-decoration: underline;
      }
    }
  }

  .article-preview {
    color: #666;
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .article-meta {
    display: flex;
    align-items: center;
    gap: 12px;

    .word-count {
      color: #909399;
      background: #f4f4f5;
      padding: 0px 5px;
      border-radius: 4px;
      font-size: 11px;
    }

    .pub-date {
      color: #999;
      font-size: 12px;
    }
  }
}

.article-info-clickable:hover {
  cursor: pointer;
}

.action-buttons {
  display: flex;
  gap: 4px;
  justify-content: center;

  // 自定义分享按钮样式
  .share-button {
    background-color: #97aa97 !important;
    border-color: #ccecbd !important;
    color: #fff !important;
    transition: all 0.2s ease;

    &:hover:not(:disabled) {
      background-color: #fafafae1 !important;
      border-color: #699769 !important;
      color: #adc5a1 !important;
    }
  }
}

// 分享对话框样式
.share-content {
  .article-info-display {
    padding: 16px;
    background: #f8f9fa;
    border-radius: 8px;
    border-left: 4px solid #409eff;

    .article-title-display {
      font-size: 16px;
      font-weight: 600;
      color: #333;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    .article-meta-display {
      display: flex;
      align-items: center;
      gap: 12px;

      .article-date {
        color: #666;
        font-size: 12px;
      }
    }
  }
}

.preview-content {
  .preview-title {
    font-size: 24px;
    font-weight: 600;
    color: #333;
    text-align: left;
    margin-bottom: 5px;
    margin-left: 20px;
    line-height: 1.4;
  }

  .preview-info-row {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    margin-left: 20px;

    .preview-date {
      color: #8f8c8c;
      font-size: 12px;
    }

    .preview-meta-tags {
      display: flex;
      gap: 8px;
    }
  }

  .preview-author {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    margin-left: 20px;
    text-align: left;

    .author-name {
      color: #333;
      font-size: 16px;
      font-weight: 500;
    }
  }

  .preview-article-content {
    max-height: 400px;
    overflow-y: auto;
    padding: 16px;
    background: #fafafa;
    border-radius: 6px;
    line-height: 1.6;

    // 美化文章内容样式
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
      margin: 16px 0 8px;
      color: #333;
      font-weight: 600;
    }

    :deep(h1) {
      font-size: 28px;
    }

    :deep(h2) {
      font-size: 24px;
    }

    :deep(h3) {
      font-size: 20px;
    }

    :deep(p) {
      margin: 8px 0;
      color: #666;
      line-height: 1.8;
    }

    :deep(img) {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin: 8px 0;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    :deep(figure) {
      margin: 16px 0;
      text-align: center;

      figcaption {
        margin-top: 8px;
        font-size: 12px;
        color: #999;
        font-style: italic;
      }
    }

    :deep(code) {
      background: #f0f0f0;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 13px;
      color: #e74c3c;
    }

    :deep(pre) {
      background: #282c34;
      color: #abb2bf;
      padding: 16px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 12px 0;
      font-family: 'Courier New', monospace;
      line-height: 1.5;

      code {
        background: none;
        padding: 0;
        color: inherit;
      }
    }

    :deep(blockquote) {
      border-left: 4px solid #3498db;
      padding: 12px 20px;
      margin: 16px 0;
      background: #f8f9fa;
      border-radius: 0 6px 6px 0;

      p {
        margin: 0 0 8px;
        font-style: italic;
        font-size: 15px;
      }

      cite {
        font-size: 12px;
        color: #777;
        font-style: normal;
      }
    }

    :deep(ul),
    :deep(ol) {
      margin: 12px 0;
      padding-left: 24px;

      li {
        margin: 4px 0;
        line-height: 1.6;
      }
    }

    :deep(hr) {
      margin: 24px 0;
      border: none;
      height: 1px;
      background: linear-gradient(to right, transparent, #ddd, transparent);
    }

    :deep(a) {
      color: #3498db;
      text-decoration: none;
      border-bottom: 1px solid transparent;
      transition: border-color 0.2s;

      &:hover {
        border-bottom-color: #3498db;
      }
    }

    :deep(.unknown-block) {
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      padding: 8px 12px;
      border-radius: 4px;
      margin: 8px 0;
      font-size: 12px;
      color: #856404;
    }

    // Editor.js 新增块类型样式
    :deep(.checklist) {
      margin: 12px 0;

      .checklist-item {
        display: flex;
        align-items: center;
        margin: 8px 0;
        padding: 4px 0;

        input[type='checkbox'] {
          margin-right: 8px;
          cursor: default;
        }

        span {
          line-height: 1.6;
          color: #666;
        }
      }
    }

    :deep(.warning-block) {
      background: #fff7e6;
      border: 1px solid #ffd591;
      border-left: 4px solid #fa8c16;
      border-radius: 6px;
      padding: 16px;
      margin: 16px 0;

      .warning-title {
        font-weight: 600;
        color: #d46b08;
        font-size: 14px;
        margin-bottom: 8px;
        display: flex;
        align-items: center;

        &::before {
          content: '⚠️';
          margin-right: 8px;
        }
      }

      .warning-message {
        color: #ad6800;
        line-height: 1.6;
      }
    }

    :deep(.editor-table) {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0;
      background: white;
      border-radius: 6px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

      th,
      td {
        border: 1px solid #e8e8e8;
        padding: 12px 16px;
        text-align: left;
        line-height: 1.6;
      }

      th {
        background: #fafafa;
        font-weight: 600;
        color: #333;
        border-bottom: 2px solid #d9d9d9;
      }

      td {
        color: #666;
      }

      tr:nth-child(even) td {
        background: #fafafa;
      }

      tr:hover td {
        background: #f0f0f0;
      }
    }

    :deep(.embed-container) {
      margin: 20px 0;
      text-align: center;

      iframe {
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        max-width: 100%;
      }

      .embed-caption {
        margin-top: 8px;
        font-size: 12px;
        color: #999;
        font-style: italic;
      }
    }
  }
}

// 表格样式优化
:deep(.el-table) {
  border-radius: 8px;
  overflow: hidden;

  .el-table__header-wrapper {
    .el-table__header {
      .el-table__cell {
        background: #f8f9fa;
        border-bottom: 2px solid #e9ecef;
        font-weight: 600;
        color: #495057;
      }
    }
  }

  .el-table__body-wrapper {
    .el-table__row {
      &:hover {
        background-color: #f8f9fa;
      }
    }
  }
}

// 分页样式
:deep(.el-pagination) {
  .el-pagination__total,
  .el-pagination__jump {
    color: #666;
  }
}

// 对话框 footer 样式
:deep(.el-dialog__footer) {
  padding: 16px 20px;
  border-top: 1px solid #e9ecef;
  text-align: right;
}
</style>
