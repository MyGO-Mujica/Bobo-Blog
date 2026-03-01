// 导入数据库操作模块
const db = require("../db/index");

// 发布帖子的处理函数
exports.publishPost = (req, res) => {
  const { article_id, title, content, cover_img } = req.body;
  const user_id = req.user.id;

  // 定义插入帖子的 SQL 语句
  const sql = `INSERT INTO square_posts (user_id, article_id, title, content, cover_img) VALUES (?, ?, ?, ?, ?)`;

  db.query(
    sql,
    [user_id, article_id || null, title, content, cover_img],
    (err, results) => {
      if (err) return res.cc(err);
      if (results.affectedRows !== 1) return res.cc("发布帖子失败！");

      res.send({
        status: 0,
        message: "发布帖子成功！",
        data: { post_id: results.insertId },
      });
    },
  );
};

// 获取帖子列表的处理函数
exports.getPostList = (req, res) => {
  const { page = 1, pageSize = 10 } = req.query;
  const offset = (page - 1) * pageSize;

  // 先查总数
  const countSql =
    "SELECT COUNT(*) as total FROM square_posts WHERE is_deleted = 0";
  db.query(countSql, (err, countResults) => {
    if (err) return res.cc(err);
    const total = countResults[0].total;
    const totalPages = Math.ceil(total / pageSize);

    // 查询帖子列表，关联用户信息，包括点赞状态
    const sql = `
      SELECT 
        p.id, p.user_id, p.article_id, p.title, p.content, p.cover_img, 
        p.created_at, p.like_count, p.comment_count,
        u.username, u.nickname, u.user_pic, u.role,
        CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
      FROM square_posts p
      LEFT JOIN ev_users u ON p.user_id = u.id
      LEFT JOIN square_likes l ON p.id = l.post_id AND l.user_id = ?
      WHERE p.is_deleted = 0
      ORDER BY p.created_at DESC
      LIMIT ? OFFSET ?
    `;
    db.query(sql, [req.user.id, parseInt(pageSize), offset], (err, results) => {
      if (err) return res.cc(err);
      res.send({
        status: 0,
        message: "获取帖子列表成功！",
        data: {
          posts: results,
          total,
          currentPage: Number(page),
          pageSize: Number(pageSize),
          totalPages,
        },
      });
    });
  });
};

// 获取单个帖子详情的处理函数
exports.getPostDetail = (req, res) => {
  const postId = req.params.id;

  const sql = `
    SELECT 
      p.id, p.user_id, p.article_id, p.title, p.content, p.cover_img, 
      p.created_at, p.like_count, p.comment_count,
      u.username, u.nickname, u.user_pic, u.role,
      CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
    FROM square_posts p
    LEFT JOIN ev_users u ON p.user_id = u.id
    LEFT JOIN square_likes l ON p.id = l.post_id AND l.user_id = ?
    WHERE p.id = ? AND p.is_deleted = 0
  `;

  db.query(sql, [req.user.id, postId], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("帖子不存在！");

    res.send({
      status: 0,
      message: "获取帖子详情成功！",
      data: results[0],
    });
  });
};

// 删除帖子的处理函数（软删除）
exports.deletePost = (req, res) => {
  const postId = req.body.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 先查询帖子是否存在且有权限删除
  const checkSql =
    "SELECT user_id FROM square_posts WHERE id = ? AND is_deleted = 0";
  db.query(checkSql, [postId], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("帖子不存在！");

    // 只有作者本人或管理员可以删除
    if (results[0].user_id !== userId && userRole !== "admin") {
      return res.cc("无权删除该帖子！");
    }

    // 执行软删除
    const deleteSql = "UPDATE square_posts SET is_deleted = 1 WHERE id = ?";
    db.query(deleteSql, [postId], (err, results) => {
      if (err) return res.cc(err);
      if (results.affectedRows !== 1) return res.cc("删除帖子失败！");

      res.cc("删除帖子成功！", 0);
    });
  });
};

// 点赞帖子的处理函数
exports.likePost = (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user.id;

  // 先检查是否已经点赞
  const checkSql =
    "SELECT id FROM square_likes WHERE post_id = ? AND user_id = ?";
  db.query(checkSql, [post_id, user_id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length > 0) return res.cc("已经点赞过了！");

    // 插入点赞记录
    const insertSql =
      "INSERT INTO square_likes (post_id, user_id) VALUES (?, ?)";
    db.query(insertSql, [post_id, user_id], (err, results) => {
      if (err) return res.cc(err);

      // 更新帖子点赞数
      const updateSql =
        "UPDATE square_posts SET like_count = like_count + 1 WHERE id = ?";
      db.query(updateSql, [post_id], (err, results) => {
        if (err) {
          // 如果更新失败，删除刚插入的点赞记录
          const deleteSql =
            "DELETE FROM square_likes WHERE post_id = ? AND user_id = ?";
          db.query(deleteSql, [post_id, user_id], () => {
            return res.cc("点赞失败，请重试！");
          });
          return;
        }
        res.cc("点赞成功！", 0);
      });
    });
  });
};

// 取消点赞的处理函数
exports.unlikePost = (req, res) => {
  const { post_id } = req.body;
  const user_id = req.user.id;

  // 先检查是否已经点赞
  const checkSql =
    "SELECT id FROM square_likes WHERE post_id = ? AND user_id = ?";
  db.query(checkSql, [post_id, user_id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length === 0) return res.cc("还没有点赞过！");

    // 删除点赞记录
    const deleteSql =
      "DELETE FROM square_likes WHERE post_id = ? AND user_id = ?";
    db.query(deleteSql, [post_id, user_id], (err, results) => {
      if (err) return res.cc(err);

      // 更新帖子点赞数
      const updateSql =
        "UPDATE square_posts SET like_count = like_count - 1 WHERE id = ?";
      db.query(updateSql, [post_id], (err, results) => {
        if (err) {
          // 如果更新失败，重新插入点赞记录
          const insertSql =
            "INSERT INTO square_likes (post_id, user_id) VALUES (?, ?)";
          db.query(insertSql, [post_id, user_id], () => {
            return res.cc("取消点赞失败，请重试！");
          });
          return;
        }
        res.cc("取消点赞成功！", 0);
      });
    });
  });
};

// 添加评论的处理函数
exports.addComment = (req, res) => {
  const { post_id, parent_id = null, content } = req.body;
  const user_id = req.user.id;

  // 插入评论
  const insertSql =
    "INSERT INTO square_comments (post_id, user_id, parent_id, content) VALUES (?, ?, ?, ?)";
  db.query(
    insertSql,
    [post_id, user_id, parent_id, content],
    (err, results) => {
      if (err) return res.cc(err);

      // 更新帖子评论数
      const updateSql =
        "UPDATE square_posts SET comment_count = comment_count + 1 WHERE id = ?";
      db.query(updateSql, [post_id], (err, updateResults) => {
        if (err) {
          // 如果更新失败，删除刚插入的评论
          const deleteSql = "DELETE FROM square_comments WHERE id = ?";
          db.query(deleteSql, [results.insertId], () => {
            return res.cc("评论失败，请重试！");
          });
          return;
        }

        res.send({
          status: 0,
          message: "评论成功！",
          data: { comment_id: results.insertId },
        });
      });
    },
  );
};

// 获取帖子评论列表的处理函数
exports.getComments = (req, res) => {
  const postId = req.params.postId;

  // 查询评论，关联用户信息
  const sql = `
    SELECT 
      c.id, c.post_id, c.user_id, c.parent_id, c.content, c.created_at,
      u.username, u.nickname, u.user_pic, u.role
    FROM square_comments c
    LEFT JOIN ev_users u ON c.user_id = u.id
    WHERE c.post_id = ?
    ORDER BY c.created_at ASC
  `;

  db.query(sql, [postId], (err, results) => {
    if (err) return res.cc(err);

    // 构建树形结构的评论数据
    const comments = buildCommentTree(results);

    res.send({
      status: 0,
      message: "获取评论成功！",
      data: comments,
    });
  });
};

// 删除评论的处理函数
exports.deleteComment = (req, res) => {
  const commentId = req.body.id;
  const userId = req.user.id;
  const userRole = req.user.role;

  // 查询评论信息，判断权限
  const sql = "SELECT user_id, post_id FROM square_comments WHERE id = ?";
  db.query(sql, [commentId], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("评论不存在！");

    const comment = results[0];
    if (comment.user_id !== userId && userRole !== "admin") {
      return res.cc("无权删除该评论！");
    }

    // 使用更可靠的方法：删除后重新统计整个帖子的评论数
    deleteCommentAndRecalculate(comment, commentId, res);
  });
};

// 执行删除评论并更新计数的辅助函数
function deleteCommentWithCount(comment, commentId, deleteCount, res) {
  // 删除评论（会级联删除子评论）
  const deleteSql = "DELETE FROM square_comments WHERE id = ?";
  db.query(deleteSql, [commentId], (err, deleteResults) => {
    if (err) return res.cc(err);

    // 更新帖子评论数，减去实际删除的评论数量
    const updateSql =
      "UPDATE square_posts SET comment_count = comment_count - ? WHERE id = ?";
    db.query(
      updateSql,
      [deleteCount, comment.post_id],
      (err, updateResults) => {
        if (err) {
          // 如果更新失败，暂时忽略（评论已删除，数量可能不完全准确）
          console.warn("更新评论数失败:", err);
        }
        res.cc("删除评论成功！", 0);
      },
    );
  });
}

// 删除评论后重新计算整个帖子的评论数的辅助函数
function deleteCommentAndRecalculate(comment, commentId, res) {
  // 删除评论（会级联删除子评论）
  const deleteSql = "DELETE FROM square_comments WHERE id = ?";
  db.query(deleteSql, [commentId], (err, deleteResults) => {
    if (err) return res.cc(err);

    // 重新统计该帖子的实际评论数
    const recalculateSql =
      "SELECT COUNT(*) as actual_count FROM square_comments WHERE post_id = ?";
    db.query(recalculateSql, [comment.post_id], (err, countResults) => {
      if (err) {
        console.warn("重新统计评论数失败:", err);
        return res.cc("删除评论成功！", 0);
      }

      // 更新为实际的评论数
      const updateSql =
        "UPDATE square_posts SET comment_count = ? WHERE id = ?";
      db.query(
        updateSql,
        [countResults[0].actual_count, comment.post_id],
        (err, updateResults) => {
          if (err) {
            console.warn("更新评论数失败:", err);
          }
          res.cc("删除评论成功！", 0);
        },
      );
    });
  });
}

// 构建评论树形结构的辅助函数
function buildCommentTree(comments) {
  const commentMap = new Map();
  const rootComments = [];

  // 先创建所有评论的映射
  comments.forEach((comment) => {
    comment.replies = [];
    commentMap.set(comment.id, comment);
  });

  // 构建树形结构
  comments.forEach((comment) => {
    if (comment.parent_id === null) {
      // 一级评论
      rootComments.push(comment);
    } else {
      // 回复评论
      const parentComment = commentMap.get(comment.parent_id);
      if (parentComment) {
        parentComment.replies.push(comment);
      }
    }
  });

  return rootComments;
}
