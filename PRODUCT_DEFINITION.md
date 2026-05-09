# Documento de Definición de Producto (PRD) - GesHogar

## 1. Visión General
**GesHogar** es una aplicación web financiera de uso personal/familiar, diseñada bajo un enfoque minimalista y moderno. Su principal objetivo es llevar el control y la administración de la economía del hogar de forma sencilla, permitiendo registrar ingresos, egresos y realizar comparativas entre lo planificado (proyectado) y lo real.

## 2. Objetivos del Producto
- Centralizar la gestión de las finanzas del hogar en una plataforma accesible desde cualquier dispositivo (Desktop y Mobile).
- Proveer una estructura de datos jerárquica que permita categorizar y sub-categorizar los movimientos financieros para un análisis más profundo.
- Facilitar la proyección financiera mensual y compararla gráficamente con la realidad ejecutada.
- Mantener la simplicidad evitando flujos de autenticación complejos (pensado para uso local/familiar directo) y operando en la nube con sincronización en tiempo real.

## 3. Funcionalidades Principales

### 3.1. Dashboard (Panel Principal)
- **Resumen Financiero:** Visualización rápida del Saldo Actual, Ingresos del mes y Egresos del mes mediante tarjetas destacadas.
- **Comparativo Rápido:** Análisis presupuestario y gráficos de consumo calculados utilizando el monto proyectado y ejecutado por **Subcategoría**.
- **Últimos Movimientos:** Lista rápida de las transacciones más recientes.
- **Últimos Movimientos:** Lista rápida de las transacciones más recientes.

### 3.2. Gestión de Movimientos (Transacciones)
- Registro completo de ingresos y egresos (ABM/CRUD).
- Campos capturados:
  - **Fecha** del movimiento.
  - **Tipo:** Ingreso o Egreso.
  - **Categoría y Subcategoría** vinculada.
  - **Descripción.**
  - **Responsable:** Miembro del hogar asignado (ej. Andres, Cecilia, Agustin).
  - **Monto.**
  - **Estado:** Pagado, Pendiente, Proyectado.
- Buscador inteligente multi-campo integrado en el historial.

### 3.3. Estructura Jerárquica (Categorías y Subcategorías)
- **Subcategorías (Unidad Principal):** Pasan a ser la unidad real de análisis financiero, presupuestaria y de proyección. Toda Subcategoría debe pertenecer a una Categoría padre.
- **Categorías (Agrupador Visual):** Funcionan únicamente como organización visual, agrupación jerárquica y navegación (ej. "Alimentación").
- Asignación de íconos representativos para una rápida identificación visual.

### 3.4. Análisis Comparativo y Proyecciones
- **Proyecciones Mensuales:** Las proyecciones se realizan exclusivamente por **Subcategoría** (monto proyectado, monto real, diferencia y porcentaje consumido).
- **Comparativo:** Módulo que contrasta el `Monto Proyectado` versus el `Monto Real` ejecutado por Subcategoría, mostrando la Categoría únicamente como encabezado agrupador. Permite detectar desvíos y alertas de sobreconsumo.

## 4. Arquitectura y Stack Tecnológico

### 4.1. Frontend (Interfaz de Usuario)
- **Framework:** React.js optimizado mediante Vite.
- **Estilos:** Tailwind CSS, utilizando variables de entorno y utilidades para garantizar diseño responsive (mobile-first) y un esquema de colores limpio (UI minimalista con componentes personalizados como Cards, Modals y Badges).
- **Iconografía:** Lucide-React.
- **Enrutamiento:** React Router (presumiblemente para la navegación entre Dashboard, Movimientos, Categorías, Proyecciones y Comparativo).

### 4.2. Backend & Base de Datos
- **Plataforma:** Firebase (BaaS).
- **Base de Datos:** Cloud Firestore (NoSQL). Sincronización en tiempo real (`onSnapshot`) para que las actualizaciones se reflejen instantáneamente sin recargar la página.
- **Colecciones Principales:** `categorias`, `subcategorias`, `movimientos`, `proyecciones`.

### 4.3. Infraestructura y Despliegue
- **Control de Versiones:** Git / GitHub (`main` / `dev` branches).
- **Hosting:** Vercel (Integración continua que detecta cambios en la rama de producción y hace deploy automáticamente).

## 5. Criterios de Diseño (UI/UX)
- **Mobile Responsiveness:** Todas las tablas, modales y barras de navegación (Sidebar) están adaptadas para funcionar cómodamente en pantallas táctiles de dispositivos móviles.
- **Interacciones Rápidas:** Modales ágiles para ingreso de datos sin recargar la pantalla.
- **Feedback Visual:** Uso de colores semánticos (Verde para ingresos/pagado, Rojo/Rosa para egresos, Ámbar para pendientes).

## 6. Futuras Iteraciones (Roadmap)
*(Posibles características a agregar en base a la evolución natural de la app)*
- Soporte para múltiples meses/filtros históricos más avanzados.
- Gráficos estadísticos dinámicos (Ej. Recharts o Chart.js) para análisis anual.
- Autenticación o control de acceso si se expande fuera de la red de confianza.
