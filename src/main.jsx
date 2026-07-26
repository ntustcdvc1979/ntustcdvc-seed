import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { stripExternalBrowserParam } from './utils/browserEnv'

// 從 LINE 跳到外部瀏覽器後，先把 openExternalBrowser 參數從網址列清掉，
// 這樣萬一還留在 App 內建瀏覽器，重新導向才不會因為網址相同而失效。
stripExternalBrowserParam()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
