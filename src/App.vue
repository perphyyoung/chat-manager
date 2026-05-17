<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ThreeColumnLayout from './components/Layout/ThreeColumnLayout.vue'
import SettingsModal from './components/Settings/SettingsModal.vue'
import { useDocumentStore } from './stores/document'
import { useSettingsStore } from './stores/settings'
import { mockDocuments } from './data/mockData'

const documentStore = useDocumentStore()
const settingsStore = useSettingsStore()
const isSettingsOpen = ref(false)

function openSettings() {
  isSettingsOpen.value = true
}

onMounted(() => {
  documentStore.initDocuments(mockDocuments)
  settingsStore.init()

  window.electronAPI?.onOpenSettings(openSettings)
})
</script>

<template>
  <ThreeColumnLayout />
  <SettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
</template>

<style scoped></style>
