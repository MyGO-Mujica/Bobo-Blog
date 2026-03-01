<script setup>
import {
  Collection,
  SetUp,
  UserFilled,
  User,
  Crop,
  EditPen,
  SwitchButton,
  CaretBottom,
  Orange,
  MessageBox,
  Expand,
  Fold
} from '@element-plus/icons-vue'
import avatar from '@/assets/avatar.png'
import { useUserStore } from '@/stores'
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
const userStore = useUserStore()
const router = useRouter()
const isCollapsed = ref(false)

onMounted(() => {
  userStore.getUser()
})

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const handleCommand = async (key) => {
  if (key === 'logout') {
    // 退出操作
    await ElMessageBox.confirm('你确认要进行退出么', '温馨提示', {
      type: 'warning',
      confirmButtonText: '确认',
      cancelButtonText: '取消'
    })

    // 清除本地的数据 (token + user信息)
    userStore.removeToken()
    userStore.setUser({})
    router.push('/login')
  } else {
    // 跳转操作
    router.push(`/user/${key}`)
  }
}
</script>

<template>
  <!-- 
    el-menu 整个菜单组件
      :default-active="$route.path"  配置默认高亮的菜单项
      router  router选项开启，el-menu-item 的 index 就是点击跳转的路径

    el-menu-item 菜单项
      index="/article/channel" 配置的是访问的跳转路径，配合default-active的值，实现高亮
  -->
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '200px'">
      <div class="el-aside__title" v-show="!isCollapsed">博博の客</div>
      <div class="el-aside__logo" v-show="!isCollapsed"></div>
      <div class="collapse-btn-container">
        <el-tooltip
          v-if="isCollapsed"
          :content="isCollapsed ? '展开菜单' : '收起菜单'"
          placement="right"
        >
          <el-button
            class="collapse-btn"
            @click="toggleCollapse"
            :icon="isCollapsed ? Expand : Fold"
            circle
            size="small"
            :aria-label="isCollapsed ? '展开菜单' : '收起菜单'"
            aria-describedby="sidebar-toggle-help"
          />
        </el-tooltip>
        <el-button
          v-else
          class="collapse-btn"
          @click="toggleCollapse"
          :icon="isCollapsed ? Expand : Fold"
          circle
          size="small"
          :aria-label="isCollapsed ? '展开菜单' : '收起菜单'"
          aria-describedby="sidebar-toggle-help"
        />
      </div>
      <el-menu
        active-text-color="#72a4fa"
        background-color="#232323"
        :default-active="$route.path"
        text-color="#fff"
        router
        :collapse="isCollapsed"
        :collapse-transition="true"
        unique-opened
        class="sidebar-menu"
      >
        <el-tooltip v-if="isCollapsed" content="首页" placement="right">
          <el-menu-item index="/home" aria-label="首页导航">
            <el-icon><Orange /></el-icon>
            <template #title>首页</template>
          </el-menu-item>
        </el-tooltip>
        <el-menu-item v-else index="/home" aria-label="首页导航">
          <el-icon><Orange /></el-icon>
          <template #title>首页</template>
        </el-menu-item>

        <el-tooltip v-if="isCollapsed" content="文章分类" placement="right">
          <el-menu-item index="/article/channel" aria-label="文章分类管理">
            <el-icon><Collection /></el-icon>
            <template #title>文章分类</template>
          </el-menu-item>
        </el-tooltip>
        <el-menu-item v-else index="/article/channel" aria-label="文章分类管理">
          <el-icon><Collection /></el-icon>
          <template #title>文章分类</template>
        </el-menu-item>

        <el-tooltip v-if="isCollapsed" content="文章管理" placement="right">
          <el-menu-item index="/article/manage" aria-label="文章管理">
            <el-icon><SetUp /></el-icon>
            <template #title>文章管理</template>
          </el-menu-item>
        </el-tooltip>
        <el-menu-item v-else index="/article/manage" aria-label="文章管理">
          <el-icon><SetUp /></el-icon>
          <template #title>文章管理</template>
        </el-menu-item>

        <el-tooltip v-if="isCollapsed" content="博客广场" placement="right">
          <el-menu-item index="/square" aria-label="博客广场">
            <el-icon><MessageBox /></el-icon>
            <template #title>博客广场</template>
          </el-menu-item>
        </el-tooltip>
        <el-menu-item v-else index="/square" aria-label="博客广场">
          <el-icon><MessageBox /></el-icon>
          <template #title>博客广场</template>
        </el-menu-item>

        <el-tooltip v-if="isCollapsed" content="个人中心" placement="right">
          <el-sub-menu index="/user" aria-label="个人中心菜单">
            <template #title>
              <el-icon><UserFilled /></el-icon>
              <span>个人中心</span>
            </template>
            <el-menu-item index="/user/profile" aria-label="基本资料">
              <el-icon><User /></el-icon>
              <template #title>基本资料</template>
            </el-menu-item>
            <el-menu-item index="/user/avatar" aria-label="更换头像">
              <el-icon><Crop /></el-icon>
              <template #title>更换头像</template>
            </el-menu-item>
            <el-menu-item index="/user/password" aria-label="重置密码">
              <el-icon><EditPen /></el-icon>
              <template #title>重置密码</template>
            </el-menu-item>
          </el-sub-menu>
        </el-tooltip>
        <el-sub-menu v-else index="/user" aria-label="个人中心菜单">
          <template #title>
            <el-icon><UserFilled /></el-icon>
            <span>个人中心</span>
          </template>
          <el-menu-item index="/user/profile" aria-label="基本资料">
            <el-icon><User /></el-icon>
            <template #title>基本资料</template>
          </el-menu-item>
          <el-menu-item index="/user/avatar" aria-label="更换头像">
            <el-icon><Crop /></el-icon>
            <template #title>更换头像</template>
          </el-menu-item>
          <el-menu-item index="/user/password" aria-label="重置密码">
            <el-icon><EditPen /></el-icon>
            <template #title>重置密码</template>
          </el-menu-item>
        </el-sub-menu>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header>
        <div class="header-left">
          <span>
            迷途之子：<strong>{{
              userStore.user.nickname || userStore.user.username
            }}</strong>
          </span>
        </div>
        <el-dropdown placement="bottom-end" @command="handleCommand">
          <!-- 展示给用户，默认看到的 -->
          <span class="el-dropdown__box">
            <el-avatar :src="userStore.user.user_pic || avatar" />
            <el-icon><CaretBottom /></el-icon>
          </span>

          <!-- 折叠的下拉部分 -->
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="profile" :icon="User"
                >基本资料</el-dropdown-item
              >
              <el-dropdown-item command="avatar" :icon="Crop"
                >更换头像</el-dropdown-item
              >
              <el-dropdown-item command="password" :icon="EditPen"
                >重置密码</el-dropdown-item
              >
              <el-dropdown-item command="logout" :icon="SwitchButton"
                >退出登录</el-dropdown-item
              >
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </el-header>
      <el-main>
        <router-view></router-view>
      </el-main>
      <el-footer>奇迹与魔法，都是存在的</el-footer>
    </el-container>
  </el-container>
</template>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;

  .el-aside {
    background-color: #171717;
    position: relative;
    transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.1);
    overflow: hidden;

    .collapse-btn-container {
      display: flex;
      justify-content: flex-start;
      padding: 10px 0 10px 19px;

      .collapse-btn {
        background-color: rgba(255, 255, 255, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        color: #fff;
        transition: all 0.3s ease;

        &:hover {
          transform: scale(1.05);
          background-color: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.3);
        }

        &:focus {
          outline: 2px solid #72a4fa;
          outline-offset: 2px;
        }
      }
    }

    &__title {
      font-family: 'Zhi Mang Xing', 'Microsoft YaHei', serif;
      color: #fff;
      text-align: center;
      font-size: 26px;
      font-weight: 400;
      letter-spacing: 2px;
      margin-top: 15px;
      margin-bottom: 5px;
      padding: 0 10px;
      overflow: hidden;
      white-space: nowrap;
    }
    &__logo {
      height: 120px;
      background: url('@/assets/小圆白logo.png') no-repeat center / 120px auto;
      margin-bottom: -22px;
    }

    .sidebar-menu {
      border-right: none;
      background-color: #151515;

      &:not(.el-menu--collapse) {
        width: 200px;
        min-height: 400px;
      }

      // 移除多余的transition，让Element Plus处理
      .el-menu-item,
      .el-sub-menu__title {
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      // 工具提示样式优化
      .el-tooltip__trigger {
        width: 100%;
      }
    }

    // 简化hover效果，移除transform避免动画冲突
    .el-menu-item:hover {
      background-color: #282727;
      transform: translateX(3px);
    }

    .el-menu-item.is-active {
      color: #72a4fa;
      background-color: rgba(114, 164, 250, 0.1);
      border-right: 3.5px solid #72a4fa;
    }

    .el-sub-menu__title:hover {
      background-color: #282727;
      transform: translateX(3px);
    }

    .el-sub-menu.is-active .el-sub-menu__title {
      color: #72a4fa !important;
    }
  }
  .el-header {
    background-color: #fff;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .header-left {
      display: flex;
      align-items: center;
      gap: 12px;

      span {
        font-family: 'ZCOOL XiaoWei', 'Microsoft YaHei', serif;
        font-size: 24px;

        strong {
          font-family: 'Pacifico', 'Zhi Mang Xing', cursive, sans-serif;
          font-size: 19px;
          margin-left: 4px;
          letter-spacing: 1.5px;
        }
      }
    }
    .el-dropdown__box {
      display: flex;
      align-items: center;

      &:active,
      &:focus {
        outline: none;
      }
    }
  }
  .el-footer {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    height: 40px;
    color: #4d4c4c;
    font-family: 'ZCOOL XiaoWei', cursive, sans-serif;
    letter-spacing: 2px;
  }
}
</style>
