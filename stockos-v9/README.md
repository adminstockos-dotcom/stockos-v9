# STOCKOS v9

## SISTEMA CERRADO PARA DEMO - NO TOCAR

**4 rutas que deben estar en 200 siempre:**

| Ruta | Estado | Contenido |
|------|--------|-----------|
| `/empresa/vc512` | 200 | Túnel completo (M1+M2+M3) |
| `/empresa/nueva` | 200 | Túnel genérico idéntico |
| `/empresa/test123` | 200 | Túnel genérico idéntico |
| `/empresa/vc512/historial` | 200 | Dashboard ganadoras |

**AVISO:** Cualquier cambio nuevo debe ir en archivo NUEVO, nunca editar los 4 blindados.

---

Sistema de gestión de inventario multi-empresa con React + Vite + Tailwind CSS.

## Estado Actual

- Túnel Campañas IA (AB 8+22 días) blindado y congelado
- Módulo 1 Personas y Roles blindado
- Módulo 2 Escáner Diario P1/P2/P3 blindado
- Módulo 3 Campañas RRSS IA con Túnel AB 8+22 funcionando
- Servidor local: http://192.168.1.5:5173/empresa/vc512 (Status 200)

## Requisitos previos

1. Node.js 18+
2. npm install

## Desarrollo

```bash
npm install
npm run dev -- --host 0.0.0.0 --port 5173
```

## Credenciales SuperAdmin

```
Email: superadmin@stockos.com
Password: Sep7imo@ngel
```

## Estructura

```
stockos-v9/
├── public/logo.png              # Logo oficial STOCKOS
├── n8n/
│   └── workflow_AB_Publisher.json  # Workflow n8n para publicar AB
├── src/
│   ├── components/
│   │   ├── LogoStockOS.jsx      # Logo CSS (BLINDADO - no tocar)
│   │   ├── Header.jsx           # Header con logo
│   │   ├── SidebarEmpresa.jsx  # Menú lateral 7 módulos
│   │   └── LinkMaestroDisplay.jsx
│   ├── pages/
│   │   ├── Login.jsx            # Login SuperAdmin
│   │   ├── SuperAdmin.jsx       # CRUD empresas
│   │   ├── EmpresaDashboard.jsx # Layout 2 columnas + M1/M2
│   │   ├── CampanasIA.jsx       # M3: Túnel AB 8+22 (BLINDADO - no tocar)
│   │   ├── EscanerDiarioP123.jsx # M2: Escáner P1/P2/P3
│   │   └── empresa/
│   │       ├── BACKUP_TUNEL_COMPLETO_2024/  # Backup congelado
│   │       └── CampanasIA_TUNEL_OK.jsx     # Respaldo
│   ├── hooks/
│   │   └── useEmpresaUsers.js   # Hook usuarios por empresa
│   ├── config/
│   │   └── permisos.js          # Permisos por rol
│   └── App.jsx                  # Rutas + layouts
├── .env                         # Credenciales SuperAdmin
├── vercel.json                  # Configuración Vercel SPA
├── .opencode/
│   └── protect.json             # Archivos protegidos
└── package.json
```

## Rutas

| Ruta | Descripción | Estado |
|------|-------------|--------|
| `/login` | Login SuperAdmin | 200 |
| `/superadmin` | CRUD empresas | 200 |
| `/empresa/vc512` | Panel vc512 | 200 |
| `/empresa/nueva` | Panel genérico | 200 |
| `/empresa/test123` | Panel genérico | 200 |

## Archivos BLINDADOS - NO TOCAR

| Archivo | Motivo |
|---------|--------|
| `src/pages/CampanasIA.jsx` | Túnel AB 8+22 funcionando |
| `src/pages/EmpresaDashboard.jsx` | M1+M2 blindados |
| `src/components/LogoStockOS.jsx` | Logo blindado |
| `src/pages/Login.jsx` | Auth blindada |

## Tablas localStorage

| Key | Uso |
|-----|-----|
| `{empresaId}_campanas_ia` | Campañas del túnel |
| `{empresaId}_conectores` | Tokens de conexión |
| `{empresaId}_historial_ganadoras` | Ganadoras archivadas |
| `{empresaId}_logs_n8n` | Logs de acciones |
| `stockos_users_{subdomain}` | Usuarios M1 |
| `stockos_cargos_{subdomain}` | Cargos M1 |

## Logo

Reemplaza `public/logo.png` con tu logo oficial (no modificar el nombre del archivo).
