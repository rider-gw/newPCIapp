import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import './index.css'
import App from './App.tsx'

const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID ?? 'us-west-2_xc3HwXmSp'
const userPoolClientId =
  import.meta.env.VITE_COGNITO_USER_POOL_CLIENT_ID ?? '7npgkht7ib099i3akpbf9dvnkv'

Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId,
      userPoolClientId
    }
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
