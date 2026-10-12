# Testing

## Tests

Jest tests cover session access, token refresh, autosave, trail navigation,
associations and text statistics.

```bash
npm test
```

## Additional checks

```bash
npx tsc --noEmit
npm run lint
npm run build
npm run knip
```

## Browser verification

Check editor changes in the browser for focus, selection and keyboard behavior.
