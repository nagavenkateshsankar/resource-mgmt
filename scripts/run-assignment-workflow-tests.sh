#!/bin/bash

# Assignment Workflow Comprehensive Test Suite
# This script runs all assignment workflow tests and generates a detailed report

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
FRONTEND_DIR="./frontend"
BACKEND_DIR="./"
TEST_RESULTS_DIR="./test-reports/assignment-workflow"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="$TEST_RESULTS_DIR/assignment_workflow_test_report_$TIMESTAMP.md"

# Test categories
declare -A TEST_CATEGORIES=(
    ["api-integration"]="API Integration Tests"
    ["e2e-workflow"]="End-to-End Workflow Tests"
    ["ui-ux-validation"]="UI/UX Validation Tests"
    ["regression"]="Regression Tests"
    ["security-permissions"]="Security and Permissions Tests"
    ["performance"]="Performance Tests"
)

# Initialize
echo -e "${BLUE}🚀 Starting Assignment Workflow Comprehensive Test Suite${NC}"
echo -e "${BLUE}Timestamp: $(date)${NC}"

# Create test results directory
mkdir -p "$TEST_RESULTS_DIR"

# Function to log with timestamp
log() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')]${NC} $1"
}

# Function to log success
log_success() {
    echo -e "${GREEN}✅ [$(date +'%H:%M:%S')]${NC} $1"
}

# Function to log error
log_error() {
    echo -e "${RED}❌ [$(date +'%H:%M:%S')]${NC} $1"
}

# Function to log warning
log_warning() {
    echo -e "${YELLOW}⚠️  [$(date +'%H:%M:%S')]${NC} $1"
}

# Function to check if servers are running
check_servers() {
    log "Checking if required servers are running..."

    # Check frontend server
    if curl -s http://localhost:5173 > /dev/null; then
        log_success "Frontend server is running on port 5173"
    else
        log_error "Frontend server is not running on port 5173"
        log "Please start the frontend server with: cd frontend && npm run dev"
        exit 1
    fi

    # Check backend server
    if curl -s http://localhost:3007/health > /dev/null || curl -s http://localhost:8080/health > /dev/null; then
        log_success "Backend server is running"
    else
        log_warning "Backend server might not be running - some tests may fail"
        log "Consider starting backend server if needed"
    fi
}

# Function to run API integration tests
run_api_tests() {
    log "Running API Integration Tests..."

    cd "$BACKEND_DIR"

    if [ -f "go.mod" ]; then
        # Run Go API tests
        go test -v ./tests/assignment_workflow_api_test.go > "$TEST_RESULTS_DIR/api_tests_$TIMESTAMP.log" 2>&1
        if [ $? -eq 0 ]; then
            log_success "Go API tests completed successfully"
        else
            log_error "Go API tests failed - check $TEST_RESULTS_DIR/api_tests_$TIMESTAMP.log"
        fi
    else
        log_warning "Go module not found - skipping Go API tests"
    fi

    cd - > /dev/null
}

# Function to run Playwright E2E tests
run_e2e_tests() {
    local test_category=$1
    local test_file=$2
    local description=$3

    log "Running $description..."

    cd "$FRONTEND_DIR"

    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        log "Installing frontend dependencies..."
        npm install
    fi

    # Run specific test file
    npx playwright test "tests/e2e/$test_file" \
        --reporter=html,json,junit \
        --output-dir="../$TEST_RESULTS_DIR/$test_category" \
        > "../$TEST_RESULTS_DIR/${test_category}_$TIMESTAMP.log" 2>&1

    local exit_code=$?

    if [ $exit_code -eq 0 ]; then
        log_success "$description completed successfully"
    else
        log_error "$description failed (exit code: $exit_code)"
        log "Check ../$TEST_RESULTS_DIR/${test_category}_$TIMESTAMP.log for details"
    fi

    cd - > /dev/null
    return $exit_code
}

# Function to generate test report
generate_report() {
    log "Generating comprehensive test report..."

    cat > "$REPORT_FILE" << EOF
# Assignment Workflow Test Report

**Generated:** $(date)
**Test Suite Version:** 1.0.0
**Environment:** $(uname -s) $(uname -r)

## Executive Summary

This report contains the results of comprehensive testing for the Assignment Workflow system, including API integration, end-to-end functionality, UI/UX validation, regression testing, security, and performance analysis.

## Test Categories

EOF

    # Add results for each test category
    local total_tests=0
    local passed_tests=0
    local failed_tests=0

    for category in "${!TEST_CATEGORIES[@]}"; do
        description="${TEST_CATEGORIES[$category]}"

        echo "### $description" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"

        # Check if test results exist
        local log_file="$TEST_RESULTS_DIR/${category}_$TIMESTAMP.log"
        local result_dir="$TEST_RESULTS_DIR/$category"

        if [ -f "$log_file" ]; then
            # Parse test results
            local test_count=$(grep -c "test\|spec" "$log_file" 2>/dev/null || echo "0")
            local pass_count=$(grep -c "passed\|✓\|PASS" "$log_file" 2>/dev/null || echo "0")
            local fail_count=$(grep -c "failed\|✗\|FAIL" "$log_file" 2>/dev/null || echo "0")

            total_tests=$((total_tests + test_count))
            passed_tests=$((passed_tests + pass_count))
            failed_tests=$((failed_tests + fail_count))

            echo "- **Status:** $([ $fail_count -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")" >> "$REPORT_FILE"
            echo "- **Tests Run:** $test_count" >> "$REPORT_FILE"
            echo "- **Passed:** $pass_count" >> "$REPORT_FILE"
            echo "- **Failed:** $fail_count" >> "$REPORT_FILE"
            echo "- **Log File:** \`${category}_$TIMESTAMP.log\`" >> "$REPORT_FILE"

            # Add any specific findings
            if [ -f "$result_dir/results.json" ]; then
                echo "- **Detailed Results:** \`$category/results.json\`" >> "$REPORT_FILE"
            fi

        else
            echo "- **Status:** ⚠️ NOT RUN" >> "$REPORT_FILE"
            echo "- **Reason:** Test log not found" >> "$REPORT_FILE"
        fi

        echo "" >> "$REPORT_FILE"
    done

    # Add summary statistics
    cat >> "$REPORT_FILE" << EOF
## Overall Statistics

- **Total Tests:** $total_tests
- **Passed:** $passed_tests
- **Failed:** $failed_tests
- **Success Rate:** $([ $total_tests -gt 0 ] && echo "scale=2; $passed_tests * 100 / $total_tests" | bc || echo "0")%

## Test Coverage Areas

### ✅ API Integration Testing
- Assignment endpoint validation
- Bulk assignment operations
- Inspector workload management
- Security and authentication
- Error handling and edge cases
- Performance benchmarking

### ✅ End-to-End Workflow Testing
- Site-first assignment creation
- Inspection-first assignment creation
- Assignment acceptance/rejection
- Inspector assignment workflows
- Mobile responsiveness validation

### ✅ UI/UX Validation
- Visual design consistency
- User interface components
- Accessibility compliance (WCAG)
- Form validation and feedback
- Loading states and error handling

### ✅ Regression Testing
- Existing inspection creation
- Template management integration
- Site management functionality
- User authentication and roles
- Navigation and routing

### ✅ Security and Permissions
- Authentication security
- Role-based access control
- Organization-level isolation
- Input validation and sanitization
- API security measures

### ✅ Performance Testing
- Page load performance
- API response times
- Large dataset handling
- Memory usage optimization
- Mobile performance

## Security Findings

EOF

    # Add security-specific findings if security tests were run
    local security_log="$TEST_RESULTS_DIR/security-permissions_$TIMESTAMP.log"
    if [ -f "$security_log" ]; then
        echo "### Authentication & Authorization" >> "$REPORT_FILE"
        echo "- Unauthorized access prevention: $(grep -q "unauthorized access" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "- Role-based permissions: $(grep -q "role.*access" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "- Session management: $(grep -q "session" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"

        echo "### Input Security" >> "$REPORT_FILE"
        echo "- XSS protection: $(grep -q "XSS" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "- SQL injection prevention: $(grep -q "SQL" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "- Input validation: $(grep -q "validation" "$security_log" && echo "✅ TESTED" || echo "⚠️ UNCLEAR")" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"
    fi

    # Add performance findings
    local performance_log="$TEST_RESULTS_DIR/performance_$TIMESTAMP.log"
    if [ -f "$performance_log" ]; then
        echo "## Performance Findings" >> "$REPORT_FILE"
        echo "" >> "$REPORT_FILE"

        # Extract performance metrics if available
        if grep -q "load time" "$performance_log"; then
            echo "### Load Performance" >> "$REPORT_FILE"
            grep "load time\|response time" "$performance_log" | head -5 >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
        fi

        if grep -q "memory" "$performance_log"; then
            echo "### Memory Usage" >> "$REPORT_FILE"
            grep "memory\|Memory" "$performance_log" | head -3 >> "$REPORT_FILE"
            echo "" >> "$REPORT_FILE"
        fi
    fi

    cat >> "$REPORT_FILE" << EOF

## Recommendations

### High Priority
1. **Security Hardening**: Ensure all security tests pass before production deployment
2. **Performance Optimization**: Address any performance bottlenecks identified in testing
3. **Error Handling**: Verify all error scenarios are handled gracefully

### Medium Priority
1. **Mobile Optimization**: Ensure assignment workflows work seamlessly on mobile devices
2. **Accessibility**: Complete WCAG compliance validation for all assignment interfaces
3. **Documentation**: Update user documentation for new assignment workflows

### Low Priority
1. **Performance Monitoring**: Implement ongoing performance monitoring in production
2. **Test Automation**: Integrate these tests into CI/CD pipeline
3. **User Training**: Prepare training materials for new assignment features

## Test Environment Details

- **Frontend Server:** http://localhost:5173
- **Backend Server:** http://localhost:3007 or http://localhost:8080
- **Browser:** Chromium (Playwright)
- **Test Framework:** Playwright, Go testing
- **Report Generated:** $(date)

## Files Generated

- **Main Report:** \`assignment_workflow_test_report_$TIMESTAMP.md\`
- **Test Logs:** \`*_$TIMESTAMP.log\`
- **HTML Reports:** Available in respective test category directories
- **JSON Results:** Available for programmatic analysis

---

*This report was automatically generated by the Assignment Workflow Test Suite.*
EOF

    log_success "Test report generated: $REPORT_FILE"
}

# Function to open test results
open_results() {
    log "Opening test results..."

    # Try to open HTML report if available
    local html_report="$TEST_RESULTS_DIR/e2e-workflow/playwright-report/index.html"
    if [ -f "$html_report" ]; then
        if command -v open > /dev/null; then
            open "$html_report"
        elif command -v xdg-open > /dev/null; then
            xdg-open "$html_report"
        else
            log "HTML report available at: $html_report"
        fi
    fi

    # Open the main report
    if command -v open > /dev/null; then
        open "$REPORT_FILE"
    elif command -v xdg-open > /dev/null; then
        xdg-open "$REPORT_FILE"
    else
        log "Test report available at: $REPORT_FILE"
    fi
}

# Main execution
main() {
    echo ""
    echo "=========================================="
    echo "  Assignment Workflow Test Suite"
    echo "=========================================="
    echo ""

    # Check prerequisites
    check_servers

    echo ""
    log "Starting test execution..."
    echo ""

    # Track test results
    local failed_categories=()

    # Run API tests
    run_api_tests
    if [ $? -ne 0 ]; then
        failed_categories+=("api-integration")
    fi

    # Run E2E tests
    run_e2e_tests "e2e-workflow" "assignment-workflow-e2e.test.js" "End-to-End Workflow Tests"
    if [ $? -ne 0 ]; then
        failed_categories+=("e2e-workflow")
    fi

    run_e2e_tests "ui-ux-validation" "assignment-ui-ux-validation.test.js" "UI/UX Validation Tests"
    if [ $? -ne 0 ]; then
        failed_categories+=("ui-ux-validation")
    fi

    run_e2e_tests "regression" "assignment-regression.test.js" "Regression Tests"
    if [ $? -ne 0 ]; then
        failed_categories+=("regression")
    fi

    run_e2e_tests "security-permissions" "assignment-security-permissions.test.js" "Security and Permissions Tests"
    if [ $? -ne 0 ]; then
        failed_categories+=("security-permissions")
    fi

    run_e2e_tests "performance" "assignment-performance.test.js" "Performance Tests"
    if [ $? -ne 0 ]; then
        failed_categories+=("performance")
    fi

    # Generate comprehensive report
    generate_report

    echo ""
    echo "=========================================="
    echo "  Test Execution Complete"
    echo "=========================================="
    echo ""

    # Summary
    if [ ${#failed_categories[@]} -eq 0 ]; then
        log_success "All test categories completed successfully!"
        echo ""
        log "✅ Assignment Workflow system is ready for production"
    else
        log_error "Some test categories failed:"
        for category in "${failed_categories[@]}"; do
            echo "   - ${TEST_CATEGORIES[$category]}"
        done
        echo ""
        log "❌ Please review failed tests before deployment"
    fi

    echo ""
    log "📊 Detailed report available at: $REPORT_FILE"
    echo ""

    # Ask if user wants to open results
    read -p "Would you like to open the test results? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        open_results
    fi
}

# Run main function
main "$@"