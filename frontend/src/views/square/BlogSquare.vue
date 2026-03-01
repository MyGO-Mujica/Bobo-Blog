<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores'
import { Star, EditPen, Delete } from '@element-plus/icons-vue'
import { getPostList, deletePost } from '@/api/square'
import { formatRelativeTime } from '@/utils/format'
import PostEditor from './components/PostEditor.vue'

const router = useRouter()
const userStore = useUserStore()

// 组件状态
const loading = ref(false)
const posts = ref([])
const currentPage = ref(1)
const pageSize = ref(6)
const total = ref(0)

// 权限相关
const isAdmin = ref(false)

// PostEditor 组件引用
const postEditorRef = ref()

onMounted(async () => {
  await checkUserRole()
  await loadPosts()
})

// 检查用户角色
const checkUserRole = async () => {
  // 从userStore中获取用户角色信息
  isAdmin.value = userStore.user?.role === 'admin'
}

// 加载帖子列表
const loadPosts = async () => {
  loading.value = true
  try {
    const res = await getPostList({
      page: currentPage.value,
      pageSize: pageSize.value
    })

    const data = res.data?.data || res.data

    // 处理新的后端响应格式：{ posts: [...], total: 9, currentPage: 1, pageSize: 6, totalPages: 2 }
    posts.value = data.posts || []
    total.value = data.total || 0
  } catch (error) {
    console.error('加载帖子失败:', error)
    console.error('错误详情:', error.response?.data)
    ElMessage.error('加载帖子失败')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handlePageChange = (page) => {
  currentPage.value = page
  loadPosts()
}

// 查看帖子详情
const viewPost = (post) => {
  router.push(`/square/post/${post.id}`)
}

// 删除帖子
const handleDeletePost = async (post) => {
  try {
    await ElMessageBox.confirm('确定要删除这个帖子吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    await deletePost(post.id)
    ElMessage.success('删除成功')
    loadPosts() // 重新加载列表
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除帖子失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

// 发布新帖子
const createPost = () => {
  postEditorRef.value.open()
}

// 发布成功后的回调
const handlePostSuccess = () => {
  // 重新加载帖子列表
  currentPage.value = 1
  loadPosts()
}

// 获取文章内容预览（优先使用后端返回的summary）
const getContentPreview = (content, summary) => {
  // 优先使用后端返回的智能摘要
  if (summary && summary.trim()) {
    return summary.length > 120 ? summary.substring(0, 120) + '...' : summary
  }

  // 降级方案：客户端解析Editor.js内容
  if (!content) return '暂无内容'

  try {
    // 尝试解析 Editor.js JSON 格式
    const editorData = JSON.parse(content)
    if (editorData.blocks && Array.isArray(editorData.blocks)) {
      const previewParts = []

      editorData.blocks.forEach((block) => {
        switch (block.type) {
          case 'paragraph':
            if (block.data.text) {
              const cleanText = block.data.text.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(cleanText)
              }
            }
            break

          case 'header':
            if (block.data.text) {
              const cleanText = block.data.text.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(cleanText)
              }
            }
            break

          case 'list':
            if (block.data.items && block.data.items.length > 0) {
              const listItems = block.data.items
                .map((item) => {
                  if (typeof item === 'object' && item.content) {
                    return item.content.replace(/<[^>]*>/g, '')
                  } else if (typeof item === 'string') {
                    return item.replace(/<[^>]*>/g, '')
                  }
                  return ''
                })
                .filter((item) => item.trim())
                .join(' ')
              if (listItems) {
                previewParts.push(listItems)
              }
            }
            break

          case 'quote':
            if (block.data.text) {
              const cleanText = block.data.text.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(`"${cleanText}"`)
              }
            }
            break

          case 'image':
            previewParts.push('[图片]')
            if (block.data.caption) {
              const cleanCaption = block.data.caption.replace(/<[^>]*>/g, '')
              if (cleanCaption.trim()) {
                previewParts.push(cleanCaption)
              }
            }
            break

          case 'table':
            previewParts.push('[表格]')
            break

          case 'code':
            previewParts.push('[代码]')
            if (block.data.caption) {
              const cleanCaption = block.data.caption.replace(/<[^>]*>/g, '')
              if (cleanCaption.trim()) {
                previewParts.push(cleanCaption)
              }
            }
            break

          case 'delimiter':
            previewParts.push('---')
            break

          case 'embed':
            if (block.data.service) {
              previewParts.push(`[${block.data.service}嵌入]`)
            } else {
              previewParts.push('[嵌入内容]')
            }
            break

          case 'linkTool':
            if (block.data.meta && block.data.meta.title) {
              previewParts.push(`[链接: ${block.data.meta.title}]`)
            } else {
              previewParts.push('[链接]')
            }
            break

          case 'warning':
          case 'alert':
            previewParts.push('[警告]')
            if (block.data.message || block.data.text) {
              const warningText = (
                block.data.message || block.data.text
              ).replace(/<[^>]*>/g, '')
              if (warningText.trim()) {
                previewParts.push(warningText)
              }
            }
            break

          case 'checklist':
            if (block.data.items && block.data.items.length > 0) {
              previewParts.push('[清单]')
              const checklistText = block.data.items
                .map((item) => item.text?.replace(/<[^>]*>/g, '') || '')
                .filter((text) => text.trim())
                .join(' ')
              if (checklistText) {
                previewParts.push(checklistText)
              }
            }
            break

          case 'raw':
            if (block.data.html) {
              const cleanText = block.data.html.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(cleanText)
              }
            }
            break

          case 'marker':
          case 'inlineCode':
            if (block.data.text) {
              const cleanText = block.data.text.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(cleanText)
              }
            }
            break

          default:
            // 对于未知的block类型，尝试提取text字段
            if (block.data && block.data.text) {
              const cleanText = block.data.text.replace(/<[^>]*>/g, '')
              if (cleanText.trim()) {
                previewParts.push(cleanText)
              }
            } else if (block.data && typeof block.data === 'object') {
              // 如果有其他文本字段，尝试提取
              const textFields = ['content', 'caption', 'title', 'description']
              for (const field of textFields) {
                if (
                  block.data[field] &&
                  typeof block.data[field] === 'string'
                ) {
                  const cleanText = block.data[field].replace(/<[^>]*>/g, '')
                  if (cleanText.trim()) {
                    previewParts.push(cleanText)
                    break
                  }
                }
              }
            }
            break
        }
      })

      if (previewParts.length > 0) {
        const fullText = previewParts.join(' ')
        return fullText.length > 120
          ? fullText.substring(0, 120) + '...'
          : fullText
      }
    }
  } catch (e) {
    // 如果不是JSON格式，按原HTML处理
    const textContent = content.replace(/<[^>]*>/g, '')
    return textContent.length > 120
      ? textContent.substring(0, 120) + '...'
      : textContent
  }

  return '暂无内容'
}
</script>

<template>
  <page-container title="博客广场">
    <template #extra>
      <div class="header-actions">
        <!-- 管理员标识-->
        <div v-if="isAdmin" class="admin-badge-bilibili">
          <el-icon class="crown-icon"><Star /></el-icon>
          <span class="admin-text">大会员</span>
        </div>

        <!-- 发帖按钮 -->
        <el-button type="primary" @click="createPost">
          <el-icon><EditPen /></el-icon>
          发布帖子
        </el-button>
      </div>
    </template>

    <!-- 内容区域 -->
    <div class="square-content" v-loading="loading">
      <!-- 空状态 -->
      <div v-if="posts.length === 0 && !loading" class="empty-state">
        <el-empty description="暂无帖子">
          <el-button type="primary" @click="createPost">
            发布第一个帖子
          </el-button>
        </el-empty>
      </div>

      <!-- 帖子列表 -->
      <div v-else class="posts-container">
        <div class="post-grid">
          <div
            v-for="post in posts"
            :key="post.id"
            class="post-card"
            @click="viewPost(post)"
          >
            <!-- 左侧封面图片 -->
            <div class="post-cover">
              <img
                :src="post.cover_img || '/src/assets/default.png'"
                :alt="post.title"
              />
            </div>

            <!-- 右侧帖子信息 -->
            <div class="post-content">
              <!-- 文章标题 -->
              <h3 class="post-title">{{ post.title }}</h3>

              <!-- 内容预览 -->
              <div class="post-summary">
                {{ getContentPreview(post.content, post.summary) }}
              </div>

              <!-- 底部区域 -->
              <div class="post-bottom">
                <!-- 统计信息 -->
                <div class="post-stats">
                  <span class="view-count">{{ post.like_count || 0 }}点赞</span>
                  <span class="comment-count">
                    {{ post.comment_count || 0 }}评论
                  </span>
                </div>

                <!-- 作者信息 -->
                <div class="post-author">
                  <el-avatar
                    :src="post.user_pic || '/src/assets/avatar.png'"
                    :size="24"
                  />
                  <span class="username">{{ post.username }}</span>
                  <span class="post-time">{{
                    formatRelativeTime(post.created_at)
                  }}</span>

                  <!-- 删除按钮（仅作者和管理员可见） -->
                  <el-button
                    v-if="isAdmin || post.user_id === userStore.user?.id"
                    @click.stop="handleDeletePost(post)"
                    type="danger"
                    text
                    size="small"
                    class="delete-btn-bottom"
                  >
                    <el-icon><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 分页 -->
        <div class="pagination-container">
          <el-pagination
            v-model:current-page="currentPage"
            :page-size="pageSize"
            :total="total"
            layout="prev, pager, next, jumper"
            @current-change="handlePageChange"
          />
        </div>
      </div>
    </div>

    <!-- 发帖组件 -->
    <PostEditor ref="postEditorRef" @success="handlePostSuccess" />
  </page-container>
</template>

<style lang="scss" scoped>
.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;

  .admin-badge-bilibili {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: linear-gradient(135deg, #ff6b9d 0%, #f093fb 50%, #ff85c1 100%);
    border-radius: 12px;
    color: white;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 2px 8px rgba(255, 107, 157, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.2);
    backdrop-filter: blur(10px);
    position: relative;
    overflow: hidden;

    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.3),
        transparent
      );
      transition: left 0.6s ease;
    }

    &:hover::before {
      left: 100%;
    }

    .crown-icon {
      font-size: 14px;
      color: #e9f267;
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
      animation: crown-glow 2s ease-in-out infinite alternate;
    }

    .admin-text {
      position: relative;
      z-index: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      letter-spacing: 0.5px;
    }
  }

  @keyframes crown-glow {
    0% {
      filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
    }
    100% {
      filter: drop-shadow(0 1px 4px rgba(255, 224, 102, 0.6))
        drop-shadow(0 0 8px rgba(255, 224, 102, 0.4));
    }
  }
}

.square-content {
  min-height: 400px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 400px;
}

.posts-container {
  display: flex;
  flex-direction: column;
  min-height: 600px; /* 确保容器有最小高度 */

  .post-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    margin-bottom: 24px;
    flex: 1; /* 让帖子网格占据剩余空间 */
  }

  .post-card {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;
    position: relative;
    display: flex;
    height: 150px;

    &:hover {
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
      transform: translateY(-2px);

      .post-content .post-bottom .post-author .delete-btn-bottom {
        opacity: 1;
      }
    }

    .post-cover {
      position: relative;
      width: 180px;
      height: 150px;
      flex-shrink: 0;
      overflow: hidden;

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transition: transform 0.3s ease;
      }

      &:hover {
        img {
          transform: scale(1.05);
        }
      }
    }

    .post-content {
      flex: 1;
      padding: 12px 16px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;

      .post-title {
        font-size: 15px;
        font-weight: 600;
        color: #303133;
        margin: 0 0 8px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
        max-height: 2.8em;
      }

      .post-summary {
        color: #606266;
        font-size: 13px;
        line-height: 1.5;
        margin-bottom: 12px;
        flex: 1;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .post-bottom {
        margin-top: auto;

        .post-stats {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-size: 12px;
          color: #909399;

          .view-count,
          .comment-count {
            position: relative;

            &::after {
              content: '·';
              margin-left: 8px;
            }

            &:last-child::after {
              display: none;
            }
          }
        }

        .post-author {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 12px;

          .username {
            color: #606266;
            font-weight: 500;
          }

          .post-time {
            color: #c0c4cc;
            margin-left: auto;
          }
          .delete-btn-bottom {
            margin-left: 8px;
            opacity: 0;
            transition: opacity 0.3s ease;
            color: #b75311 !important;
            padding: 4px;

            &:hover {
              color: #bb5555 !important;
              background-color: rgba(245, 108, 108, 0.1) !important;
            }
          }
        }
      }
    }
  }

  .pagination-container {
    display: flex;
    justify-content: center;
    padding: 30px 0;
  }

  /* 响应式布局 */
  @media (max-width: 768px) {
    .post-grid {
      grid-template-columns: 1fr;
      gap: 16px;
    }

    .post-card {
      height: auto;
      min-height: 120px;

      .post-cover {
        width: 120px;
        height: 120px;
      }

      .post-content {
        padding: 10px 12px;

        .post-title {
          font-size: 14px;
        }

        .post-summary {
          font-size: 12px;
          -webkit-line-clamp: 1;
          line-clamp: 1;
        }
      }
    }
  }

  @media (max-width: 1200px) and (min-width: 769px) {
    .post-grid {
      gap: 16px;
    }

    .post-card {
      height: 130px;

      .post-cover {
        width: 160px;
        height: 130px;
      }

      .post-content .post-title {
        font-size: 14px;
      }
    }
  }
}
</style>
