@echo off
rem Creates a "Task Timer" shortcut (stopwatch icon) on the desktop and in this folder.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\create-shortcut.ps1"
pause
