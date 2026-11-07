@echo off
cd /d "%~dp0"
call npm ci
if errorlevel 1 goto failed
call node node_modules/wrangler/bin/wrangler.js login
if errorlevel 1 goto failed
call node scripts/prepare-anniversary-db.mjs
if errorlevel 1 goto failed
echo READY: Return to GitHub Desktop, Commit, then Push origin.
pause
exit /b 0
:failed
echo STOP: Preparation failed. Do not Push. Share the error message.
pause
exit /b 1
