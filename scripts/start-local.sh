#start-local.sh
#Script para iniciar todos los servicios en modo desarrollo localmente
# chmod +x scripts/start-local.sh
# Ejecutar: npm run start:all

#Arrancar los scripts por separados
#npm --prefix "microPagespeed" run dev:4g
#npm --prefix "security-service" run dev
#npm --prefix "server" run dev:4g
#npm run dev  # frontend (desde la raíz)

# Función para lanzar un servicio con fallback de script
run_service() {
  local dir=$1
  local script=$2
  local pid_var=$3
  if [ -f package.json ]; then
    if npm run | grep -q " $script"; then
      echo "→ Iniciando $dir con script $script"
      npm run $script &
    else
      echo "⚠️  Script $script no encontrado en $dir, usando 'dev'"
      npm run dev &
    fi
    eval $pid_var=$!
  else
    echo "❌ package.json no encontrado en $dir"
  fi
}

echo "🚀 Iniciando microservicio PageSpeed..."
cd microPagespeed
run_service "microPagespeed" "dev:4g" PAGESPEED_PID
cd ..

echo "🚀 Iniciando microservicio de seguridad..."
cd security-service
run_service "security-service" "dev:4g" SECURITY_PID
cd ..

echo "🔧 Iniciando backend..."
cd server
run_service "server" "dev:4g" SERVER_PID
cd ..

echo "🚀 Iniciando Frontend..."
run_service "frontend" "dev" FRONTEND_PID

echo "✅ Servicios iniciados"
echo "PIDs: PageSpeed=$PAGESPEED_PID Security=$SECURITY_PID Server=$SERVER_PID Frontend=$FRONTEND_PID"
echo "Ctrl+C para detener"

cleanup() {
  echo "🛑 Deteniendo servicios..."
  kill $PAGESPEED_PID $SECURITY_PID $SERVER_PID $FRONTEND_PID 2>/dev/null
  exit
}

trap cleanup SIGINT SIGTERM

# Mantiene el script vivo; sin esto los procesos en background reciben SIGHUP
# cuando el shell padre termina y mueren todos los servicios
wait

wait