# Frontend Code Style

This project follows the principles of the
[Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html),
adapted for a small browser application with native ES modules.

## Formatting

- Use 2 spaces for indentation. Do not use tabs.
- Use single quotes for JavaScript strings.
- End statements with semicolons.
- Keep lines close to 100 characters when practical.
- Include trailing commas in multiline arrays, objects, parameters, and calls.
- Put one statement on each line.
- Use braces for control-flow blocks, even when the body has one statement.
- Keep HTML indentation at 2 spaces and CSS declarations one per line.

## Naming

- Use `camelCase` for variables, functions, methods, and module filenames.
- Use `PascalCase` for classes.
- Use `UPPER_SNAKE_CASE` for module-level constants.
- Choose names that describe behavior, such as `requestCalculation` and
  `renderHistory`.
- Avoid unexplained abbreviations and single-letter names outside small loops.

## JavaScript

- Prefer `const`; use `let` only when reassignment is required.
- Never use `var`.
- Use strict equality with `===` and `!==`.
- Use `async`/`await` for asynchronous control flow.
- Handle rejected network requests and non-success HTTP responses explicitly.
- Do not swallow errors unless the UI intentionally presents a replacement
  state.
- Export only the values needed by another module.
- Keep modules free of hidden global state.

## Module Responsibilities

- `config.js` selects environment-specific configuration.
- `api.js` owns HTTP requests, JSON handling, and API error normalization.
- `calculator.js` owns expression input state and calculation orchestration.
- `history.js` owns history loading, refresh ordering, and deletion.
- `ui.js` owns DOM rendering and visual state changes.
- `main.js` creates dependencies and starts the application.

Do not move backend calculation, parsing, validation, or persistence into any
frontend module.

## DOM and Security

- Query required elements once during application startup.
- Use event delegation where several controls share one container.
- Use `textContent` for expressions, results, errors, and history values.
- Do not construct executable code from user input.
- Do not use `eval()`, `Function()`, or equivalent dynamic execution.
- Keep button types explicit so controls cannot accidentally submit a form.
- Disable repeated calculation requests while one is in progress.

## HTML and Accessibility

- Use semantic elements and real `<button>` controls.
- Give controls clear accessible labels when visible text is insufficient.
- Preserve keyboard focus indicators.
- Associate status changes with suitable ARIA live regions.
- Keep document text and interface labels in English.
- Maintain a usable layout at desktop and mobile widths.

## CSS

- Use reusable classes instead of inline styles.
- Keep color, spacing, and typography values centralized in custom properties
  when they are reused.
- Prefer layout systems such as Grid and Flexbox over fixed positioning.
- Add responsive rules only where the content needs them.
- Respect reduced-motion preferences for nonessential animation.

## Comments and Documentation

- Explain intent, constraints, or non-obvious decisions.
- Do not restate code that is already clear.
- Keep comments and documentation in English.
- Update documentation in the same change when behavior, configuration, API
  usage, or test commands change.

## Tests

- Give each test one clearly described behavior.
- Keep module tests deterministic and independent of production services.
- Use isolated backend data for destructive browser tests.
- Test request counts as well as rendered results when duplicate requests could
  cause regressions.
- Restore or remove test-created records after integration testing.
