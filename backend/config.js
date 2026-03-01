// 这是一个全局的配置文件

module.exports = {
  // 加密和解密 Token 的秘钥（生产环境请在 .env 中设置 JWT_SECRET）
  jwtSecretKey: process.env.JWT_SECRET || "MyGO!!!!! ^_^",
  // token 的有效期
  expiresIn: "10h",
};
