// 权限校验中间件

// 检查是否为管理员
exports.requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.cc('需要管理员权限！', 1)
  }
  next()
}

// 检查是否为指定角色
exports.requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== requiredRole) {
      return res.cc(`需要${requiredRole}权限！`, 1)
    }
    next()
  }
}

// 检查是否为管理员或本人
exports.requireAdminOrSelf = (req, res, next) => {
  const targetUserId = req.params.id || req.body.id || req.query.id
  if (!req.user || (req.user.role !== 'admin' && req.user.id != targetUserId)) {
    return res.cc('权限不足！', 1)
  }
  next()
}
