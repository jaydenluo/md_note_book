import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AlertDialogProvider } from './components/ui/alert-dialog'
import { PromptDialogProvider } from './components/ui/prompt-dialog'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AlertDialogProvider>
      <PromptDialogProvider>
    <App />
      </PromptDialogProvider>
    </AlertDialogProvider>
  </React.StrictMode>
)
