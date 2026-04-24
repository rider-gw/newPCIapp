import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from '@aws-amplify/core'
import './index.css'
import App from './App.tsx'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'us-west-2_xc3HwXmSp',
      userPoolClientId: '7npgkht7ib099i3akpbf9dvnkv',
      region: 'us-west-2'
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
