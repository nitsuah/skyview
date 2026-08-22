import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'

// Extract JWT from Google OAuth callback (delivered via #fragment to avoid server logs / Referer exposure)
const _hashParams  = new URLSearchParams(window.location.hash.slice(1))
const _oauthToken  = _hashParams.get('token')
if (_oauthToken) {
  localStorage.setItem('skyview_token', _oauthToken)
  window.history.replaceState({}, '', window.location.pathname)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
