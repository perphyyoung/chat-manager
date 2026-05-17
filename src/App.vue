<script setup lang="ts">
import { onMounted } from 'vue'
import ThreeColumnLayout from './components/Layout/ThreeColumnLayout.vue'
import { useDocumentStore } from './stores/document'
import { mockDocuments } from './data/mockData'

const documentStore = useDocumentStore()

onMounted(() => {
  documentStore.initDocuments(mockDocuments)
})
</script>

<template>
  <ThreeColumnLayout />
</template>

<style scoped></style>
