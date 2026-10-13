# 📘 GesHogar - Instructivo Oficial de Archivos e Importación Mensual

Este documento define el procedimiento operativo estándar para la generación, descarga e importación de movimientos bancarios y resúmenes de tarjetas en **GesHogar**.

---

## 📑 1. Mapa de Cuentas, Archivos y Formatos

Toda la economía del hogar se compone de estas fuentes de datos distribuidas por titular:

| Titular | Entidad / Medio | Cómo se genera / Dónde se descarga | Formato Requerido | Archivo Típico |
| :--- | :--- | :--- | :---: | :--- |
| **Andrés** | 🔷 **Mercado Pago** | App / Web MP $\rightarrow$ *Informes y extractos* $\rightarrow$ *Resumen de cuenta en pesos mensual* | **`.pdf`** *(o `.csv`)* | `Resumen_MP_Andres.pdf` |
| **Andrés** | 🏦 **Santander (Caja de Ahorro)** | Online Banking $\rightarrow$ *Cuentas* $\rightarrow$ *Movimientos del mes* $\rightarrow$ *Exportar* | **`.xlsx`** | `Santander.xlsx` |
| **Andrés** | 💳 **Santander (Visa)** | Online Banking $\rightarrow$ *Tarjetas* $\rightarrow$ *Visa* $\rightarrow$ *Último Resumen* $\rightarrow$ *Descargar Excel* | **`.xlsx`** | `Visa.xlsx` |
| **Andrés** | 💳 **Santander (Amex)** | Online Banking $\rightarrow$ *Tarjetas* $\rightarrow$ *Amex* $\rightarrow$ *Último Resumen* $\rightarrow$ *Descargar Excel* | **`.xlsx`** | `Último resumen - American Express....xlsx` |
| **Andrés** | 🟠 **Naranja X** | App Naranja X $\rightarrow$ *Cuentas* $\rightarrow$ *Gestioná tu cuenta* $\rightarrow$ *Documentos de la cuenta* $\rightarrow$ *Descargar los detalles de saldos y movimientos* | **`.pdf`** | `Resumen_NaranjaX_Andres.pdf` |
| **Cecilia** | 🔷 **Mercado Pago** | App / Web MP $\rightarrow$ *Informes y extractos* $\rightarrow$ *Resumen de cuenta en pesos mensual* | **`.pdf`** *(o `.csv`)* | `Resumen_MP_Cecilia.pdf` |
| **Cecilia** | 🟠 **Naranja X** | App Naranja X $\rightarrow$ *Cuentas* $\rightarrow$ *Gestioná tu cuenta* $\rightarrow$ *Documentos de la cuenta* $\rightarrow$ *Descargar los detalles de saldos y movimientos* | **`.pdf`** | `Resumen_NaranjaX_Cecilia.pdf` |
| **Cecilia** | 🏦 **Bancor (Caja de Ahorro)** | Home Banking Bancor $\rightarrow$ *Cuentas* $\rightarrow$ *Clic en la cuenta* $\rightarrow$ *Movimientos Históricos* $\rightarrow$ *Descargar consulta en Excel* | **`.xlsx` / `.xls`** | `CA $ 923...Movimientos.xls` |
| **Cecilia** | 💳 **Bancor (Cordobesa)** | Home Banking Bancor $\rightarrow$ *Tarjetas* $\rightarrow$ *Resumen mensual cerrado* | **`.pdf`** | `2026-09-24.pdf` |

> 💡 **Nota sobre los nombres de archivo:**
> Los nombres indicados en la columna *"Archivo Típico"* son meramente de referencia/descarga por defecto. Podés cambiarles el nombre libremente para organizarlos mejor (por ejemplo: `Bancor_Septiembre.xlsx`, `NaranjaX_09_2026.pdf`, `MP_Andres_Octubre.pdf`, etc.). GesHogar inspecciona la **estructura interna y contenido** de cada archivo, por lo que mientras mantengas el formato/extensión original (`.csv`, `.xlsx`/`.xls` o `.pdf`), el importador los reconocerá y procesará correctamente.

---

## 🔍 2. Guía Específica de Descarga por Entidad

### A) 🔷 Mercado Pago (Resumen Mensual Oficial en PDF)

Tanto **Andrés** como **Cecilia** pueden descargar su resumen mensual oficial en PDF siguiendo estos pasos:

* **Desde la App Móvil (Recomendado):**
  1. Abrir la app de **Mercado Pago**.
  2. Ir a **Tu Perfil** (ícono de usuario / menú lateral).
  3. Ingresar a **Informes y extractos** (o *Documentos de cuenta* $\rightarrow$ *Resúmenes de cuenta*).
  4. Seleccionar la opción **Resumen de cuenta en pesos**.
  5. Elegir el mes calendario a conciliar (por ejemplo: Septiembre u Octubre).
  6. Pulsar en **Descargar en PDF** (genera el documento oficial *"RESUMEN DE CUENTA EN PESOS"* con saldo inicial, entradas, salidas y detalle de movimientos).

* **Desde la Web (Computadora):**
  1. Ingresar a [mercadopago.com.ar](https://www.mercadopago.com.ar).
  2. Ir a la sección **Informes** / **Extractos** o **Tu cuenta** $\rightarrow$ **Resumen de cuenta**.
  3. Seleccionar el período mensual y descargar en formato **`.pdf`**.

*(Nota: Si por alguna razón descargás el reporte manual en formato `.csv`, GesHogar sigue siendo 100% compatible con ambos formatos).*

---

### B) 🏦 Banco Santander

* **Caja de Ahorro / Cuenta en Pesos (Paso a Paso Web):**
  1. Ingresar a *Online Banking Santander* desde la computadora.
  2. En el menú superior o lateral, ingresar a **Cuentas**.
  3. Asegurarse de estar en la pestaña **Movimientos en Pesos**.
  4. En el panel de búsqueda / filtros (abrirlo con la lupa si estuviera cerrado):
     * **Desde:** Ingresar el primer día del mes a conciliar (ej: `01/09/2026`).
     * **Hasta:** Ingresar el último día del mes (ej: `30/09/2026`).
     * *(Dejar el campo "Palabra clave" vacío para que traiga la totalidad de los movimientos).*
  5. **Paso Clave:** Hacer clic en el botón rojo **`Buscar`** para que la tabla actualice y liste los movimientos del rango elegido.
  6. En la barra de herramientas de la tabla de resultados (al lado o debajo), hacer clic en la opción de **Descargar / Exportar a Excel (`.xlsx`)**.
  7. El archivo descargado (que internamente genera la hoja de cálculo con nombre `UltimosMovimientos`) se guarda en tu carpeta (por ejemplo como `Santander.xlsx`).

* **Tarjetas de Crédito Santander (Visa y American Express):**
  1. Menú *Tarjetas* $\rightarrow$ Seleccionar la tarjeta correspondiente (*Visa* o *American Express*).
  2. Ir al apartado de **Último Resumen** o consultar movimientos del período cerrado.
  3. Clic en el botón **Descargar a Excel (`.xlsx`)**.

---

### C) 🏦 Banco de Córdoba (Bancor)
* **Caja de Ahorro (Cecilia):**
  1. Ingresar a *Bancor Home Banking*.
  2. Ir a la sección **Cuentas**.
  3. Hacer clic sobre la **cuenta** (Caja de Ahorro en pesos).
  4. Ingresar a **Movimientos Históricos**.
  5. Aplicar el **filtro** de fechas para el mes a conciliar.
  6. Hacer clic en **Descargar consulta en Excel** (genera archivo `.xls` / `.xlsx` tipo `CA $ 923 0001258103-Movimientos.xls`).
* **Tarjeta Cordobesa Mastercard (Cecilia):**
  1. Menú *Tarjetas* $\rightarrow$ *Cordobesa*.
  2. Descargar el **Resumen de cuenta cerrado en formato `.pdf`** (el resumen oficial con fecha de cierre, compras y cuotas).

---

### D) 🟠 Naranja X (Detalle de Saldos y Movimientos)
1. Ingresar a la app de **Naranja X**.
2. Entrar a la sección **Cuentas**.
3. Seleccionar **Gestioná tu cuenta**.
4. Elegir **Documentos de la cuenta**.
5. Ir a **Descargar los detalles de saldos y movimientos**.
6. Elegir el **año** y el **mes** a conciliar.
7. Descargar el archivo en formato **PDF (`.pdf`)**.

---

## 🚀 3. Circuito de Importación en GesHogar

El importador inteligente de GesHogar unifica todos estos formatos sin necesidad de convertir nada.

### Paso 1: Abrir el importador
* En GesHogar, dirigirse a la pantalla de **Movimientos**.
* En la cabecera superior derecha, hacer clic en el botón:
  👉 **`⬆ Importar Resumen`**

### Paso 2: Subir el archivo
1. Arrastrar el archivo (`.xlsx`, `.csv` o `.pdf`) o seleccionarlo desde tu carpeta.
2. **Auto-Detección:** El sistema reconoce automáticamente qué entidad y tarjeta es:
   * Detecta si es *Mercado Pago*, *Visa Santander*, *Amex Santander*, *Santander Caja de Ahorro*, *Bancor Caja de Ahorro*, *Cordobesa* o *Naranja X*.
3. **Responsable Automático:**
   * Si es de Bancor o Cordobesa, preselecciona **Cecilia**.
   * Si es de Santander, preselecciona **Andrés**.
   * Podés cambiar el titular con el desplegable si hiciera falta.
4. Clic en **`Continuar a Previsualización ➔`**.

### Paso 3: Previsualización Inteligente
En la grilla previa vas a ver cada movimiento clasificado:
* 🟢 **Computables listos:** Ya tienen asignada Categoría y Subcategoría gracias a las reglas automáticas.
* ⚪ **Excluidos (No computan):** Pagos de resumen de tarjeta, transferencias entre cuentas propias o ingresos de dinero propios. *Vienen desmarcados por defecto para evitar doble cómputo de gastos.*
* ⚠️ **Sin Categoría:** Comercios nuevos no reconocidos.
  * Elegí la **Categoría** y **Subcategoría** directamente en esa fila.
  * Dejá tildada la casilla **"Guardar regla"** *(GesHogar la memoriza en la base de datos para que en los próximos meses se clasifique sola)*.

### Paso 4: Confirmación y Guardado
* Clic en **`Confirmar e Importar X movimientos`**.
* Todas las transacciones se insertan por lote en Firestore y actualizan instantáneamente saldos, gráficos y comparativos.

---

## 🛡️ 4. Reglas Antidoble-Cómputo (Buenas Prácticas)

1. **Las compras entran por la tarjeta:**
   * Si compraste en el súper con Visa o Cordobesa, ese consumo se computa con la tarjeta.
2. **Los débitos de pago de resumen no son gastos:**
   * Cuando a fin de mes el banco debita de tu cuenta *"PAGO DE RESUMEN VISA"*, el importador lo reconoce y lo marca como **No Computable**.
   * **Nunca marques como computable el pago del resumen**, de lo contrario estarías pagando y contando la misma compra dos veces.
3. **Transferencias entre cuentas del hogar:**
   * Las transferencias entre Andrés y Cecilia están excluidas por reglas internas para no inflar artificialmente los ingresos ni los gastos del hogar.

---

## 📅 5. Rutina Mensual Recomendada

```
┌─────────────────────────────────────────────────────────────┐
│  Días 24 al 28 de cada mes:                                 │
│  ► Cierran las tarjetas de crédito (Cordobesa, Visa, Amex). │
│  ► Descargar e importar los 3 resúmenes de tarjetas.        │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Días 1 al 5 del mes siguiente:                             │
│  ► Cierra el mes calendario de las cuentas bancarias.       │
│  ► Descargar e importar:                                    │
│     - Mercado Pago (.csv)                                   │
│     - Santander Caja de Ahorro (.xlsx)                      │
│     - Bancor Caja de Ahorro (.xls)                          │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│  Día 6 (Cierre y Control - 10 minutos):                     │
│  1. En Movimientos: verificar que "Sin categoría" esté en 0.│
│  2. En Comparativo: revisar desvíos Real vs. Proyectado.    │
│  3. En Proyecciones: confirmar la meta del nuevo mes.       │
└─────────────────────────────────────────────────────────────┘
```
