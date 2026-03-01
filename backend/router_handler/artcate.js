// 这是路由处理函数模块

// 导入数据库操作模块
const db = require("../db/index");

// 获取文章分类列表的处理函数（只查当前用户的分类）
exports.getArtCates = (req, res) => {
  const sql = `select * from ev_article_cate where is_deleted=0 and user_id=? order by id asc`;
  db.query(sql, req.user.id, (err, results) => {
    if (err) return res.cc(err);
    res.send({
      status: 0,
      message: "获取文章分类数据成功！",
      data: results,
    });
  });
};

// 新增文章分类的处理函数（带user_id）
exports.addArticleCates = (req, res) => {
  // 查重：同一用户下分类名不能重复
  const sql = `select * from ev_article_cate where cate_name=? and user_id=?`;
  db.query(sql, [req.body.cate_name, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length > 0) return res.cc("分类名称被占用，请更换后重试！");
    // 插入分类
    const sql = `insert into ev_article_cate (cate_name, user_id) values (?, ?)`;
    db.query(sql, [req.body.cate_name, req.user.id], (err, results) => {
      if (err) return res.cc(err);
      if (results.affectedRows !== 1) return res.cc("新增文章分类失败！");
      res.cc("新增文章分类成功！", 0);
    });
  });
};

// 删除文章分类的处理函数（加user_id）
exports.deleteCateById = (req, res) => {
  const sql = `update ev_article_cate set is_deleted=1 where id=? and user_id=?`;
  db.query(sql, [req.query.id, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.affectedRows !== 1) return res.cc("删除文章分类失败！");
    res.cc("删除文章分类成功！", 0);
  });
};

// 根据 Id 获取文章分类的处理函数（加user_id）
exports.getArtCateById = (req, res) => {
  const sql = `select * from ev_article_cate where id=? and user_id=?`;
  db.query(sql, [req.params.id, req.user.id], (err, results) => {
    if (err) return res.cc(err);
    if (results.length !== 1) return res.cc("获取文章分类数据失败！");
    res.send({
      status: 0,
      message: "获取文章分类数据成功！",
      data: results[0],
    });
  });
};

// 根据 Id 更新文章分类的处理函数（加user_id）
exports.updateCateById = (req, res) => {
  // 查重：同一用户下分类名不能重复，排除自己
  const sql = `select * from ev_article_cate where id<>? and cate_name=? and user_id=?`;
  db.query(
    sql,
    [req.body.id, req.body.cate_name, req.user.id],
    (err, results) => {
      if (err) return res.cc(err);
      if (results.length > 0) return res.cc("分类名称被占用，请更换后重试！");
      // 更新分类
      const sql = `update ev_article_cate set cate_name=? where id=? and user_id=?`;
      db.query(
        sql,
        [req.body.cate_name, req.body.id, req.user.id],
        (err, results) => {
          if (err) return res.cc(err);
          if (results.affectedRows !== 1) return res.cc("更新文章分类失败！");
          res.cc("更新文章分类成功！", 0);
        },
      );
    },
  );
};
