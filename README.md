# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Existing Cognito User Pool setup

This app uses Amplify Auth with an existing Cognito User Pool.

Set these environment variables in Amplify Hosting (or local `.env` files):

- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_USER_POOL_CLIENT_ID`

Important for existing pools:

- The app client must be from the same User Pool as the `userPoolId`.
- The app client must not use a client secret (web apps cannot securely store one).
- If you only allow existing users, keep sign-up disabled in the UI.

## Controls and DynamoDB tables

The Controls page supports both:

- Manual control add
- Bulk control load from an Excel file (`.xlsx`/`.xls`)

The Controls page also includes a downloadable Excel template with the required headers and a sample row.

Controls are stored in the DynamoDB table named `controls` by default.

Required control fields:

- ControlID
- Requirement
- Control Type (`standard`, `customised`)
- Control Description
- Evidence
- Risk Summary
- Implementation Notes

The Assets page remains separate and stores data in the DynamoDB table named `assets`.

Required asset fields:

- Asset Name
- Asset Type (`laptop`, `server`, `virtual`, `cloud`, `phone`)
- Purchase cost

Additional env vars required for direct DynamoDB access from the app:

- `VITE_AWS_REGION`
- `VITE_COGNITO_IDENTITY_POOL_ID`
- `VITE_DDB_ASSETS_TABLE` (optional, defaults to `assets`)
- `VITE_DDB_CONTROLS_TABLE` (optional, defaults to `controls`)

IAM note:

- The authenticated role for your Cognito Identity Pool must allow `dynamodb:PutItem` and `dynamodb:Scan` on both the `assets` and `controls` tables.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
