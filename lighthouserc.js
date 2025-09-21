module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:5432/'],
      startServerCommand: 'go run main.go',
      startServerReadyPattern: 'Listening and serving HTTP',
      startServerReadyTimeout: 60000,
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', {minScore: 0.7}],
        'categories:accessibility': ['error', {minScore: 0.9}],
        'categories:best-practices': ['warn', {minScore: 0.8}],
        'categories:seo': ['warn', {minScore: 0.8}],
        'categories:pwa': ['warn', {minScore: 0.8}],
        
        // PWA specific checks
        'installable-manifest': 'error',
        'service-worker': 'error',
        'works-offline': 'warn',
        'viewport': 'error',
        'without-javascript': 'off', // Our app requires JS
        
        // Performance budgets
        'resource-summary:script:size': ['warn', {maxNumericValue: 500000}], // 500KB JS
        'resource-summary:image:size': ['warn', {maxNumericValue: 1000000}], // 1MB images
        'first-contentful-paint': ['warn', {maxNumericValue: 2000}], // 2 seconds
        'largest-contentful-paint': ['warn', {maxNumericValue: 4000}], // 4 seconds
      }
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};