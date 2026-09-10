@echo off
title ClassPulse 2.0 - Mindanao State University
cls
echo ======================================================================
echo    ClassPulse 2.0 - Mindanao State University Desktop App Container
echo ======================================================================
echo.
echo Launching ClassPulse in Standalone Window Container...
echo (Full screen native application frame without browser bars)
echo.

set "APP_URL=https://ais-dev-tjcf7l4yw3y22z275uwnes-956857929926.asia-southeast1.run.app"

:: Try Microsoft Edge App Mode (Universal on Windows 10/11)
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --user-data-dir="%LOCALAPPDATA%\ClassPulseApp" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --user-data-dir="%LOCALAPPDATA%\ClassPulseApp" --window-size=1280,800
    exit /b 0
)

:: Try Google Chrome App Mode
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --user-data-dir="%LOCALAPPDATA%\ClassPulseApp" --window-size=1280,800
    exit /b 0
)
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%APP_URL%" --user-data-dir="%LOCALAPPDATA%\ClassPulseApp" --window-size=1280,800
    exit /b 0
)

:: Fallback standard browser
start "" "%APP_URL%"
exit /b 0
