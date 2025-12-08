import { BrowserRouter } from 'react-router-dom'
import './App.css'
import Navigation from './routes/Navigation'

function App() {
  return (
    <BrowserRouter>
      <Navigation />
    </BrowserRouter>
  )
}

export default App
