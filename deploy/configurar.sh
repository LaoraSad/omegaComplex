#!/usr/bin/env bash
# ============================================================================
#  ASISTENTE DE CONFIGURACIÓN
#
#  Te va preguntando una cosa a la vez y arma el archivo .env por ti.
#  No hay que editar texto ni buscar líneas.
#
#  USO:   bash deploy/configurar.sh
# ============================================================================

CARPETA="$HOME/omega"
PUERTO_OMEGA="3010"   # el puerto que te asignaron

verde()  { echo -e "\n\033[1;32m$1\033[0m"; }
azul()   { echo -e "\033[1;34m$1\033[0m"; }
gris()   { echo -e "\033[0;90m$1\033[0m"; }
error()  { echo -e "\033[1;31m$1\033[0m"; }

pedir() {
    # $1 = qué se pide · $2 = de dónde se saca · $3 = variable
    echo ""
    azul "───────────────────────────────────────────────────────────────"
    echo "  $1"
    gris "  $2"
    azul "───────────────────────────────────────────────────────────────"
    read -rp "  Pega o escribe el valor y dale Enter: " VALOR
    if [ -z "$VALOR" ]; then
        error "  No puede quedar vacío. Vuelve a intentar."
        pedir "$1" "$2" "$3"
    fi
    eval "$3=\$VALOR"
}

if [ ! -d "$CARPETA" ]; then
    error "No encuentro la carpeta $CARPETA. Primero corre el instalador."
    exit 1
fi

cd "$CARPETA"

echo ""
echo "================================================================"
echo "  CONFIGURACIÓN DE OMEGA COMPLEX"
echo "  Te haré 8 preguntas. Si no sabes alguna, con Ctrl+C sales y"
echo "  lo intentas más tarde."
echo "================================================================"

# ---------------------------------------------------------------------------
pedir "1 de 8 · DIRECCIÓN DE LA BASE DE DATOS" \
"Ve a dashboard.supabase.com → tu proyecto → Project Settings →
 Database → Connection string → botón AZUL 'Pooler' (NO el de 'Direct').
 Copia toda la URL. Debe empezar con postgresql://" \
DATABASE_URL

pedir "2 de 8 · LLAVE SECRETA INTERNA" \
"Este valor lo genero la computadora, no tu lo copias de ningún sitio.
 Si no lo tienes a mano, en otra ventana de la terminal ejecuta:
     openssl rand -hex 32
 y copia lo que salga." \
JWT_SECRET

pedir "3 de 8 · LLAVE SECRETA DE STRIPE (privada)" \
"dashboard.stripe.com → arriba a la derecha, cambia de 'Pruebas' a
 MODO LIVE → Developers → API keys → Secret key.
 Empieza con  sk_live_ " \
STRIPE_SECRET_KEY

pedir "4 de 8 · LLAVE PÚBLICA DE STRIPE" \
"Mismo lugar que la anterior. Publishable key.
 Empieza con  pk_live_ " \
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY

pedir "5 de 8 · LLAVE DE RESEND (correos con el QR)" \
"resend.com → API Keys → Create API Key → Create.
 Empieza con  re_ " \
RESEND_API_KEY

pedir "6 de 8 · CLIENT ID DE GOOGLE" \
"console.cloud.google.com → APIs y servicios → Credenciales →
 Credentials → tu cliente de OAuth 2.0 → Client ID.
 Termina en  .apps.googleusercontent.com" \
GOOGLE_CLIENT_ID

pedir "7 de 8 · CLIENT SECRET DE GOOGLE" \
"Mismo lugar, justo abajo del Client ID.
 OJO: genera uno NUEVO, no uses el de desarrollo." \
GOOGLE_CLIENT_SECRET

pedir "8 de 8 · CONTRASEÑA DEL ADMINISTRADOR" \
"Esta es la contraseña con la que vas a entrar a /admin.
 Inventa una ahora. No la pongas en otro sitio." \
ADMIN_PASSWORD

# Llave del cron, generada aquí mismo.
CRON=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p | tr -d '\n')

verde "Escribiendo el archivo .env"

cat > .env <<EOF
# ==============================================================
#  CONFIGURACIÓN DE OMEGA COMPLEX
#  Generada el $(date '+%Y-%m-%d %H:%M')
#  NO compartas este archivo.
# ==============================================================

DATABASE_URL="$DATABASE_URL"
JWT_SECRET="$JWT_SECRET"

NEXT_PUBLIC_APP_URL=https://omegacomplex.coderhivex.com

STRIPE_SECRET_KEY="$STRIPE_SECRET_KEY"
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="$NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
STRIPE_WEBHOOK_SECRET=

RESEND_API_KEY="$RESEND_API_KEY"
RESEND_FROM_EMAIL=Omega Complex <onboarding@resend.dev>

GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID"
GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET"

VERIFICATION_CODE_TTL_MINUTES=15
VERIFICATION_CODE_LENGTH=6

ADMIN_EMAIL=admin@omegacomplex.com
ADMIN_PASSWORD="$ADMIN_PASSWORD"

CRON_SECRET="$CRON"

# n8n vacío = los correos salen directo por Resend
N8N_WEBHOOK_URL=
N8N_WEBHOOK_SECRET=

# Puerto de Omega Complex en este servidor
PUERTO_APP=$PUERTO_OMEGA
EOF

chmod 600 .env

echo ""
verde "✓ Archivo .env creado correctamente"
echo ""
echo "  Ahora corre el instalador otra vez para encender todo:"
echo ""
echo "      sudo bash deploy/instalar.sh"
echo ""
echo "  Cuando termine, solo falta:"
echo ""
echo "      sudo certbot --nginx -d omegacomplex.coderhivex.com"
echo ""
