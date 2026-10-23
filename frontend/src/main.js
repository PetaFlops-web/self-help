import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/styles/main.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

createApp(App).use(createPinia()).use(router).mount('#app')
