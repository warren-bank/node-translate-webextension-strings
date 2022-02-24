@echo off

rem :: declare variables "IBM_TRANSLATOR_API_KEY" and "IBM_TRANSLATOR_API_URL"
call "%USERPROFILE%\IBM_TRANSLATOR_API_CREDENTIALS.bat"

set DIR=%~dp0.
goto :start

:translate-webextension-strings
  call node "%DIR%\..\..\bin\translate-webextension-strings.js" %*
  goto :eof

:start
set input_file=%DIR%\1-input\_locales\en\messages.json
set blacklist=-b "Cira" -b "Example.com"

:make-resource-dirs
set output_dir=%DIR%\2-output-resource-dirs
set log_file=%output_dir%\test.log
set output_dir=%output_dir%\_locales

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-webextension-strings -i "en" -o "de" -o "es" -o "fr" -f "%input_file%" -d "%output_dir%" %blacklist% -m >"%log_file%" 2>&1

:make-flat-dir-with-debug
set output_dir=%DIR%\3-output-flat-dir
set log_file=%output_dir%\test.log

if exist "%output_dir%" rmdir /Q /S "%output_dir%"
mkdir "%output_dir%"

call :translate-webextension-strings -i "en" -o "de" -o "es" -o "fr" -f "%input_file%" -d "%output_dir%" %blacklist% --debug >"%log_file%" 2>&1
