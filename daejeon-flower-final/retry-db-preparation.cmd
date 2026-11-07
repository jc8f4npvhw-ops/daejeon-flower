@echo off
cd /d "%~dp0"
if not exist node_modules\wrangler\bin\wrangler.js (
 echo STOP: Run prepare-deploy.cmd first to install dependencies.
 pause
 exit /b 1
)
call node scripts/prepare-anniversary-db.mjs
if errorlevel 1 (
 echo STOP: Do not Push. Share this error screen.
 pause
 exit /b 1
)
echo READY: Commit the fix in GitHub Desktop, then Push origin.
pause
