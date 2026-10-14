#!/usr/bin/env bash
# ============================================================================
#  INSTALADOR DE OMEGA COMPLEX
#
#  Este script hace todo lo repetitivo por ti:
#    1. Instala Docker
#    2. Instala nginx y certbot (el candado de https)
#    3. Copia el proyecto desde GitHub
#    4. Prepara el archivo de configuración (.env)
#    5. Levanta la aplicación
#    6. Configura nginx para omegacomplex.coderhivex.com
#
#  SOLO TIENES QUE CORRER:   sudo bash deploy/instalar.sh
# ============================================================================

set -e

DOMINIO="omegacomplex.coderhivex.com"
USUARIO_APP="omega"

titulo() {
    echo ""
    echo "============================================================"
    echo "  $1"
    echo "============================================================"
}

# Si no somos root, usamos sudo para todo lo que lo necesite.
if [ "$(id -u)" -ne 0 ]; then
    SUDO="sudo"
else
    SUDO=""
fi

titulo "PASO 1 de 6  ·  Preparando el sistema"
$SUDO apt update -qq
$SUDO apt install -y -qq curl git ca-certificates > /dev/null
echo "  OK  sistema actualizado"

titulo "PASO 2 de 6  ·  Instalando Docker"
if ! command -v docker > /dev/null 2>&1; then
    curl -fsSL https://get.docker.com | $SUDO sh > /dev/null 2>&1
fi
$SUDO systemctl enable --now docker > /dev/null 2>&1
echo "  OK  Docker instalado: $(docker --version)"

titulo "PASO 3 de 6  ·  Instalando nginx (el que pone el candado https)"
$SUDO apt install -y -qq nginx > /dev/null
$SUDO systemctl enable --now nginx > /dev/null 2>&1
echo "  OK  nginx instalado"

titulo "PASO 4 de 6  ·  Descargando el proyecto"
CARPETA="$HOME/$USUARIO_APP"
if [ -d "$CARPETA/.git" ]; then
    echo "  El proyecto ya existe, se actualiza"
    cd "$CARPETA"
    git pull origin main
else
    git clone https://github.com/LaoraSad/omegaComplex.git "$CARPETA" > /dev/null 2>&1
    cd "$CARPETA"
    git checkout main > /dev/null 2>&1
fi
echo "  OK  proyecto en $CARPETA"

titulo "PASO 5 de 6  ·  Archivo de configuración"
if [ -f ".env" ]; then
    echo "  Tu .env ya existe, se deja como está"
    echo ""
    echo "  ⚠  Si vas a cambiar llaves, edítalo con:  nano .env"
else
    cp deploy/plantilla-env.txt .env
    chmod 600 .env
    echo "  Se creó el archivo .env"
    echo ""
    echo "  ┌──────────────────────────────────────────────────────┐"
    echo "  │  NECESITAS EDITAR 6 LÍNEAS ANTES DE CONTINUAR     │"
    echo "  │                                                      │"
    echo "  │  Busca las líneas que empiezan con  <<<  y pon      │"
    echo "  │  los valores reales después del  =                   │"
    echo "  │                                                      │"
    echo "  │  1. DATABASE_URL              (Supabase > Pooler)   │"
    echo "  │  2. JWT_SECRET                (openssl rand -hex 32) │"
    echo "  │  3. STRIPE_SECRET_KEY         (sk_live_...)         │"
    echo "  │  4. NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY (pk_live_..) │"
    echo "  │  5. RESEND_API_KEY            (re_...)              │"
    echo "  │  6. GOOGLE_CLIENT_ID y GOOGLE_CLIENT_SECRET         │"
    echo "  │     ADMIN_PASSWORD            (la que quieras)      │"
    echo "  └──────────────────────────────────────────────────────┘"
    echo ""
    echo "  Para editarlo:   nano .env"
    echo "  Para guardar:    Ctrl+O, Enter, Ctrl+X"
    echo ""
    echo "  >>> CUANDO TERMINES DE EDITAR, VUELVE A CORRER ESTE SCRIPT <<<"
    echo ""
    exit 0
fi

# Si sigue having placeholders, mejor parar que arrancar roto.
if grep -q "PEGA_AQUI\|PUNTO\|\[TU-" .env; then
    echo "  ⚠  EL ARCHIVO .env AÚN TIENE VALORES DE EJEMPLO"
    echo ""
    echo "  Ábrelo y completa las 6 líneas:   nano .env"
    echo "  (Ctrl+O, Enter, Ctrl+X para guardar)"
    echo ""
    exit 0
fi

titulo "PASO 6 de 6  ·  Encendiendo la aplicación"
echo "  Esto puede tardar 3-5 minutos la primera vez. Espera."
echo ""
docker compose up -d --build

# Esperar a que esté sana antes de seguir.
echo ""
echo "  Esperando a que la aplicación esté lista..."
for i in $(seq 1 40); do
    ESTADO=$(docker inspect --format='{{.State.Health.Status}}' "$USUARIO_APP-web-1" 2>/dev/null || echo "starting")
    if [ "$ESTADO" = "healthy" ]; then
        echo "  ✓  La aplicación está CORRIENDO"
        break
    fi
    if [ "$i" = "40" ]; then
        echo "  ⚠  Tardó más de lo esperado. Revisa con: docker compose logs web"
        break
    fi
    sleep 5
done

titulo "PASO DE nginx"
cp deploy/nginx.conf /etc/nginx/sites-available/omega 2>/dev/null
ln -sf /etc/nginx/sites-available/omega /etc/nginx/sites-enabled/omega
rm -f /etc/nginx/sites-enabled/default
nginx -t > /dev/null 2>&1 && systemctl reload nginx && echo "  OK  nginx configurado para $DOMINIO"

titulo "¡LISTO! Solo falta el candado https"
echo ""
echo "  Ejecuta este comando:"
echo ""
echo "      sudo certbot --nginx -d $DOMINIO"
echo ""
echo "  Te preguntará 4 cosas:"
echo "    · tu email            -> escribelo"
echo "    · ¿aceptas términos?  -> Y"
echo "    · ¿compartir email?   -> N"
echo "    - ¿redirigir a https? -> 2"
echo ""
echo "  Cuando termine, abre en el navegador:"
echo ""
echo "      https://$DOMINIO"
echo ""
echo "  Panel de administración:"
echo "      https://$DOMINIO/admin"
echo ""
echo "  Comandos útiles (memorízalos):"
echo "    docker compose ps               ver si está vivo"
echo "    docker compose logs -f web      ver los logs en vivo"
echo "    docker compose restart web      reiniciar"
echo "    sudo certbot renew --force      renovar el https"
echo ""
