-- ==========================================
-- Bobo-Blog 数据库初始化脚本
-- ==========================================

-- 用户表
CREATE TABLE IF NOT EXISTS `ev_users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL COMMENT '用户名',
  `password` varchar(255) NOT NULL COMMENT '密码（bcrypt加密）',
  `nickname` varchar(50) DEFAULT NULL COMMENT '昵称',
  `email` varchar(100) DEFAULT NULL COMMENT '邮箱',
  `user_pic` longtext COMMENT '头像（base64或URL）',
  `role` varchar(20) DEFAULT 'user' COMMENT '角色：user/admin',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='用户表';

-- 文章分类表
CREATE TABLE IF NOT EXISTS `ev_article_cate` (
  `id` int NOT NULL AUTO_INCREMENT,
  `cate_name` varchar(50) NOT NULL COMMENT '分类名称',
  `user_id` int DEFAULT NULL COMMENT '用户ID（NULL为公共分类）',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除：0-否，1-是',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `idx_deleted` (`is_deleted`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文章分类表';

-- 文章表
CREATE TABLE IF NOT EXISTS `ev_articles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` varchar(200) NOT NULL COMMENT '文章标题',
  `content` longtext NOT NULL COMMENT '文章内容（JSON格式，EditorJS）',
  `cover_img` longtext COMMENT '封面图（base64或URL）',
  `pub_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发布时间',
  `state` varchar(10) NOT NULL DEFAULT '草稿' COMMENT '状态：已发布/草稿',
  `cate_id` int DEFAULT NULL COMMENT '分类ID',
  `author_id` int NOT NULL COMMENT '作者ID',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除：0-否，1-是',
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `cate_id` (`cate_id`),
  KEY `author_id` (`author_id`),
  KEY `idx_state_deleted` (`state`, `is_deleted`),
  CONSTRAINT `ev_articles_ibfk_1` FOREIGN KEY (`cate_id`) REFERENCES `ev_article_cate` (`id`) ON DELETE SET NULL,
  CONSTRAINT `ev_articles_ibfk_2` FOREIGN KEY (`author_id`) REFERENCES `ev_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='文章表';

-- 广场帖子表
CREATE TABLE IF NOT EXISTS `square_posts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL COMMENT '发帖用户ID',
  `article_id` int DEFAULT NULL COMMENT '关联的文章ID（可选）',
  `title` varchar(200) NOT NULL COMMENT '帖子标题',
  `content` text NOT NULL COMMENT '帖子内容',
  `cover_img` longtext COMMENT '封面图（base64或URL）',
  `like_count` int DEFAULT '0' COMMENT '点赞数',
  `comment_count` int DEFAULT '0' COMMENT '评论数',
  `view_count` int DEFAULT '0' COMMENT '浏览数',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除：0-否，1-是',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `article_id` (`article_id`),
  KEY `idx_deleted_created` (`is_deleted`, `created_at`),
  CONSTRAINT `square_posts_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `ev_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `square_posts_ibfk_2` FOREIGN KEY (`article_id`) REFERENCES `ev_articles` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='广场帖子表';

-- 点赞表
CREATE TABLE IF NOT EXISTS `square_likes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL COMMENT '帖子ID',
  `user_id` int NOT NULL COMMENT '点赞用户ID',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_like` (`post_id`, `user_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `square_likes_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `square_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `square_likes_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `ev_users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='点赞表';

-- 评论表
CREATE TABLE IF NOT EXISTS `square_comments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `post_id` int NOT NULL COMMENT '帖子ID',
  `user_id` int NOT NULL COMMENT '评论用户ID',
  `parent_id` int DEFAULT NULL COMMENT '父评论ID（用于回复）',
  `content` text NOT NULL COMMENT '评论内容',
  `is_deleted` tinyint(1) DEFAULT '0' COMMENT '是否删除：0-否，1-是',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `post_id` (`post_id`),
  KEY `user_id` (`user_id`),
  KEY `parent_id` (`parent_id`),
  KEY `idx_deleted` (`is_deleted`),
  CONSTRAINT `square_comments_ibfk_1` FOREIGN KEY (`post_id`) REFERENCES `square_posts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `square_comments_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `ev_users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `square_comments_ibfk_3` FOREIGN KEY (`parent_id`) REFERENCES `square_comments` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='评论表';


