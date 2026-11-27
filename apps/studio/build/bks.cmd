@echo off
rem The Beekeeper Studio CLI. Runs the bundled cli.js with the application
rem executable in Node mode, so no separate Node.js install is needed.
setlocal
set ELECTRON_RUN_AS_NODE=1
"%~dp0..\..\Beekeeper Studio.exe" "%~dp0cli.js" %*
set EXIT_CODE=%ERRORLEVEL%
endlocal & exit /b %EXIT_CODE%
