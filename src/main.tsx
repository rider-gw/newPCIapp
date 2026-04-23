import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Amplify } from 'aws-amplify'
import './index.css'
import App from './App.tsx'

Amplify.configure({
  Auth: {
    region: 'us-west-2',
    userPoolId: 'us-west-2_xc3HwXmSp',
    userPoolWebClientId: '7npgkht7ib099i3akpbf9dvnkv'
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
