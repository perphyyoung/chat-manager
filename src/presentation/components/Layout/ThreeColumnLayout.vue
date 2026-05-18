<script setup lang="ts">
import DocumentList from '../Document/DocumentList.vue'
import ConversationView from '../Conversation/ConversationView.vue'
import QuestionList from '../Question/QuestionList.vue'
</script>

<template>
  <div class="three-column-layout">
    <aside class="left-panel">
      <DocumentList />
    </aside>
    <main class="center-panel">
      <ConversationView />
    </main>
    <aside class="right-panel">
      <QuestionList />
    </aside>
  </div>
</template>

<style scoped>
.three-column-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.left-panel {
  width: 280px;
  min-width: 280px;
  border-right: 1px solid var(--color-border);
  overflow-y: auto;
}

.center-panel {
  flex: 1;
  overflow-y: auto;
  min-width: 400px;
}

.right-panel {
  width: 280px;
  min-width: 280px;
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
}

@media (max-width: 1024px) {
  .left-panel,
  .right-panel {
    width: 200px;
    min-width: 200px;
  }
}

@media (max-width: 768px) {
  .three-column-layout {
    flex-direction: column;
  }

  .left-panel,
  .right-panel {
    width: 100%;
    min-width: 100%;
    height: 30vh;
    border-right: none;
    border-left: none;
    border-bottom: 1px solid var(--color-border);
  }

  .center-panel {
    min-width: 100%;
  }
}
</style>
