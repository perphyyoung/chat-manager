<script setup lang="ts">
import { onMounted, ref } from 'vue'
import ThreeColumnLayout from './components/Layout/ThreeColumnLayout.vue'
import SettingsModal from './components/Settings/SettingsModal.vue'
import { useDocumentStore } from './stores/document'
import { useSettingsStore } from './stores/settings'
import { mockDocuments } from './data/mockData'
import { LogLevel } from './constants/logLevel'

const documentStore = useDocumentStore()
const settingsStore = useSettingsStore()
const isSettingsOpen = ref(false)

function logToFile(level: string, message: string) {
  console.log(`[App.vue] ${message}`)
  window.electronAPI.logToFile(level, message)
}

function openSettings() {
  isSettingsOpen.value = true
}

onMounted(() => {
  documentStore.initDocuments(mockDocuments)
  settingsStore.init()

  if (window.electronAPI.onOpenSettings) {
    window.electronAPI.onOpenSettings(openSettings)
  } else {
    logToFile(LogLevel.ERROR, 'window.electronAPI.onOpenSettings not available')
  }
})
</script>

<template>
  <ThreeColumnLayout />
  <SettingsModal :is-open="isSettingsOpen" @close="isSettingsOpen = false" />
</template>

<style scoped></style>
