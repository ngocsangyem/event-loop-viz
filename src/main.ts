import { createApp } from 'vue'
import App from './App.vue'
import { i18n } from './i18n'
import './style.css'
import './renderer/theme.css'
import './renderer/panels/panel-motion.css'
import './renderer/panels/panel-skin.css'
import './renderer/app-layout.css'

const app = createApp(App)

app.use(i18n)
app.mount('#app')
