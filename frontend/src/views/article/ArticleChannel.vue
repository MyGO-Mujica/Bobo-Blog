<script setup>
import { ref, computed, watch } from 'vue'
import {
  Edit,
  Delete,
  Document,
  DocumentDelete,
  Plus,
  ArrowLeft
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  artGetChannelsService,
  artDelChannelService,
  artGetListService,
  artGetDetailService
} from '../../api/article'
import ChannelEdit from './components/ChannelEdit.vue'
import { formatRelativeTime, formatDetailTime } from '@/utils/format.js'
import { baseURL } from '@/utils/request'
import { useUserStore } from '@/stores'

const userStore = useUserStore()

const allChannels = ref([]) // 存储所有分类数据
const loading = ref(false)
const loadingCounts = ref(new Set()) // 正在加载文章数量的分类ID
const dialog = ref()
const searchKeyword = ref('') // 搜索关键词
const debouncedSearchKeyword = ref('') // 防抖后的搜索关键词

// 文章预览相关状态
const previewVisible = ref(false)
const previewLoading = ref(false)
const selectedCategory = ref(null)
const categoryArticles = ref([])
const selectedArticle = ref(null)

// 排序相关状态
const sortField = ref('')
const sortOrder = ref('') // 'ascending' | 'descending'

// 防抖处理
let debounceTimer = null
watch(
  searchKeyword,
  (newValue) => {
    // 清除之前的定时器
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    // 设置新的定时器，300ms后更新防抖关键词
    debounceTimer = setTimeout(() => {
      debouncedSearchKeyword.value = newValue
    }, 300)
  },
  { immediate: true }
)

// 排序值处理函数
const getSortValue = (value, field) => {
  if (field === 'articleCount') {
    // 对于文章数量，未加载的(null)排在最后，加载失败的(undefined)当作0处理
    return value === null ? -1 : Number(value) || 0
  } else if (field === 'create_time' || field === 'update_time') {
    return new Date(value).getTime()
  }
  return value
}

// 计算属性：筛选和排序后的分类列表
const channelList = computed(() => {
  let filtered = allChannels.value

  // 先筛选 - 使用防抖后的关键词
  if (debouncedSearchKeyword.value.trim()) {
    filtered = filtered.filter((channel) =>
      channel.cate_name
        .toLowerCase()
        .includes(debouncedSearchKeyword.value.toLowerCase())
    )
  }

  // 再排序
  if (sortField.value && sortOrder.value) {
    filtered = [...filtered].sort((a, b) => {
      const field = sortField.value
      const aVal = getSortValue(a[field], field)
      const bVal = getSortValue(b[field], field)

      if (aVal < bVal) {
        return sortOrder.value === 'ascending' ? -1 : 1
      }
      if (aVal > bVal) {
        return sortOrder.value === 'ascending' ? 1 : -1
      }
      return 0
    })
  }

  return filtered
})

// 排序变化处理
const handleSortChange = ({ prop, order }) => {
  sortField.value = prop || ''
  sortOrder.value = order || ''
}

// 清除排序
const clearSort = () => {
  sortField.value = 'create_time'
  sortOrder.value = 'descending'
}

// 获取文章数量标签类型
const getTagType = (count) => {
  if (count === 0) return 'info'
  if (count <= 3) return 'warning'
  if (count <= 15) return 'success'
  return 'danger'
}

const getChannelList = async () => {
  loading.value = true
  try {
    const res = await artGetChannelsService()
    // 初始化分类数据，文章数量设为 null 表示未加载
    allChannels.value = res.data.data.map((channel) => ({
      ...channel,
      articleCount: null // null 表示未加载，undefined 表示加载失败
    }))

    // 异步加载前几个分类的文章数量（可见区域优先）
    loadInitialCounts()
  } catch (error) {
    ElMessage.error('获取分类列表失败')
  } finally {
    loading.value = false
  }
}

// 懒加载文章数量
const loadArticleCount = async (channel) => {
  if (channel.articleCount !== null || loadingCounts.value.has(channel.id)) {
    return // 已加载或正在加载
  }

  loadingCounts.value.add(channel.id)
  try {
    const res = await artGetListService({
      pagenum: 1,
      pagesize: 1,
      cate_id: channel.id
    })

    // 更新对应分类的文章数量
    const index = allChannels.value.findIndex((c) => c.id === channel.id)
    if (index !== -1) {
      allChannels.value[index].articleCount = res.data.total
    }
  } catch (error) {
    // 加载失败，设为 undefined
    const index = allChannels.value.findIndex((c) => c.id === channel.id)
    if (index !== -1) {
      allChannels.value[index].articleCount = undefined
    }
  } finally {
    loadingCounts.value.delete(channel.id)
  }
}

// 加载初始可见的分类数量（前5个）
const loadInitialCounts = async () => {
  const visibleChannels = allChannels.value.slice(0, 5)
  await Promise.all(visibleChannels.map((channel) => loadArticleCount(channel)))
}

getChannelList()

// 获取分类的文章数量（如果未加载则加载）
const getChannelArticleCount = async (channel) => {
  if (channel.articleCount !== null) {
    return channel.articleCount
  }

  try {
    const res = await artGetListService({
      pagenum: 1,
      pagesize: 1,
      cate_id: channel.id
    })
    return res.data.total
  } catch (error) {
    throw new Error('检查分类状态失败，请稍后重试')
  }
}

const onDelChannel = async (row) => {
  try {
    const articleCount = await getChannelArticleCount(row)

    if (articleCount > 0) {
      ElMessageBox.alert(
        `该分类下还有 ${articleCount} 篇文章，无法删除。请先删除或移动这些文章到其他分类。`,
        '无法删除分类',
        {
          type: 'warning',
          confirmButtonText: '知道了'
        }
      )
      return
    }

    // 如果没有文章，则可以安全删除
    try {
      await ElMessageBox.confirm('确认要删除该分类吗？', '温馨提示', {
        type: 'warning',
        confirmButtonText: '确认',
        cancelButtonText: '取消'
      })

      await artDelChannelService(row.id)
      ElMessage.success('删除成功')
      getChannelList()
    } catch (confirmError) {
      // 用户点击取消时，ElMessageBox.confirm 会抛出 'cancel' 异常
      // 这是正常的用户操作，不需要显示错误提示
      if (confirmError === 'cancel') {
        return
      }
      // 其他错误（如网络错误等）才显示错误提示
      throw confirmError
    }
  } catch (error) {
    ElMessage.error(error.message || '删除失败，请稍后重试')
  }
}
const onEditChannel = (row) => {
  dialog.value.open(row)
}
const onAddChannel = () => {
  dialog.value.open({})
}
const onSuccess = () => {
  getChannelList()
}

// 显示分类文章预览
const showCategoryPreview = async (category) => {
  selectedCategory.value = category
  previewVisible.value = true
  previewLoading.value = true

  try {
    const res = await artGetListService({
      pagenum: 1,
      pagesize: 10, // 最多显示10篇文章
      cate_id: category.id
    })
    categoryArticles.value = res.data.data || []
  } catch (error) {
    ElMessage.error('获取分类文章失败')
    categoryArticles.value = []
  } finally {
    previewLoading.value = false
  }
}

// 显示文章详情预览
const showArticlePreview = async (article) => {
  previewLoading.value = true

  try {
    const res = await artGetDetailService(article.id)
    selectedArticle.value = res.data.data
  } catch (error) {
    ElMessage.error('获取文章详情失败')
    selectedArticle.value = null
  } finally {
    previewLoading.value = false
  }
}

// 关闭预览
const closePreview = () => {
  previewVisible.value = false
  selectedCategory.value = null
  selectedArticle.value = null
  categoryArticles.value = []
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
  <page-container title="文章分类">
    <template #extra>
      <div class="header-actions">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索分类名称"
          clearable
          prefix-icon="Search"
          class="search-input"
        />
        <div class="right-actions">
          <transition name="slide-fade">
            <el-button
              v-if="
                sortField &&
                !(sortField === 'create_time' && sortOrder === 'descending')
              "
              size="small"
              @click="clearSort"
              type="info"
              plain
              class="clear-sort-btn"
            >
              清除排序
            </el-button>
          </transition>
          <el-button
            @click="onAddChannel"
            type="primary"
            class="add-category-btn"
          >
            <el-icon><Plus /></el-icon>
            添加分类
          </el-button>
        </div>
      </div>
    </template>

    <el-table
      v-loading="loading"
      :data="channelList"
      style="width: 95%"
      @sort-change="handleSortChange"
      :default-sort="{ prop: 'create_time', order: 'descending' }"
      class="category-table"
      stripe
    >
      <el-table-column prop="cate_name" label="分类名称" show-overflow-tooltip>
        <template #default="{ row }">
          <div
            class="category-name-cell category-name-btn-clickable"
            @click="showCategoryPreview(row)"
          >
            <span class="category-name-btn">
              {{ row.cate_name }}
            </span>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="articleCount"
        label="文章数量"
        width="200"
        align="center"
        sortable="custom"
      >
        <template #default="{ row }">
          <div class="article-count-wrapper">
            <el-tag
              v-if="row.articleCount !== null"
              :type="getTagType(row.articleCount || 0)"
              size="small"
              class="article-count-tag"
            >
              <el-icon class="count-icon">
                <Document v-if="(row.articleCount || 0) > 0" />
                <DocumentDelete v-else />
              </el-icon>
              {{ row.articleCount || 0 }} 篇
            </el-tag>
            <el-button
              v-else
              size="small"
              type="primary"
              plain
              @click="loadArticleCount(row)"
              :loading="loadingCounts.has(row.id)"
              class="load-count-btn"
            >
              <template v-if="!loadingCounts.has(row.id)">
                <el-icon><Document /></el-icon>
                加载
              </template>
              <template v-else> 加载中... </template>
            </el-button>
          </div>
        </template>
      </el-table-column>
      <el-table-column
        prop="create_time"
        label="创建时间"
        width="180"
        sortable="custom"
      >
        <template #default="{ row }">
          {{ formatRelativeTime(row.create_time) }}
        </template>
      </el-table-column>
      <el-table-column
        prop="update_time"
        label="修改时间"
        width="180"
        sortable="custom"
      >
        <template #default="{ row }">
          {{ formatRelativeTime(row.update_time) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="150">
        <!-- row 就是 channelList 的一项， $index 下标 -->
        <template #default="{ row }">
          <el-button
            :icon="Edit"
            circle
            plain
            type="primary"
            @click.stop="onEditChannel(row)"
          ></el-button>
          <el-button
            :icon="Delete"
            circle
            plain
            type="danger"
            @click.stop="onDelChannel(row)"
          ></el-button>
        </template>
      </el-table-column>

      <template #empty>
        <el-empty
          :description="
            debouncedSearchKeyword.trim() ? '没有找到匹配的分类' : '没有数据'
          "
          :image-size="100"
        >
          <template v-if="debouncedSearchKeyword.trim()" #description>
            <div>
              <p>没有找到包含 "{{ debouncedSearchKeyword }}" 的分类</p>
              <el-button
                type="primary"
                @click="searchKeyword = ''"
                size="small"
              >
                清除搜索
              </el-button>
            </div>
          </template>
        </el-empty>
      </template>
    </el-table>

    <channel-edit ref="dialog" @success="onSuccess"></channel-edit>

    <!-- 文章预览弹窗 -->
    <el-dialog
      v-model="previewVisible"
      :title="selectedArticle ? '' : selectedCategory?.cate_name"
      width="800px"
      top="5vh"
      @close="closePreview"
      class="article-preview-dialog"
    >
      <div v-loading="previewLoading" class="preview-content">
        <!-- 文章详情预览 -->
        <div v-if="selectedArticle" class="article-detail-preview">
          <!-- 文章标题 - 左对齐 -->
          <div class="preview-title">
            {{ selectedArticle.title }}
          </div>

          <!-- 发布日期和分类信息 -->
          <div class="preview-info-row">
            <div class="preview-date">
              {{ formatDetailTime(selectedArticle.pub_date) }}
            </div>
            <div class="preview-meta-tags">
              <el-tag type="info" size="small">{{
                selectedArticle.cate_name
              }}</el-tag>
              <el-tag
                :type="
                  selectedArticle.state === '已发布' ? 'success' : 'warning'
                "
                size="small"
              >
                {{ selectedArticle.state }}
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
            v-html="renderEditorContent(selectedArticle.content)"
          />

          <div class="article-actions">
            <el-button @click="selectedArticle = null" size="small">
              <el-icon><ArrowLeft /></el-icon>
              返回列表
            </el-button>
          </div>
        </div>

        <!-- 文章列表预览 -->
        <div v-else class="articles-list-preview">
          <div
            v-if="categoryArticles.length === 0 && !previewLoading"
            class="empty-state"
          >
            <el-empty description="该分类下暂无文章" :image-size="80" />
          </div>

          <div v-else class="articles-grid">
            <div
              v-for="article in categoryArticles"
              :key="article.id"
              class="article-card"
              @click="showArticlePreview(article)"
            >
              <div class="card-cover" v-if="article.cover_img">
                <img :src="baseURL + article.cover_img" alt="文章封面" />
              </div>
              <div class="card-content">
                <h3 class="card-title">{{ article.title }}</h3>
                <p class="card-summary">
                  {{ getContentPreview(article.content, article.summary) }}
                </p>
                <div class="card-meta">
                  <span class="publish-time">
                    {{ formatRelativeTime(article.pub_date) }}
                  </span>
                  <span class="article-state" :class="article.state">
                    {{ article.state === '已发布' ? '已发布' : '草稿' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="closePreview" size="small">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </page-container>
</template>

<style lang="scss" scoped>
/* 头部操作区域 */
.header-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

/* 搜索输入框 */
.search-input {
  width: 200px;
  flex-shrink: 0;

  :deep(.el-input__wrapper) {
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: #c0c4cc;
    }

    &.is-focus {
      border-color: #409eff;
    }
  }
}

.right-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

/* 清除排序按钮 */
.clear-sort-btn {
  border-radius: 4px;
  transition: all 0.2s ease;

  &:hover {
    background: #409eff;
    border-color: #409eff;
    color: white;
  }
}

/* 添加分类按钮 */
.add-category-btn {
  border-radius: 4px;
  font-weight: 500;

  .el-icon {
    margin-right: 4px;
  }
}

/* 表格样式 */
.category-table {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  margin: 0 auto; /* 让表格水平居中 */

  :deep(.el-table__header) {
    th {
      background: #f8f9fa;
      color: #495057;
      font-weight: 600;
      border-bottom: 2px solid #e9ecef;
    }
  }

  :deep(.el-table__body) {
    tr {
      transition: background-color 0.2s ease;

      &:hover {
        background-color: #f5f7fa;
      }

      &.el-table__row--striped {
        background-color: #fafbfc;

        &:hover {
          background-color: #f5f7fa;
        }
      }
    }

    td {
      border-bottom: 1px solid #f0f2f5;
      color: #606266;
    }
  }
}

/* 文章数量标签 */
.article-count-wrapper {
  display: flex;
  justify-content: center;
}

.article-count-tag {
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 8px;

  .count-icon {
    font-size: 14px;
    margin-right: 4px;
  }

  /* 自定义标签颜色 - 覆盖Element Plus默认样式 */
  &.el-tag--info {
    background-color: #f4f4f5;
    border-color: #d3d4d6;
    color: #6c757d;

    .count-icon {
      color: #6c757d; /* 无文章时 */
    }
  }

  &.el-tag--warning {
    background-color: #e8f5e8;
    border-color: #95d895;
    color: #52c252;

    .count-icon {
      color: #52c252; /* 1-3篇文章时 */
    }
  }

  &.el-tag--success {
    background-color: #d4edda;
    border-color: #7bc17b;
    color: #28a745;

    .count-icon {
      color: #28a745; /* 4-15篇文章时 */
    }
  }

  &.el-tag--danger {
    background-color: #c8e6c9;
    border-color: #4caf50;
    color: #1b5e20;

    .count-icon {
      color: #1b5e20; /* 15篇以上文章时 */
    }
  }
}

/* 加载数量按钮 */
.load-count-btn {
  border-radius: 4px;
  font-size: 12px;
  padding: 4px 12px;

  .el-icon {
    font-size: 12px;
    margin-right: 4px;
  }

  &:hover {
    transform: translateY(-1px);
  }
}

/* 过渡动画*/
.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.2s ease;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.category-name-cell {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  cursor: pointer;
  transition: background 0.15s;
  user-select: none;
  padding: 0 4px;
}

.category-name-btn {
  color: #333;
  font-weight: 500;
  border: none;
  background: none;
  padding: 0;
}

.preview-content {
  min-height: 200px;
}

/* 文章详情预览样式 */
.article-detail-preview {
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

  .article-actions {
    margin-top: 24px;
    padding-top: 16px;
    border-top: 1px solid #e9ecef;
  }
}

/* 文章列表预览样式 */
.articles-list-preview {
  .empty-state {
    text-align: center;
    padding: 40px 0;
  }

  .articles-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
  }

  .article-card {
    border: 1px solid #e9ecef;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.3s ease;
    cursor: pointer;
    background: white;
    height: 280x;
    display: flex;
    flex-direction: column;

    &:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
      border-color: #409eff;
    }

    .card-cover {
      height: 160px;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      &:hover img {
        transform: scale(1.05);
      }
    }

    .card-content {
      flex: 1 1 0;
      padding: 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;

      .card-title {
        font-size: 16px;
        font-weight: 600;
        color: #2c3e50;
        margin: 0 0 12px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-summary {
        font-size: 14px;
        color: #6c757d;
        line-height: 1.5;
        margin: 0 0 12px 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .card-meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;

        .publish-time {
          font-size: 12px;
          color: #6c757d;
        }

        .article-state {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;

          &.已发布 {
            background: rgb(227, 243, 218);
            color: rgba(66, 123, 38, 0.9);
          }

          &.草稿 {
            background: rgb(253, 246, 236);
            color: rgb(230, 163, 62);
          }
        }
      }
    }
  }
}
</style>
