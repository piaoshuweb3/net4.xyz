# AP2 Website Integration Package

This directory contains the static deployment data the Vercel protocol explorer should consume for `/api/v1` Base Sepolia mode.

Files:

- `base-sepolia-clean.json`: chain, contract addresses, default scope/target, supported actions, and explorer URLs.
- `abis/*.json`: contract ABIs generated from Foundry artifacts.

Adapter modes for the website:

- `simulation`: use the existing mock/Prisma flow.
- `base-sepolia`: use this package plus a wallet/RPC provider to call deployed contracts.

Do not store private keys or signer secrets in this directory.

Live `/api/v1` endpoints:

- `POST /api/v1/admin/mint-safc`
- `POST /api/v1/admin/set-policy`
- `POST /api/v1/admin/set-scope`
- `POST /api/v1/escrow/approve`
- `POST /api/v1/escrow/create-task`
- `POST /api/v1/escrow/withdraw`
- `POST /api/v1/escrow/settle`
- `GET /api/v1/escrow/status`
- `POST /api/v1/tdpo/lock-contrarian`
- `POST /api/v1/tdpo/inject-factor`
- `POST /api/v1/tdpo/veto`
- `POST /api/v1/tdpo/claim`
- `GET /api/v1/tdpo/status`

Frontend flow:

1. Connect wallet from the top-right control.
2. Switch mode to `Base Sepolia`.
3. In the Escrow panel, use `Configure` once for the clean environment.
4. Use `One-click Start` for approve, create task, auto-read `TaskCreated.taskId`, withdraw, settle, TDPO lock, inject, and veto.
5. Use `Read State` to fetch task status, TDPO deposit, veto status, and factor state.

Manual buttons remain available for debugging each transaction step independently.
