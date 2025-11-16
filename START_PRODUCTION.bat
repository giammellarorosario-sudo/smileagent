@echo off
REM SmileAgent - Avvio Produzione con PM2

echo ========================================
echo  SmileAgent - Avvio Produzione
echo ========================================
echo.

REM Verifica PM2 installato
where pm2 >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERRORE] PM2 non trovato!
    echo.
    echo Installalo con:
    echo   npm install -g pm2
    echo.
    pause
    exit /b 1
)

echo [1/4] Verifica dipendenze...
call npm install --production
if %ERRORLEVEL% NEQ 0 (
    echo [ERRORE] Installazione dipendenze fallita!
    pause
    exit /b 1
)

echo [2/4] Verifica file .env...
if not exist ".env" (
    echo [WARNING] File .env non trovato, uso .env.production
    copy .env.production .env
)

echo [3/4] Crea directory necessarie...
if not exist "data" mkdir data
if not exist "logs" mkdir logs
if not exist "uploads" mkdir uploads

echo [4/4] Avvio applicazione con PM2...
pm2 delete smileagent 2>nul
pm2 start ecosystem.config.js --env production

echo.
echo ========================================
echo   SmileAgent Avviato!
echo ========================================
echo.
echo Comandi utili:
echo   pm2 status          - Stato app
echo   pm2 logs smileagent - Vedi log
echo   pm2 stop smileagent - Ferma app
echo   pm2 restart smileagent - Riavvia app
echo.

pm2 status

pause
