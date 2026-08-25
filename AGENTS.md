# Repository Guidelines

## Git

- Always write commit messages and pull request titles and descriptions in English.
- Use Conventional Commits: `<type>(<scope>): <message>`.

## UI

- Use shadcn/ui components for the user interface and prefer the components already installed in the project over custom implementations.
- Keep using the installed shadcn `base-nova` theme and its existing design tokens from `src/index.css`. Do not introduce a competing theme, hard-coded replacement colors, or reinitialize shadcn unless explicitly requested.
