import './styles.css'
import { socketClient } from './socket-client'

// Initialize socket connection when the page loads
window.addEventListener('load', () => {
  socketClient.connect()
})