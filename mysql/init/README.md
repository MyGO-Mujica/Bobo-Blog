# MySQL 初始化脚本目录

此目录用于存放 MySQL 数据库的初始化 SQL 脚本。

## 使用方法

1. **放置初始化脚本**

   将你的数据库结构和初始数据 SQL 文件放入此目录，例如：

   ```
   mysql/init/
   ├── 01-schema.sql      # 建表语句
   ├── 02-seed-data.sql   # 初始数据
   └── ...
   ```

2. **自动执行**

   首次启动 `docker-compose up` 时，MySQL 容器会按**文件名字母顺序**自动执行此目录下的所有 `.sql` 和 `.sh` 文件。

3. **注意事项**
   - ⚠️ 初始化脚本**只在数据库首次创建时执行**，如果容器已运行过，需要删除数据卷后重新启动：
     ```bash
     docker-compose down -v
     docker-compose up -d
     ```
   - ✅ 脚本中不需要写 `USE my_db_01;`，环境变量 `MYSQL_DATABASE` 已自动选择数据库。
   - ✅ 推荐按数字前缀命名（`01-`、`02-` 等）确保执行顺序。

## 示例脚本

**01-schema.sql**

```sql
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 导出现有数据库

如果你已经有本地数据库，可以导出为 SQL 文件：

```bash
# 只导出结构
mysqldump -u root -p --no-data my_db_01 > mysql/init/01-schema.sql

# 导出结构和数据
mysqldump -u root -p my_db_01 > mysql/init/01-full-backup.sql
```
