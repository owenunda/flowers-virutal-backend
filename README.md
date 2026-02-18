# FLOWER VIRTUAL Backend (MVP)

Stack:
- NestJS + TypeScript
- PostgreSQL
- Prisma ORM
- JWT Authentication
- RBAC (roles + permisos)
- Swagger (OpenAPI)

## Setup
1) Instalar dependencias:
```bash
npm install
```

2) Variables de entorno:
- Copia `.env.example` a `.env`
- Ajusta `DATABASE_URL` y `JWT_SECRET`

3) Prisma:
```bash
npx prisma migrate dev -n init
# o si solo quieres sincronizar sin migraciones:
npx prisma db push
npx prisma generate
```

4) Ejecutar:
```bash
npm run start:dev
```

## Swagger
- UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-json`
- Autenticación: usa el botón **Authorize** con el token (sin prefijo "Bearer")
- Todos los endpoints están documentados con:
  - Descripciones detalladas
  - Ejemplos de request/response
  - Códigos de estado HTTP
  - Esquemas de errores

## Roles y Permisos

### Roles
- `CLIENTE`: Puede crear y ver sus propias órdenes
- `EMPLEADO`: Gestión completa del sistema
- `PROVEEDOR`: Ver órdenes consolidadas de sus productos

### Permisos
- `USER_CREATE`: Crear usuarios
- `PRODUCT_READ`: Leer productos
- `PRODUCT_MANAGE`: Gestión completa de productos
- `PRICING_MANAGE`: Gestión de reglas de descuento
- `ORDER_CREATE`: Crear órdenes
- `ORDER_SUBMIT`: Enviar órdenes para validación
- `ORDER_REVIEW`: Revisar órdenes
- `ORDER_APPROVE`: Aprobar/rechazar órdenes
- `ORDER_COMPLETE`: Completar órdenes
- `CONSOLIDATE_CREATE`: Crear consolidaciones
- `CONSOLIDATE_READ_OWN`: Leer consolidaciones propias
- `EXPORT_READ`: Exportar datos

## Endpoints API

### Auth
**`POST /auth/login`** (público)
- Autenticación con email y password
- Retorna JWT token

### Users
**`POST /users`** (⚠️ TEMPORAL: público - En producción: EMPLEADO)
- Crear nuevo usuario
- Body: `{ email, password, name, role }`

### Products
**`POST /products`** (EMPLEADO + PRODUCT_MANAGE)
- Crear producto
- Body: `{ sku, name, basePrice, stock, providerId }`

**`GET /products`** (público)
- Listar todos los productos con proveedores y reglas de descuento

**`GET /products/:id`** (público)
- Obtener un producto específico

**`PATCH /products/:id`** (EMPLEADO + PRODUCT_MANAGE)
- Actualizar producto
- Body: `{ sku?, name?, basePrice?, stock? }`

**`DELETE /products/:id`** (EMPLEADO + PRODUCT_MANAGE)
- Eliminar producto (solo si no tiene items en órdenes)

### Orders (Workflow)
Estados: `BORRADOR` → `PENDIENTE_VALIDACION` → `VALIDADO` → `COMPLETADO`

**`POST /orders`** (CLIENTE/EMPLEADO + ORDER_CREATE)
- Crear orden en borrador
- Body: `{ customerId }`

**`GET /orders`** (CLIENTE/EMPLEADO)
- Listar órdenes (CLIENTE: solo propias, EMPLEADO: todas)

**`GET /orders/:id`** (CLIENTE/EMPLEADO)
- Obtener orden con items, productos y proveedores

**`POST /orders/:id/items`** (CLIENTE/EMPLEADO + ORDER_CREATE)
- Agregar/actualizar item en orden (solo BORRADOR)
- Body: `{ productId, qty }`
- Recalcula precio con descuentos por volumen

**`DELETE /orders/:id/items/:productId`** (CLIENTE/EMPLEADO + ORDER_CREATE)
- Eliminar item de orden (solo BORRADOR)

**`PATCH /orders/:id/submit`** (CLIENTE/EMPLEADO + ORDER_SUBMIT)
- Enviar orden para validación: BORRADOR → PENDIENTE_VALIDACION

**`PATCH /orders/:id/approve`** (EMPLEADO + ORDER_APPROVE)
- Aprobar orden: PENDIENTE_VALIDACION → VALIDADO

**`PATCH /orders/:id/reject`** (EMPLEADO + ORDER_APPROVE)
- Rechazar orden: PENDIENTE_VALIDACION → BORRADOR

**`PATCH /orders/:id/complete`** (EMPLEADO + ORDER_COMPLETE)
- Completar orden: VALIDADO → COMPLETADO
- Descuenta stock de productos en transacción

### Consolidation
**`POST /consolidation/run`** (EMPLEADO + CONSOLIDATE_CREATE)
- Consolida órdenes VALIDADAS agrupándolas por proveedor
- Crea ConsolidatedOrder con items agregados
- Marca órdenes como consolidadas

**`GET /consolidation`** (EMPLEADO/PROVEEDOR + CONSOLIDATE_READ_OWN)
- Listar consolidaciones (PROVEEDOR: solo propias, EMPLEADO: todas)

**`GET /consolidation/:id`** (EMPLEADO/PROVEEDOR + CONSOLIDATE_READ_OWN)
- Obtener consolidación específica con items

### Export
**`GET /export/orders/:id`** (EMPLEADO/CLIENTE + EXPORT_READ)
- Exportar datos estructurados de una orden para PDF/Excel

**`GET /export/consolidated-orders/:id`** (EMPLEADO/PROVEEDOR + EXPORT_READ)
- Exportar datos estructurados de orden consolidada

**`GET /export/reports/product-sales`** (EMPLEADO + EXPORT_READ)
- Reporte de ventas por producto con totales

## Flujo de Trabajo Típico

1. **Crear usuarios**: `POST /users` (temporal: público)
   - Crear EMPLEADO, CLIENTE, PROVEEDOR

2. **Login**: `POST /auth/login` → obtener JWT token

3. **Crear productos**: `POST /products` (EMPLEADO)
   - Asignar a proveedores existentes

4. **Cliente crea orden**:
   - `POST /orders` (customerId)
   - `POST /orders/:id/items` (agregar productos)
   - `PATCH /orders/:id/submit` (enviar para validación)

5. **Empleado valida**:
   - `GET /orders` (ver pendientes)
   - `PATCH /orders/:id/approve` o `reject`

6. **Empleado consolida**:
   - `POST /consolidation/run` (agrupa por proveedor)

7. **Proveedor ve su consolidación**:
   - `GET /consolidation` (solo sus órdenes)

8. **Empleado completa órdenes**:
   - `PATCH /orders/:id/complete` (descuenta stock)

9. **Exportar datos**:
   - `GET /export/orders/:id`
   - `GET /export/reports/product-sales`

## Características Técnicas

### Autenticación JWT
- Token válido por 15 minutos (configurable en `.env`)
- Incluye: `sub` (userId), `email`, `role`
- Global JWT Guard con soporte para endpoints públicos vía `@Public()`

### RBAC
- Guards globales: JwtAuthGuard, RolesGuard, PermissionsGuard
- Decoradores: `@Public()`, `@Roles()`, `@Permissions()`
- Permisos mapeados por rol en `rbac.config.ts`

### Validación
- ValidationPipe global con:
  - `whitelist: true` (remueve propiedades no definidas)
  - `forbidNonWhitelisted: true` (rechaza props extras)
  - `transform: true` (transforma tipos automáticamente)

### Base de Datos
- Decimales para precios: `@db.Decimal(12, 2)`
- UUIDs para IDs
- Índices en claves foráneas y queries frecuentes
- Transacciones en operaciones críticas (complete order, consolidation)

### Descuentos por Volumen
- Modelo `VolumeDiscountRule` con `minQty` y `percentOff`
- Cálculo automático en `OrdersService.addItem()`
- Aplica el mejor descuento según cantidad

## Notas de Desarrollo

- **Endpoint temporal**: `POST /users` está abierto sin autenticación. Comentar decoradores `@Roles` y `@Permissions` después de crear usuarios iniciales.
- Todos los servicios usan PrismaService inyectado (módulo global)
- Logs informativos en inicio de servidor y conexión a BD
- Swagger configurado con persistAuthorization para mejor UX

## Próximas Mejoras
- Agregar paginación a listados
- Implementar búsqueda y filtros
- Agregar reglas de negocio adicionales (stock mínimo, etc.)
- Notificaciones por email en cambios de estado
- Auditoría de cambios
- Tests unitarios e integración

