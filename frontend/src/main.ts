import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { registerSW } from 'virtual:pwa-register'

import App from './App.vue'
import router from './router'

import './assets/main.css'
import './assets/css/components.css'

// Register Service Worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    console.log('New content available, please refresh.')
    // You can show a toast or modal here to ask user to refresh
  },
  onOfflineReady() {
    console.log('App ready to work offline.')
    // Show a message that app is ready to work offline
  },
})

const app = createApp(App)

app.use(createPinia())
app.use(router)

// Add global properties for PWA features
app.config.globalProperties.$updateSW = updateSW

app.mount('#app')