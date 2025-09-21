#!/bin/bash

# Comprehensive Theme Testing Script
# This script runs all theme-related tests in sequence

set -e

echo "🎨 Starting Comprehensive Theme Test Suite"
echo "==========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test results tracking
UNIT_TESTS_PASSED=false
E2E_TESTS_PASSED=false
ACCESSIBILITY_TESTS_PASSED=false
VISUAL_TESTS_PASSED=false
PERFORMANCE_TESTS_PASSED=false

# Function to print status
print_status() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 PASSED${NC}"
        return 0
    else
        echo -e "${RED}❌ $1 FAILED${NC}"
        return 1
    fi
}

# Function to print section header
print_section() {
    echo -e "\n${BLUE}===========================================${NC}"
    echo -e "${BLUE}🧪 $1${NC}"
    echo -e "${BLUE}===========================================${NC}\n"
}

# Create test results directory
mkdir -p test-results/theme-tests
mkdir -p test-results/screenshots
mkdir -p test-results/coverage

# Set environment variables for testing
export THEME_TEST_MODE=true
export DISABLE_ANIMATIONS=true
export NODE_ENV=test

print_section "UNIT TESTS - Theme Store, Composable, and Components"

echo "Running theme unit tests with coverage..."
if npm run test:unit -- tests/unit/theme-*.test.js --coverage --reporter=json --outputFile=test-results/theme-tests/unit-results.json; then
    UNIT_TESTS_PASSED=true
    print_status "Unit Tests"
else
    print_status "Unit Tests"
fi

print_section "E2E TESTS - Theme Functionality and Integration"

echo "Starting development server for E2E tests..."
npm run dev &
DEV_SERVER_PID=$!

# Wait for dev server to start
echo "Waiting for development server to be ready..."
sleep 10

# Check if server is running
if curl -f http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Development server is ready${NC}"
else
    echo -e "${RED}❌ Development server failed to start${NC}"
    kill $DEV_SERVER_PID
    exit 1
fi

echo "Running theme functionality E2E tests..."
if npx playwright test tests/e2e/theme-functionality.test.js --reporter=json --output-dir=test-results/theme-tests/; then
    E2E_TESTS_PASSED=true
    print_status "Theme Functionality E2E Tests"
else
    print_status "Theme Functionality E2E Tests"
fi

print_section "ACCESSIBILITY TESTS - WCAG Compliance and Color Contrast"

echo "Running theme accessibility tests..."
if npx playwright test tests/e2e/theme-accessibility.test.js --reporter=json --output-dir=test-results/theme-tests/; then
    ACCESSIBILITY_TESTS_PASSED=true
    print_status "Accessibility Tests"
else
    print_status "Accessibility Tests"
fi

print_section "VISUAL REGRESSION TESTS - Screenshot Comparison"

echo "Running visual regression tests..."
if npx playwright test tests/e2e/theme-visual-regression.test.js --reporter=json --output-dir=test-results/theme-tests/; then
    VISUAL_TESTS_PASSED=true
    print_status "Visual Regression Tests"
else
    print_status "Visual Regression Tests"
fi

print_section "PERFORMANCE TESTS - Theme Switching Speed and Memory"

echo "Running theme performance tests..."
if npx playwright test tests/e2e/theme-performance.test.js --reporter=json --output-dir=test-results/theme-tests/; then
    PERFORMANCE_TESTS_PASSED=true
    print_status "Performance Tests"
else
    print_status "Performance Tests"
fi

# Stop development server
echo "Stopping development server..."
kill $DEV_SERVER_PID

print_section "TEST RESULTS SUMMARY"

echo "📊 Theme Test Results:"
echo "====================="

if [ "$UNIT_TESTS_PASSED" = true ]; then
    echo -e "🟢 Unit Tests: ${GREEN}PASSED${NC}"
else
    echo -e "🔴 Unit Tests: ${RED}FAILED${NC}"
fi

if [ "$E2E_TESTS_PASSED" = true ]; then
    echo -e "🟢 E2E Functionality Tests: ${GREEN}PASSED${NC}"
else
    echo -e "🔴 E2E Functionality Tests: ${RED}FAILED${NC}"
fi

if [ "$ACCESSIBILITY_TESTS_PASSED" = true ]; then
    echo -e "🟢 Accessibility Tests: ${GREEN}PASSED${NC}"
else
    echo -e "🔴 Accessibility Tests: ${RED}FAILED${NC}"
fi

if [ "$VISUAL_TESTS_PASSED" = true ]; then
    echo -e "🟢 Visual Regression Tests: ${GREEN}PASSED${NC}"
else
    echo -e "🔴 Visual Regression Tests: ${RED}FAILED${NC}"
fi

if [ "$PERFORMANCE_TESTS_PASSED" = true ]; then
    echo -e "🟢 Performance Tests: ${GREEN}PASSED${NC}"
else
    echo -e "🔴 Performance Tests: ${RED}FAILED${NC}"
fi

# Generate comprehensive report
print_section "GENERATING COMPREHENSIVE REPORT"

echo "Generating HTML test report..."
cat > test-results/theme-tests/index.html << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Theme System Test Report</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            text-align: center;
            margin-bottom: 30px;
        }
        .test-section {
            background: white;
            border-radius: 10px;
            padding: 20px;
            margin-bottom: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .passed {
            color: #28a745;
            font-weight: bold;
        }
        .failed {
            color: #dc3545;
            font-weight: bold;
        }
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .metric {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            border-left: 4px solid #007bff;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🎨 Theme System Test Report</h1>
        <p>Generated: $(date)</p>
    </div>

    <div class="test-section">
        <h2>📊 Test Results Overview</h2>
        <div class="test-grid">
            <div class="metric">
                <h3>Unit Tests</h3>
                <p class="$([ "$UNIT_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
                    $([ "$UNIT_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")
                </p>
            </div>
            <div class="metric">
                <h3>E2E Functionality</h3>
                <p class="$([ "$E2E_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
                    $([ "$E2E_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")
                </p>
            </div>
            <div class="metric">
                <h3>Accessibility</h3>
                <p class="$([ "$ACCESSIBILITY_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
                    $([ "$ACCESSIBILITY_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")
                </p>
            </div>
            <div class="metric">
                <h3>Visual Regression</h3>
                <p class="$([ "$VISUAL_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
                    $([ "$VISUAL_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")
                </p>
            </div>
            <div class="metric">
                <h3>Performance</h3>
                <p class="$([ "$PERFORMANCE_TESTS_PASSED" = true ] && echo "passed" || echo "failed")">
                    $([ "$PERFORMANCE_TESTS_PASSED" = true ] && echo "✅ PASSED" || echo "❌ FAILED")
                </p>
            </div>
        </div>
    </div>

    <div class="test-section">
        <h2>📋 Test Coverage</h2>
        <ul>
            <li><strong>Theme Store (Pinia):</strong> State management, persistence, system preference detection</li>
            <li><strong>Theme Composable:</strong> Component integration, utility functions, reactive properties</li>
            <li><strong>ThemeToggle Component:</strong> All variants, accessibility, keyboard navigation</li>
            <li><strong>Theme Integration:</strong> Cross-component theming, navigation, forms</li>
            <li><strong>Accessibility:</strong> WCAG compliance, color contrast, screen reader support</li>
            <li><strong>Visual Consistency:</strong> Screenshot comparisons across themes and components</li>
            <li><strong>Performance:</strong> Theme switching speed, memory usage, rendering efficiency</li>
        </ul>
    </div>

    <div class="test-section">
        <h2>🎯 Next Steps</h2>
        <ul>
            <li>Review any failed tests and address issues</li>
            <li>Update visual regression baselines if UI changes are intentional</li>
            <li>Monitor theme performance in production</li>
            <li>Ensure accessibility standards are maintained</li>
        </ul>
    </div>
</body>
</html>
EOF

echo -e "${GREEN}✅ Test report generated: test-results/theme-tests/index.html${NC}"

# Calculate overall success
OVERALL_SUCCESS=true
if [ "$UNIT_TESTS_PASSED" = false ] || [ "$E2E_TESTS_PASSED" = false ] || [ "$ACCESSIBILITY_TESTS_PASSED" = false ] || [ "$VISUAL_TESTS_PASSED" = false ] || [ "$PERFORMANCE_TESTS_PASSED" = false ]; then
    OVERALL_SUCCESS=false
fi

print_section "FINAL RESULT"

if [ "$OVERALL_SUCCESS" = true ]; then
    echo -e "${GREEN}🎉 ALL THEME TESTS PASSED!${NC}"
    echo -e "${GREEN}The theme system is ready for production.${NC}"
    exit 0
else
    echo -e "${RED}❌ SOME TESTS FAILED${NC}"
    echo -e "${YELLOW}Please review the failed tests and fix issues before deployment.${NC}"
    exit 1
fi