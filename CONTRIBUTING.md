# Contributing to Accessible Cookie Banner

Thank you for considering contributing to the Accessible Cookie Banner project! This document outlines the process for contributing and provides guidelines to help you get started.

## Code of Conduct

By participating in this project, you agree to abide by the [Contributor Covenant Code of Conduct](https://www.contributor-covenant.org/version/2/1/code_of_conduct/). Please read it before contributing.

## How Can I Contribute?

### Reporting Bugs

If you find a bug, please create an issue with the following information:

1. A clear, descriptive title
2. Steps to reproduce the issue
3. Expected behavior
4. Actual behavior
5. Screenshots (if applicable)
6. Environment details (browser, OS, etc.)
7. Any additional context that might help

### Suggesting Enhancements

For feature requests or enhancements:

1. Use a clear, descriptive title
2. Provide a detailed description of the suggested enhancement
3. Explain why this enhancement would be useful
4. Include any relevant examples or mock-ups

### Pull Requests

When submitting a pull request:

1. Fork the repository and create a branch from `main`
2. If you've added code that should be tested, add tests
3. Ensure your code passes all tests
4. Update the documentation if needed
5. Follow the existing code style
6. Include a descriptive commit message

## Development Setup

1. Clone the repository:

   ```
   git clone https://github.com/your-username/accessible-cookie-banner.git
   cd accessible-cookie-banner
   ```

2. Install dependencies:

   ```
   npm install
   ```

3. Start the development environment:

   ```
   npm run dev
   ```

## Project Structure

```
accessible-cookie-banner/
├── dist/                    # Distribution files
├── src/                     # Source code
│   ├── js/                  # JavaScript source
│   ├── css/                 # CSS source
│   ├── html/                # HTML examples
│   ├── examples/            # Usage examples
│   └── locales/             # Translation files
└── test/                    # Test files
```

## Testing

Run tests with:

```
npm test
```

Run tests with coverage:

```
npm run test:coverage
```

## Accessibility Requirements

All contributions must maintain or improve accessibility. Please ensure your changes:

1. Meet WCAG 2.2 AA standards
2. Work with keyboard navigation
3. Support screen readers
4. Maintain proper ARIA attributes
5. Preserve focus management
6. Have sufficient color contrast

See [ACCESSIBILITY.md](ACCESSIBILITY.md) for detailed accessibility requirements.

## Building

Build the project with:

```
npm run build
```

This creates the following in the `dist` directory:

- UMD build: `cookie-banner.js` and `cookie-banner.min.js`
- ES Module: `cookie-banner.esm.js`
- CSS: `banner.css`
- Examples: in the `examples` subdirectory
- Locale files: in the `locales` subdirectory

## Adding Localization Support

To add a new language:

1. Create a new JSON file in `src/locales/` named with the language code (e.g., `de.json` for German)
2. Copy the structure from `en.json` and translate all the strings
3. Test the new language by setting the `locale` option to your new language code

## Documentation

If your changes require documentation updates, please modify:

- README.md for API changes or general usage
- ACCESSIBILITY.md for accessibility-related changes
- CONTRIBUTING.md for contribution process changes
- Example files if relevant

## Versioning

We use [Semantic Versioning](https://semver.org/). Please ensure your contributions respect this convention:

- MAJOR version for incompatible API changes
- MINOR version for backwards-compatible functionality additions
- PATCH version for backwards-compatible bug fixes

## License

By contributing to this project, you agree that your contributions will be licensed under the project's MIT license.
