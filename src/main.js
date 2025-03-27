import './styles.css'
import { socketClient } from './socket-client'
import { uiManager } from './ui-manager'

// Initialize socket connection when the page loads
window.addEventListener('load', () => {
  socketClient.connect()
})