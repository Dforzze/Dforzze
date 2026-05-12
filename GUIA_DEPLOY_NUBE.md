# 🚀 Guía: Poner DFORZZE en la Nube (Gratis)

## ¿Qué vas a lograr?
Tu tienda conectada a internet. Tus datos guardados en la nube.
Funciona desde cualquier PC, celular, o dispositivo.

---

## PASO 1 — Crear base de datos en Supabase (5 minutos)

### 1.1 Crear cuenta
1. Ve a 👉 **https://supabase.com**
2. Click en **"Start your project"**
3. Regístrate con tu cuenta de GitHub o Google

### 1.2 Crear proyecto
1. Click en **"New Project"**
2. Ponle nombre: `dforzze`
3. Crea una contraseña (guárdala, la necesitas)
4. Región: **South America (São Paulo)** — la más cercana a Perú
5. Click **"Create new project"** — espera 2 minutos

### 1.3 Obtener la URL de conexión (interfaz actualizada)

**Método más fácil — botón "Connect":**
1. Cuando tu proyecto esté listo, verás un botón **"Connect"** arriba a la derecha
2. Click en ese botón
3. Se abre un panel — busca la sección **"Connection string"**
4. En el dropdown elige **"Nodejs"**
5. Copia la URL completa

**Si no ves "Connect", prueba por Settings:**
1. Menú izquierdo → ícono de engranaje ⚙️ → **"Project Settings"**
2. Click en **"Database"**
3. Baja hasta ver **"Connection parameters"**
4. Busca el tab o sección que diga **"URI"** o **"Connection string"**
5. Copia la URL

La URL se ve así (puede variar):
```
postgresql://postgres.xxxxxxxxxxxx:[TU-PASSWORD]@aws-0-sa-east-1.pooler.supabase.com:6543/postgres
```

> ⚠️ **Importante:** Reemplaza `[YOUR-PASSWORD]` con la contraseña que pusiste al crear el proyecto

---

## PASO 2 — Subir el código a GitHub (3 minutos)

### 2.1 Crear cuenta en GitHub
1. Ve a 👉 **https://github.com**
2. Crea una cuenta si no tienes

### 2.2 Crear repositorio
1. Click en el **"+"** arriba a la derecha
2. Click **"New repository"**
3. Nombre: `dforzze-backend`
4. Selecciona **"Private"** (privado)
5. Click **"Create repository"**

### 2.3 Subir el código
Abre una terminal en la carpeta `dforzze-backend` y ejecuta:

```bash
git init
git add .
git commit -m "DFORZZE Backend inicial"
git branch -M main
git remote add origin https://github.com/TU-USUARIO/dforzze-backend.git
git push -u origin main
```

> Reemplaza `TU-USUARIO` con tu usuario de GitHub

---

## PASO 3 — Desplegar en Railway (5 minutos)

### 3.1 Crear cuenta
1. Ve a 👉 **https://railway.app**
2. Click **"Login"** → **"Login with GitHub"**
3. Autoriza Railway

### 3.2 Crear proyecto
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Selecciona tu repositorio `dforzze-backend`
4. Railway empieza a construir automáticamente

### 3.3 Agregar variables de entorno
1. Click en tu proyecto en Railway
2. Click en la pestaña **"Variables"**
3. Agrega estas variables una por una:

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | La URL de Supabase del Paso 1.3 |
| `JWT_SECRET` | `dforzze-secret-2024-muy-seguro` |
| `JWT_REFRESH_SECRET` | `dforzze-refresh-2024-muy-seguro` |
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `FRONTEND_URL` | `*` |

4. Click **"Deploy"** para que tome los cambios

### 3.4 Obtener tu URL
1. Click en la pestaña **"Settings"**
2. Baja hasta **"Domains"**
3. Click **"Generate Domain"**
4. Te da una URL como: `dforzze-backend-production.up.railway.app`
5. **¡Guarda esa URL!** — la necesitas para el Paso 4

---

## PASO 4 — Conectar tu HTML al servidor (2 minutos)

Abre el archivo `dforzze-backend.html` y busca esta línea:

```javascript
const API_URL = 'http://localhost:3000/api';
```

Cámbiala por tu URL de Railway:

```javascript
const API_URL = 'https://dforzze-backend-production.up.railway.app/api';
```

---

## PASO 5 — ¡Listo! Verificar que funciona

1. Abre `dforzze-backend.html` en tu navegador
2. Deberías ver el indicador **"Conectado al servidor"** en verde abajo a la izquierda
3. Crea una cuenta con tu email y contraseña
4. ¡Tus datos ya están en la nube!

### Para verificar que funciona desde otra PC:
1. Copia el archivo `dforzze-backend.html` a la otra PC (o súbelo a Google Drive)
2. Abre el archivo
3. Inicia sesión con el mismo email y contraseña
4. ¡Verás todos tus stickers y pedidos!

---

## ❓ Preguntas Frecuentes

**¿Cuánto cuesta?**
- Supabase: Gratis (hasta 500MB de base de datos)
- Railway: Gratis (500 horas/mes, suficiente para uso normal)
- Total: **$0**

**¿Se pierden los datos si cierro Railway?**
No. Los datos están en Supabase (la base de datos), no en Railway. Railway solo corre el servidor.

**¿Qué pasa si me quedo sin horas gratis en Railway?**
El servidor se pausa pero los datos en Supabase siguen ahí. Puedes reactivarlo o usar otro servicio gratis como Render.com.

**¿Puedo usar esto desde mi celular?**
Sí, si subes el HTML a GitHub Pages o Netlify (también gratis), puedes acceder desde cualquier dispositivo.

---

## 🆘 Si algo falla

Escríbeme el error exacto que ves y te ayudo a resolverlo.
