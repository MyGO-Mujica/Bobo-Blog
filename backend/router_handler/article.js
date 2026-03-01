// 文章的处理函数模块
const path = require("path");
const db = require("../db/index");

// 验证 Editor.js 内容格式的辅助函数
const validateEditorContent = (content) => {
  try {
    const parsed = JSON.parse(content);
    // 检查是否是有效的 Editor.js 格式
    return parsed && Array.isArray(parsed.blocks);
  } catch (error) {
    return false;
  }
};

// 从 Editor.js 内容中提取纯文本用于搜索和摘要
const extractTextFromEditorContent = (content) => {
  try {
    const parsed = JSON.parse(content);
    if (!parsed.blocks) return "";

    let text = "";
    parsed.blocks.forEach((block) => {
      switch (block.type) {
        case "paragraph":
        case "header":
          if (block.data && block.data.text) {
            text += block.data.text.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        case "list":
          if (block.data && block.data.items) {
            block.data.items.forEach((item) => {
              if (typeof item === "string") {
                text += item.replace(/<[^>]*>/g, "") + " ";
              } else if (item.content) {
                text += item.content.replace(/<[^>]*>/g, "") + " ";
              }
            });
          }
          break;
        case "checklist":
          if (block.data && block.data.items) {
            block.data.items.forEach((item) => {
              if (item.text) {
                text += item.text.replace(/<[^>]*>/g, "") + " ";
              }
            });
          }
          break;
        case "quote":
          if (block.data) {
            if (block.data.text)
              text += block.data.text.replace(/<[^>]*>/g, "") + " ";
            if (block.data.caption)
              text += block.data.caption.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        case "warning":
          if (block.data) {
            if (block.data.title)
              text += block.data.title.replace(/<[^>]*>/g, "") + " ";
            if (block.data.message)
              text += block.data.message.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        case "code":
          if (block.data && block.data.code) {
            text += block.data.code + " ";
          }
          break;
        case "table":
          if (block.data && block.data.content) {
            block.data.content.forEach((row) => {
              if (Array.isArray(row)) {
                row.forEach((cell) => {
                  if (cell) text += cell.replace(/<[^>]*>/g, "") + " ";
                });
              }
            });
          }
          break;
        case "raw":
          if (block.data && block.data.html) {
            text += block.data.html.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        case "linkTool":
          if (block.data) {
            if (block.data.meta && block.data.meta.title) {
              text += block.data.meta.title.replace(/<[^>]*>/g, "") + " ";
            }
            if (block.data.meta && block.data.meta.description) {
              text += block.data.meta.description.replace(/<[^>]*>/g, "") + " ";
            }
          }
          break;
        case "embed":
          if (block.data && block.data.caption) {
            text += block.data.caption.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        case "image":
        case "simpleImage":
          if (block.data && block.data.caption) {
            text += block.data.caption.replace(/<[^>]*>/g, "") + " ";
          }
          break;
        // 其他类型的块默认不提取文本
      }
    });
    return text.trim();
  } catch (error) {
    return "";
  }
};

// 发布文章的处理函数
exports.addArticle = (req, res) => {
  if (!req.file || req.file.fieldname !== "cover_img")
    return res.cc("文章封面是必选参数！");

  // 验证内容格式
  if (!req.body.content) {
    return res.cc("文章内容不能为空！");
  }

  // 验证是否是有效的 Editor.js 格式
  if (!validateEditorContent(req.body.content)) {
    return res.cc("文章内容格式不正确！");
  }

  // 处理文章的信息对象
  const articleInfo = {
    title: req.body.title,
    content: req.body.content, // 直接存储 JSON 格式
    state: req.body.state,
    // 文章封面的存放路径
    cover_img: path.join("/uploads", req.file.filename),
    // 文章的发布时间
    pub_date: new Date(),
    // 文章作者的Id
    author_id: req.user.id,
  };

  // 如果有分类ID，则添加到文章信息中
  if (req.body.cate_id) {
    articleInfo.cate_id = req.body.cate_id;
  }

  const sql = `insert into ev_articles set ?`;
  db.query(sql, articleInfo, (err, results) => {
    if (err) return res.cc(err);
    if (results.affectedRows !== 1) return res.cc("发布新文章失败！");
    res.cc("发布文章成功！", 0);
  });
};

// 获取文章列表的处理函数
exports.getArticles = (req, res) => {
  const { pagenum = 1, pagesize = 10, cate_id, state } = req.query;

  // 构建SQL查询语句
  let sql = `select ev_articles.id, title, content, cover_img, pub_date, state, cate_name from ev_articles
    left join ev_article_cate on ev_articles.cate_id = ev_article_cate.id
    where ev_articles.author_id = ? and ev_articles.is_deleted = 0`;

  const params = [req.user.id];

  // 如果有分类ID参数且不为空
  if (cate_id && cate_id !== "" && cate_id !== "0") {
    sql += ` and ev_articles.cate_id = ?`;
    params.push(parseInt(cate_id));
  }

  // 如果有状态参数且不为空
  if (state && state !== "") {
    sql += ` and ev_articles.state = ?`;
    params.push(state);
  }

  // 添加排序和分页
  sql += ` order by ev_articles.id desc limit ?, ?`;
  const offset = (pagenum - 1) * pagesize;
  params.push(offset, parseInt(pagesize));

  db.query(sql, params, (err, results) => {
    if (err) return res.cc(err);

    // 处理文章列表，为每篇文章添加摘要和字数统计
    const processedResults = results.map((article) => {
      // 从 Editor.js 内容中提取文本摘要
      const textContent = extractTextFromEditorContent(article.content);
      const summary =
        textContent.length > 200
          ? textContent.substring(0, 200) + "..."
          : textContent;

      return {
        ...article,
        summary, // 添加摘要字段
        word_count: textContent.length, // 添加字数统计
      };
    });

    // 获取总记录数
    let countSql = `select count(*) as total from ev_articles where author_id = ? and is_deleted = 0`;
    const countParams = [req.user.id];

    if (cate_id && cate_id !== "" && cate_id !== "0") {
      countSql += ` and cate_id = ?`;
      countParams.push(parseInt(cate_id));
    }

    if (state && state !== "") {
      countSql += ` and state = ?`;
      countParams.push(state);
    }

    db.query(countSql, countParams, (err, countResults) => {
      if (err) return res.cc(err);

      res.send({
        status: 0,
        message: "获取文章列表成功！",
        data: processedResults,
        total: countResults[0].total,
      });
    });
  });
};

// 获取单个文章详情的处理函数
exports.getArticleById = (req, res) => {
  const { id } = req.query;

  // 构建SQL查询语句
  const sql = `select ev_articles.*, cate_name from ev_articles
    left join ev_article_cate on ev_articles.cate_id = ev_article_cate.id
    where ev_articles.id = ? and ev_articles.author_id = ? and ev_articles.is_deleted = 0`;

  db.query(sql, [id, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("获取文章详情失败！");

    const article = results[0];

    // 为文章详情添加额外信息
    const textContent = extractTextFromEditorContent(article.content);
    article.word_count = textContent.length;

    res.send({
      status: 0,
      message: "获取文章详情成功！",
      data: article,
    });
  });
};

// 更新文章的处理函数
exports.updateArticle = (req, res) => {
  const { id, title, cate_id, content, state } = req.body;

  // 验证内容格式
  if (content && !validateEditorContent(content)) {
    return res.cc("文章内容格式不正确！");
  }

  // 构建更新的数据对象
  const updateData = {
    title,
    content, // 直接存储 JSON 格式
    state,
  };

  // 如果有分类ID，则添加到更新数据中
  if (cate_id) {
    updateData.cate_id = cate_id;
  }

  // 如果有新的封面图片，则更新封面图片路径
  if (req.file) {
    updateData.cover_img = path.join("/uploads", req.file.filename);
  }

  // 构建更新SQL语句
  const sql = `update ev_articles set ? where id=? and author_id=? and is_deleted=0`;

  db.query(sql, [updateData, id, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.affectedRows !== 1) return res.cc("更新文章失败！");

    res.send({
      status: 0,
      message: "更新文章成功！",
    });
  });
};

// 删除文章的处理函数
exports.deleteArticle = (req, res) => {
  const { id } = req.query;

  // 标记删除文章（软删除）
  const sql = `update ev_articles set is_deleted=1 where id=? and author_id=?`;

  db.query(sql, [id, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.affectedRows !== 1) return res.cc("删除文章失败！");

    res.send({
      status: 0,
      message: "删除文章成功！",
    });
  });
};

// 搜索文章的处理函数
exports.searchArticles = (req, res) => {
  const { keyword, pagenum = 1, pagesize = 10, cate_id, state } = req.query;

  if (!keyword || keyword.trim() === "") {
    return res.cc("搜索关键词不能为空！");
  }

  // 构建搜索SQL查询语句
  let sql = `select ev_articles.id, title, content, cover_img, pub_date, state, cate_name from ev_articles
    left join ev_article_cate on ev_articles.cate_id = ev_article_cate.id
    where ev_articles.author_id = ? and ev_articles.is_deleted = 0 and title like ?`;

  const searchKeyword = `%${keyword}%`;
  const params = [req.user.id, searchKeyword];

  // 如果有分类ID参数且不为空
  if (cate_id && cate_id !== "" && cate_id !== "0") {
    sql += ` and ev_articles.cate_id = ?`;
    params.push(parseInt(cate_id));
  }

  // 如果有状态参数且不为空
  if (state && state !== "") {
    sql += ` and ev_articles.state = ?`;
    params.push(state);
  }

  // 添加排序和分页
  sql += ` order by ev_articles.id desc limit ?, ?`;
  const offset = (pagenum - 1) * pagesize;
  params.push(offset, parseInt(pagesize));

  db.query(sql, params, (err, results) => {
    if (err) return res.cc(err);

    // 处理搜索结果，添加内容匹配高亮和摘要
    const processedResults = results.map((article) => {
      const textContent = extractTextFromEditorContent(article.content);

      // 检查内容中是否包含关键词（不区分大小写）
      const contentMatches = textContent
        .toLowerCase()
        .includes(keyword.toLowerCase());

      // 生成摘要，如果内容中有关键词，优先显示包含关键词的部分
      let summary = "";
      if (contentMatches) {
        const keywordIndex = textContent
          .toLowerCase()
          .indexOf(keyword.toLowerCase());
        const start = Math.max(0, keywordIndex - 100);
        const end = Math.min(textContent.length, keywordIndex + 100);
        summary = textContent.substring(start, end);
        if (start > 0) summary = "..." + summary;
        if (end < textContent.length) summary = summary + "...";
      } else {
        summary =
          textContent.length > 200
            ? textContent.substring(0, 200) + "..."
            : textContent;
      }

      return {
        ...article,
        summary,
        word_count: textContent.length,
        content_matches: contentMatches, // 标记内容是否匹配
      };
    });

    // 获取搜索结果总数
    let countSql = `select count(*) as total from ev_articles
      left join ev_article_cate on ev_articles.cate_id = ev_article_cate.id
      where ev_articles.author_id = ? and ev_articles.is_deleted = 0 and title like ?`;

    const countParams = [req.user.id, searchKeyword];

    if (cate_id && cate_id !== "" && cate_id !== "0") {
      countSql += ` and ev_articles.cate_id = ?`;
      countParams.push(parseInt(cate_id));
    }

    if (state && state !== "") {
      countSql += ` and ev_articles.state = ?`;
      countParams.push(state);
    }

    db.query(countSql, countParams, (err, countResults) => {
      if (err) return res.cc(err);

      res.send({
        status: 0,
        message: "搜索文章成功！",
        data: processedResults,
        total: countResults[0].total,
        keyword: keyword,
      });
    });
  });
};

// 图片上传处理函数
exports.uploadImage = (req, res) => {
  if (!req.file) {
    return res.cc("请选择要上传的图片！");
  }

  // 验证文件类型
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.cc("只支持 JPG、PNG、GIF、WEBP 格式的图片！");
  }

  // 验证文件大小（5MB）
  if (req.file.size > 5 * 1024 * 1024) {
    return res.cc("图片大小不能超过 5MB！");
  }

  const imageUrl = path.join("/uploads", req.file.filename);

  res.send({
    status: 0,
    message: "图片上传成功！",
    data: {
      url: imageUrl,
    },
  });
};
