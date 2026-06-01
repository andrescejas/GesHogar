# GesHogar

Aplicación web para administrar finanzas personales o familiares: movimientos, categorías, tarjetas, proyecciones mensuales, comparativos y reportes.

## Stack

- React + Vite
- Tailwind CSS
- React Router
- Firebase / Cloud Firestore
- Recharts
- Lucide React

## Desarrollo local

```bash
npm install
npm run dev
```

En Windows, si PowerShell bloquea `npm.ps1` por ExecutionPolicy, usar:

```bash
npm.cmd run dev
```

## Scripts

- `npm run dev`: levanta Vite en modo desarrollo.
- `npm run build`: genera el build de producción en `dist/`.
- `npm run lint`: corre ESLint.
- `npm run preview`: sirve el build generado.
- `npm run backup`: exporta las colecciones de Firestore a `backups/`.

## Modulos principales

- Dashboard: resumen mensual real vs proyectado.
- Movimientos: alta, edicion, baja y busqueda de ingresos/egresos.
- Categorías: administración jerárquica de categorías y subcategorías.
- Tarjetas: medios de pago.
- Proyecciones: presupuestos mensuales y recurrentes.
- Comparativo: desvío entre lo previsto y lo real.
- Reporte: detalle filtrado por mes, categoría y subcategoría.
- Configuración: estado general y accesos de mantenimiento.

## Datos

La app sincroniza en tiempo real con Firestore usando las colecciones:

- `categorias`
- `subcategorias`
- `tarjetas`
- `movimientos`
- `proyecciones`

## Backup

Para generar una copia local de contingencia:

```bash
npm run backup
```

El archivo se crea en `backups/backup-<timestamp>.json`. La carpeta `backups/` está ignorada por Git para no subir datos personales al repositorio.
