import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import { useAuthStore } from './stores/auth'
import 'bootstrap/dist/css/bootstrap.min.css'
import './assets/styles/main.css'
import './assets/styles/admin.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// Saat aplikasi dimuat, verifikasi token masih sah.
// initialize() memoized — guard router memakai promise yang sama.
const auth = useAuthStore(pinia)
auth.initialize()

app.mount('#app')
