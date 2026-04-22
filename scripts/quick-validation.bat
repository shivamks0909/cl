@echo off
echo ========================================
echo QUICK VALIDATION - PanelFlow Test Suite
echo ========================================
echo.

REM Unit Tests
echo [1/3] Running Unit Tests...
call npx jest tests/unit --coverage=false
if errorlevel 1 (
    echo [ERROR] Unit tests failed!
    exit /b 1
)
echo [PASS] Unit tests completed
echo.

REM Integration Tests
echo [2/3] Running Integration Tests...
call npx jest tests/integration --coverage=false
if errorlevel 1 (
    echo [ERROR] Integration tests failed!
    exit /b 1
)
echo [PASS] Integration tests completed
echo.

REM Security Tests (fast)
echo [3/3] Running Security Tests...
call npm run test:security
if errorlevel 1 (
    echo [ERROR] Security tests failed!
    exit /b 1
)
echo [PASS] Security tests completed
echo.

echo ========================================
echo ALL TESTS PASSED - Validation Complete!
echo ========================================
exit /b 0
