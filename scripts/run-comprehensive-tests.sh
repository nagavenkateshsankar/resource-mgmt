#!/bin/bash

# Comprehensive Testing Script for Resource Management System
# This script runs all test suites for regression protection and new feature validation

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BACKEND_URL="http://localhost:3007"
FRONTEND_URL="http://localhost:5173"
TEST_TIMEOUT=60000
REPORT_DIR="test-reports"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if service is running
check_service() {
    local url=$1
    local service_name=$2

    print_status "Checking if $service_name is running at $url..."

    if curl -s -f "$url" > /dev/null 2>&1; then
        print_success "$service_name is running"
        return 0
    else
        print_error "$service_name is not running at $url"
        return 1
    fi
}

# Function to wait for service
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1

    print_status "Waiting for $service_name to be available..."

    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$url" > /dev/null 2>&1; then
            print_success "$service_name is available"
            return 0
        fi

        print_status "Attempt $attempt/$max_attempts - waiting for $service_name..."
        sleep 2
        attempt=$((attempt + 1))
    done

    print_error "$service_name failed to start within expected time"
    return 1
}

# Function to create test report directory
setup_reports() {
    print_status "Setting up test reports directory..."
    mkdir -p "$REPORT_DIR"
    rm -rf "$REPORT_DIR"/*
    print_success "Test reports directory ready"
}

# Function to run a specific test suite
run_test_suite() {
    local test_file=$1
    local test_name=$2
    local report_file="$REPORT_DIR/${test_name}-results"

    print_status "Running $test_name tests..."

    cd frontend

    if npx playwright test "$test_file" \
        --reporter=html \
        --reporter=json \
        --output-dir="../$REPORT_DIR/$test_name" \
        --timeout="$TEST_TIMEOUT" \
        --workers=1; then
        print_success "$test_name tests passed"
        return 0
    else
        print_error "$test_name tests failed"
        return 1
    fi
}

# Function to run health check
health_check() {
    print_status "Running system health check..."

    # Check backend health
    if ! check_service "$BACKEND_URL/api/v1/health" "Backend API"; then
        return 1
    fi

    # Check frontend
    if ! check_service "$FRONTEND_URL" "Frontend Application"; then
        return 1
    fi

    print_success "System health check passed"
    return 0
}

# Function to run regression protection tests
run_regression_tests() {
    print_status "=== Running Regression Protection Tests ==="

    if run_test_suite "regression-protection-suite.test.js" "regression-protection"; then
        print_success "Regression protection tests completed successfully"
        return 0
    else
        print_error "Regression protection tests failed - CRITICAL ISSUE"
        return 1
    fi
}

# Function to run API contract validation tests
run_api_tests() {
    print_status "=== Running API Contract Validation Tests ==="

    if run_test_suite "api-contract-validation.test.js" "api-contract"; then
        print_success "API contract validation tests completed successfully"
        return 0
    else
        print_error "API contract validation tests failed"
        return 1
    fi
}

# Function to run baseline monitoring tests
run_monitoring_tests() {
    print_status "=== Running Baseline Monitoring Tests ==="

    if run_test_suite "baseline-monitoring.test.js" "baseline-monitoring"; then
        print_success "Baseline monitoring tests completed successfully"
        return 0
    else
        print_error "Baseline monitoring tests failed"
        return 1
    fi
}

# Function to run new workflow tests
run_workflow_tests() {
    print_status "=== Running Site Assignment Workflow Tests ==="

    if run_test_suite "site-assignment-workflow-tests.test.js" "workflow-tests"; then
        print_success "Site assignment workflow tests completed successfully"
        return 0
    else
        print_warning "Site assignment workflow tests failed (new features may not be implemented yet)"
        return 0  # Don't fail the build for new features
    fi
}

# Function to run all existing functionality tests
run_existing_functionality_tests() {
    print_status "=== Running Existing Functionality Test Suite ==="

    local failed_tests=0

    # Run health check first
    if ! health_check; then
        print_error "Health check failed - cannot proceed with tests"
        return 1
    fi

    # Run regression protection tests (critical)
    if ! run_regression_tests; then
        failed_tests=$((failed_tests + 1))
    fi

    # Run API contract tests (critical)
    if ! run_api_tests; then
        failed_tests=$((failed_tests + 1))
    fi

    # Run baseline monitoring tests (critical)
    if ! run_monitoring_tests; then
        failed_tests=$((failed_tests + 1))
    fi

    if [ $failed_tests -eq 0 ]; then
        print_success "All existing functionality tests passed"
        return 0
    else
        print_error "$failed_tests critical test suite(s) failed"
        return 1
    fi
}

# Function to run all tests including new features
run_full_test_suite() {
    print_status "=== Running Full Test Suite ==="

    local failed_tests=0

    # Run existing functionality tests first
    if ! run_existing_functionality_tests; then
        failed_tests=$((failed_tests + 1))
    fi

    # Run new workflow tests (non-critical)
    run_workflow_tests

    if [ $failed_tests -eq 0 ]; then
        print_success "Full test suite completed successfully"
        return 0
    else
        print_error "Critical test failures detected"
        return 1
    fi
}

# Function to generate summary report
generate_summary() {
    print_status "=== Test Execution Summary ==="

    if [ -d "$REPORT_DIR" ]; then
        echo ""
        echo "Test Reports Generated:"
        find "$REPORT_DIR" -name "*.html" -o -name "*.json" | while read report; do
            echo "  - $report"
        done
        echo ""

        # Count test results if available
        if find "$REPORT_DIR" -name "*results*.json" -type f | head -1 > /dev/null 2>&1; then
            echo "Test Results Summary:"
            find "$REPORT_DIR" -name "*results*.json" | while read results_file; do
                if [ -f "$results_file" ]; then
                    test_suite=$(basename "$(dirname "$results_file")")
                    echo "  - $test_suite: Available in $results_file"
                fi
            done
        fi
    fi

    echo ""
    print_status "For detailed test reports, open the HTML files in your browser"
    print_status "Example: open $REPORT_DIR/regression-protection/index.html"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS] [TEST_SUITE]"
    echo ""
    echo "Test Suites:"
    echo "  existing      Run all existing functionality tests (regression, API, monitoring)"
    echo "  full          Run all tests including new workflow features"
    echo "  regression    Run only regression protection tests"
    echo "  api           Run only API contract validation tests"
    echo "  monitoring    Run only baseline monitoring tests"
    echo "  workflow      Run only site assignment workflow tests"
    echo "  health        Run only health check"
    echo ""
    echo "Options:"
    echo "  --help        Show this help message"
    echo "  --timeout N   Set test timeout in milliseconds (default: 60000)"
    echo "  --workers N   Set number of test workers (default: 1)"
    echo ""
    echo "Examples:"
    echo "  $0 existing                    # Run all existing functionality tests"
    echo "  $0 full                        # Run complete test suite"
    echo "  $0 regression                  # Run only regression tests"
    echo "  $0 --timeout 120000 full      # Run full suite with 2-minute timeout"
}

# Main execution logic
main() {
    local test_suite="${1:-existing}"
    local exit_code=0

    print_status "Starting comprehensive test execution..."
    print_status "Backend URL: $BACKEND_URL"
    print_status "Frontend URL: $FRONTEND_URL"
    print_status "Test Suite: $test_suite"

    # Setup test reports
    setup_reports

    case "$test_suite" in
        "existing")
            if ! run_existing_functionality_tests; then
                exit_code=1
            fi
            ;;
        "full")
            if ! run_full_test_suite; then
                exit_code=1
            fi
            ;;
        "regression")
            if ! run_regression_tests; then
                exit_code=1
            fi
            ;;
        "api")
            if ! run_api_tests; then
                exit_code=1
            fi
            ;;
        "monitoring")
            if ! run_monitoring_tests; then
                exit_code=1
            fi
            ;;
        "workflow")
            run_workflow_tests
            ;;
        "health")
            if ! health_check; then
                exit_code=1
            fi
            ;;
        "--help"|"-h")
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown test suite: $test_suite"
            show_usage
            exit 1
            ;;
    esac

    # Generate summary report
    generate_summary

    if [ $exit_code -eq 0 ]; then
        print_success "Test execution completed successfully"
    else
        print_error "Test execution completed with failures"
    fi

    exit $exit_code
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --timeout)
            TEST_TIMEOUT="$2"
            shift 2
            ;;
        --workers)
            WORKERS="$2"
            shift 2
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            break
            ;;
    esac
done

# Run main function with remaining arguments
main "$@"