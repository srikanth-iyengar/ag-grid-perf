# Repository Guidelines

## Project Structure & Module Organization
This repo is a pnpm workspace with two example apps:
- `ag-grid-react-example/`: Vite + React example. Source in `ag-grid-react-example/src/`, entry in `ag-grid-react-example/src/main.jsx`.
- `ag-grid-angular-example/`: Angular standalone component example. Source in `ag-grid-angular-example/src/`, entry in `ag-grid-angular-example/src/main.ts`.

Shared workspace config lives in `pnpm-workspace.yaml`. There are no shared libraries between the apps.

## Build, Test, and Development Commands
Run commands from the repo root unless noted.
- `pnpm install`: install workspace dependencies.
- `pnpm start:react`: run the React example in dev mode (Vite).
- `pnpm start:angular`: run the Angular example in dev mode (Angular CLI).
- `pnpm --filter ag-grid-react-example build`: build the React app.
- `pnpm --filter ag-grid-angular-example build`: build the Angular app.
- `pnpm --filter ag-grid-react-example preview`: preview the React production build.
- `pnpm --filter ag-grid-angular-example watch`: rebuild Angular on file changes.

## Coding Style & Naming Conventions
The codebase uses modern ES modules and TypeScript in Angular. Follow existing patterns:
- Indentation: 2 spaces.
- Naming: `camelCase` for variables/functions, `PascalCase` for React components and Angular classes, `SCREAMING_SNAKE_CASE` for constants.
- No linting or formatting tools are configured; match surrounding style when editing.

## Testing Guidelines
There are no test frameworks or test files configured in this repo. If you add tests, prefer colocating them near source files and document the command you introduce (e.g., `pnpm --filter <app> test`).

## Commit & Pull Request Guidelines
Git history shows short, free-form commit messages with no enforced convention. Keep commits concise and descriptive (e.g., “adjust grid columns”).
For pull requests, include:
- A brief summary of the change and motivation.
- Steps to verify (commands run and expected behavior).
- Screenshots or short clips for UI changes in either example app.

## Configuration Tips
Both apps depend on AG Grid packages (`ag-grid-community`, `ag-grid-react`, `ag-grid-angular`). If upgrading versions, update both apps to keep parity.
