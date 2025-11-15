<script setup lang="ts">
import { ref } from 'vue'
import SurveysList from './surveys-list.vue'
import Videos from './videos.vue'
import Music from './music.vue'
import Students from './students.vue'
import Courses from './courses.vue'

const active = ref<'students' | 'videos' | 'music' | 'courses' | 'surveysList'>(
  'students'
)
const onSelect = (key: string) => {
  active.value = key as any
}
</script>

<template>
  <div class="admin">
    <div class="topbar">
      <div class="system-title">芳香疗愈体验管理系统</div>
    </div>
    <div class="layout">
      <aside class="sidebar">
        <div class="brand">后台管理</div>
        <el-menu class="sidebar-menu" :default-active="active" @select="onSelect">
          <el-menu-item index="students">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M5.121 17.804A7 7 0 0112 15a7 7 0 016.879 2.804" />
                <path d="M12 12a4 4 0 100-8 4 4 0 000 8" />
              </svg>
            </span>
            <span class="label">学员管理</span>
          </el-menu-item>
          <el-menu-item index="surveysList">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 6h16" />
                <path d="M4 12h16" />
                <path d="M4 18h16" />
              </svg>
            </span>
            <span class="label">问卷管理</span>
          </el-menu-item>
          <el-menu-item index="courses">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M4 7l8-3 8 3-8 3-8-3" />
                <path d="M4 12l8 3 8-3" />
                <path d="M4 17l8 3 8-3" />
              </svg>
            </span>
            <span class="label">课程管理</span>
          </el-menu-item>
          <el-menu-item index="videos">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="9" />
                <path d="M10 9l6 3-6 3V9" />
              </svg>
            </span>
            <span class="label">视频管理</span>
          </el-menu-item>
          <el-menu-item index="music">
            <span class="icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 4v9" />
                <path d="M12 5l8-2v9" />
                <circle cx="8" cy="17" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </span>
            <span class="label">音乐管理</span>
          </el-menu-item>
        </el-menu>
      </aside>
      <main class="content">
        <Students v-if="active === 'students'" />
        <SurveysList v-else-if="active === 'surveysList'" />
        <Videos v-else-if="active === 'videos'" />
        <Courses v-else-if="active === 'courses'" />
        <Music v-else-if="active === 'music'" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin {
  background: #f8fafc;
  --primary: #8b5cf6;
  --primary-hover: #7c3aed;
}
.topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  background: var(--primary);
  color: #fff;
  padding: 12px 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
}
.system-title {
  font-weight: 700;
  letter-spacing: 0.5px;
}
.layout {
  display: grid;
  grid-template-columns: 240px 1fr;
}
.sidebar {
  background: #fff;
  border-right: 1px solid #e5e7eb;
  padding: 16px;
  position: sticky;
  top: 48px;
  height: calc(100vh - 48px);
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.brand {
  font-weight: 700;
  color: #111827;
  padding: 8px 0;
}
.sidebar-menu { border-right: none; }
.sidebar-menu :deep(.el-menu-item) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  margin-bottom: 12px;
  background: #f3f4f6;
  color: #111827;
}
.sidebar-menu :deep(.el-menu-item.is-active) {
  background: var(--primary);
  color: #fff;
  border-color: var(--primary-hover);
  box-shadow: 0 6px 16px rgba(124, 58, 237, 0.28);
}
.sidebar-menu :deep(.el-menu-item .icon) { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
.sidebar-menu :deep(.el-menu-item .icon svg) { width: 18px; height: 18px; fill: none; stroke: #6b7280; stroke-width: 1.6; }
.sidebar-menu :deep(.el-menu-item.is-active .icon svg) { stroke: #fff; }
.sidebar-menu :deep(.el-menu-item .label) { flex: 1; font-weight: 600; }
.content {
  padding: 16px;
  position: relative;
}
@media (max-width: 960px) {
  .layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    height: auto;
    border-right: none;
    top: 0;
  }
  .menu {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
