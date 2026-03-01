import request from '@/utils/request'

// 帖子相关接口

// 发布帖子
export const createPost = ({ title, content, cover_img = '' }) =>
  request.post('/my/square/post', { title, content, cover_img })

// 获取帖子列表
export const getPostList = ({ page = 1, pageSize = 10 } = {}) =>
  request.get('/my/square/posts', { params: { page, pageSize } })

// 获取帖子详情
export const getPostDetail = (id) => request.get(`/my/square/post/${id}`)

// 删除帖子
export const deletePost = (id) => request.post('/my/square/post/delete', { id })

// 点赞相关接口

// 点赞帖子
export const likePost = (postId) =>
  request.post('/my/square/like', { post_id: postId })

// 取消点赞
export const unlikePost = (postId) =>
  request.post('/my/square/unlike', { post_id: postId })

// 评论相关接口

// 添加评论
export const addComment = ({ postId, content, parentId = null }) => {
  const params = {
    post_id: postId,
    content
  }

  // 只有当 parentId 存在且为数字时才添加 parent_id 字段
  if (parentId !== null && parentId !== undefined) {
    params.parent_id = parentId
  }

  return request.post('/my/square/comment', params)
}

// 获取评论列表
export const getCommentList = (postId) =>
  request.get(`/my/square/comments/${postId}`)

// 删除评论
export const deleteComment = (id) =>
  request.post('/my/square/comment/delete', { id })
