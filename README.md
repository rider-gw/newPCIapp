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

The Assets page now uses an adapter-based service layer and is REST-first by default.

Required asset fields:

- Asset Name
- Asset Type (`laptop`, `server`, `virtual`, `cloud`, `phone`)
- Purchase cost

Microservice (REST) configuration:

- `VITE_ASSET_PROVIDER=rest` (default)
- `VITE_ASSET_API_BASE_URL` (for example: `https://asset-api.company.com` or `/api`)
- `VITE_ASSET_API_ASSETS_PATH` (optional, defaults to `/assets`)
- `VITE_ASSET_API_HEALTH_PATH` (optional, defaults to `/health`)
- `VITE_ASSET_API_CONTRACT` (optional: `native` or `servicenow`)

Local development with Vite proxy:

- Keep `VITE_ASSET_API_BASE_URL=/api` in your frontend env.
- Set `VITE_ASSET_API_PROXY_TARGET` to your local asset service, for example `http://localhost:4000`.
- Run the microservice and Vite dev server together; browser calls to `/api/*` are proxied by Vite in dev mode.

Legacy direct DynamoDB configuration (optional fallback):

- `VITE_ASSET_PROVIDER=dynamodb`
- `VITE_AWS_REGION`
- `VITE_COGNITO_IDENTITY_POOL_ID`
- `VITE_DDB_ASSETS_TABLE` (optional, defaults to `assets`)
- `VITE_DDB_CONTROLS_TABLE` (optional, defaults to `controls`)

IAM note:

- The authenticated role for your Cognito Identity Pool must allow `dynamodb:PutItem` and `dynamodb:Scan` on both the `assets` and `controls` tables.

## Asset service architecture

Asset pages call a single service API in `src/services/assetsStore.ts`.
That file is a compatibility facade over `src/services/assets/assetService.ts`, which selects a provider adapter:

- REST adapter: `src/services/assets/adapters/restAssetAdapter.ts`
- DynamoDB adapter: `src/services/assets/adapters/dynamoDbAssetAdapter.ts`

The REST adapter also supports payload contract adapters so external platforms can be integrated without changing UI components:

- `native` contract for your internal microservice
- `servicenow` example mapping as a template for future third-party adapters

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
