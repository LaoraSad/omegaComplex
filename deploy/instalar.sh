#!/usr/bin/env bash
# ============================================================================
#  INSTALADOR DE OMEGA COMPLEX  · versión segura para servidor compartido
#
#  Este script instala Omega Complex SIN tocar lo que ya tengas desplegado:
#    · no borra ningún sitio de nginx que exista
#    · no detiene ningún contenedor ajeno
#    · no reinicia nginx si la configuración nueva no valida
#    · si el puerto 3000 está ocupado, elige otro libre
#
#  SOLO TIENES QUE CORRER:   sudo bash deploy/instalar.sh
# ============================================================================

set -e

DOMINIO="omegacomplex.coderhivex.com"
CARPETA="$HOME/omega"
SITIO_NGINX="/etc/nginx/sites-available/omega"

titulo() {
    echo ""
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
}

aviso() { echo "  $1"; }

if [ "$(id -u)" -ne 0 ]; then SUDO="sudo"; else SUDO=""; fi

# ---------------------------------------------------------------------------
titulo "PASO 1 de 6  ·  Mirando qué hay ya en el servidor"
# Esto NO cambia nada. Solo informa, para que sepas qué hay antes de instalar.
# ---------------------------------------------------------------------------
aviso "Contenedores Docker que ya están corriendo:"
if command -v docker > /dev/null 2>&1; then
    docker ps --format '    · {{.Names}}  →  puerto {{.Ports}}' 2>/dev/null || echo "    (ninguno)"
else
    echo "    (Docker aún no está instalado)"
fi
echo ""
aviso "Sitios de nginx ya configurados:"
if [ -d /etc/nginx/sites-enabled ]; then
    ls -1 /etc/nginx/sites-enabled/ 2>/dev/null | sed 's/^/    · /' || echo "    (ninguno)"
else
    echo "    (nginx aún no está instalado)"
fi
echo ""
aviso "Puertos que ya están en uso:"
if command -v ss > /dev/null 2>&1; then
    ss -ltn 2>/dev/null | awk 'NR>1 {print "    · puerto " $4}' | head -10
else
    echo "    (no se pudo revisar)"
fi
echo ""

# ---------------------------------------------------------------------------
titulo "PASO 2 de 6  ·  Instalando Docker (solo si no está)"
# ---------------------------------------------------------------------------
if command -v docker > /dev/null 2>&1; then
    aviso "Docker ya estaba instalado: $(docker --version)"
    aviso "NO se toca la configuración existente."
else
    $SUDO apt update -qq
    $SUDO apt install -y -qq curl git ca-certificates > /dev/null
    curl -fsSL https://get.docker.com | $SUDO sh > /dev/null 2>&1
    $SUDO systemctl enable --now docker > /dev/null 2>&1
    aviso "Docker instalado: $(docker --version)"
fi

# ---------------------------------------------------------------------------
titulo "PASO 3 de 6  ·  Instalando nginx (solo si no está)"
# ---------------------------------------------------------------------------
if command -v nginx > /dev/null 2>&1; then
    aviso "nginx ya estaba instalado: no se modifica su configuración aún"
else
    $SUDO apt update -qq
    $SUDO apt install -y -qq nginx > /dev/null
    $SUDO systemctl enable --now nginx > /dev/null 2>&1
    aviso "nginx instalado"
fi

# ---------------------------------------------------------------------------
titulo "PASO 4 de 6  ·  Descargando el proyecto"
# ---------------------------------------------------------------------------
if [ -d "$CARPETA/.git" ]; then
    aviso "Omega ya estaba descargado, se actualiza"
    cd "$CARPETA"
    git pull origin main
else
    git clone https://github.com/LaoraSad/omegaComplex.git "$CARPETA" > /dev/null 2>&1
    cd "$CARPETA"
    git checkout main > /dev/null 2>&1
    aviso "Proyecto descargado en $CARPETA"
fi

# ---------------------------------------------------------------------------
titulo "PASO 5 de 6  ·  Archivo de configuración"
# ---------------------------------------------------------------------------
if [ ! -f ".env" ]; then
    cp deploy/plantilla-env.txt .env
    chmod 600 .env
    # Puerto libre para nuestra app (respeta el de la otra persona si existe).
    PUERTO=3000
    while ss -ltn 2>/dev/null | grep -q ":$PUERTO "; do
        PUERTO=$((PUERTO + 10))
    done
    echo "" >> .env
    echo "PUERTO_APP=$PUERTO" >> .env
    aviso "Se creó .env"
    aviso "Puerto asignado para Omega: $PUERTO"
    echo ""
    echo "  ┌──────────────────────────────────────────────────────┐"
    echo "  │  NECESITAS EDITAR 6 LÍNEAS ANTES DE CONTINUAR     │"
    echo "  │                                                      │"
    echo "  │  1. DATABASE_URL               (Supabase > Pooler)  │"
    echo "  │  2. JWT_SECRET                 (openssl rand -hex 32)│"
    echo "  │  3. STRIPE_SECRET_KEY          (sk_live_...)        │"
    echo "  │  4. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_..)  │"
    echo "  │  5. RESEND_API_KEY             (re_...)             │"
    echo "  │  6. GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET         │"
    echo "  │     ADMIN_PASSWORD             (la que quieras)     │"
    echo "  └──────────────────────────────────────────────────────┘"
    echo ""
    aviso "Para editarlo:  nano .env   (Ctrl+O, Enter, Ctrl+X para guardar)"
    echo ""
    aviso "CUANDO TERMINES DE EDITAR, VUELVE A CORRER ESTE SCRIPT."
    exit 0
fi

if grep -q "PEGA_AQUI\|PUNTO\|\[TU-" .env; then
    aviso "EL ARCHIVO .env AÚN TIENE VALORES DE EJEMPLO"
    echo ""
    aviso "Edítalo:  nano .env   (Ctrl+O, Enter, Ctrl+X para guardar)"
    exit 0
fi

# Puerto configurado (o el que se haya detectado antes).
PUERTO=$(grep -E '^PUERTO_APP=' .env | cut -d= -f2 | tr -d '[:space:]')
[ -z "$PUERTO" ] && PUERTO=3000

# ---------------------------------------------------------------------------
titulo "PASO 6 de 6  ·  Encendiendo Omega Complex"
# ---------------------------------------------------------------------------
aviso "Esto tarda 3-5 minutos la primera vez. Espera."
docker compose up -d --build

echo ""
aviso "Esperando a que la aplicación esté lista..."
LISTO="no"
for i in $(seq 1 40); do
    if [ "$LISTO" = "no" ]; then
        ESTADO=$(docker inspect --format='{{.State.Health.Status}}' omega-web 2>/dev/null || echo "starting")
        if [ "$ESTADO" = "healthy" ]; then
            LISTO="si"
            echo "  ✓ La aplicación está CORRIENDO en el puerto $PUERTO"
            break
        fi
    fi
    [ "$i" = "40" ] && echo "  ⚠ Tardó más de lo esperado. Revisa con: docker compose logs web"
    sleep 5
done

# ---------------------------------------------------------------------------
titulo "Configurando nginx para $DOMINIO"
# ---------------------------------------------------------------------------
# IMPORTANTE: no se borra ningún sitio previo. Solo se añade el nuestro.
sed "s/127.0.0.1:3000/127.0.0.1:$PUERTO/g" deploy/nginx.conf > /tmp/omega-nginx.conf
$SUDO cp /tmp/omega-nginx.conf "$SITIO_NGINX"
$SUDO ln -sf "$SITIO_NGINX" /etc/nginx/sites-enabled/omega

# Solo se recarga si la configuración completa sigue siendo válida.
if $SUDO nginx -t > /dev/null 2>&1; then
    $SUDO systemctl reload nginx
    aviso "nginx configurado. Omega responde en 127.0.0.1:$PUERTO"
else
    # Si algo no cuadra, se deshace lo nuestro para no dejar nginx caído.
    $SUDO rm -f /etc/nginx/sites-enabled/omega
    aviso "✗ La configuración de nginx no validó."
    aviso "  Se quitó Omega de nginx y NO se reinició nginx."
    aviso "  El servidor sigue como estaba. Revisa con: sudo nginx -t"
    exit 1
fi

echo ""
echo "  Sitios de nginx ahora:"
ls -1 /etc/nginx/sites-enabled/ | sed 's/^/    · /'

titulo "¡LISTO! Solo falta el candado https"
echo ""
echo "  Ejecuta:"
echo ""
echo "      sudo certbot --nginx -d $DOMINIO"
echo ""
echo "  Te preguntará 4 cosas:"
echo "    · tu email            -> escribelo"
echo "    · ¿aceptas términos?  -> Y"
echo "    · ¿compartir email?   -> N"
echo "    · ¿redirigir a https? -> 2"
echo ""
echo "  Después abre:  https://$DOMINIO"
echo "  Panel:         https://$DOMINIO/admin"
echo ""
echo "  Comandos útiles (desde $CARPETA):"
echo "    docker compose ps              ver si está vivo"
echo "    docker compose logs -f web     ver los logs"
echo "    docker compose restart web     reiniciar"
echo "    sudo certbot renew --force     renovar el https"
echo ""
