export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation only
        'style',    // Code style (formatting, semicolons, etc)
        'refactor', // Code refactoring
        'perf',     // Performance improvement
        'test',     // Adding or updating tests
        'build',    // Build system or dependencies
        'ci',       // CI configuration
        'chore',    // Other changes (maintenance)
        'revert'    // Revert a previous commit
      ]
    ],
    'subject-case': [2, 'always', 'sentence-case'],
    'header-max-length': [2, 'always', 100]
  }
};
