@echo off
cd /d "%~dp0"
call node scripts/configure-kakao.mjs
if errorlevel 1 (
 echo STOP: Do not Push yet. Check the error above.
)
pause
