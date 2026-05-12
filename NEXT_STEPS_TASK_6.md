# Próximos Pasos: Task 6 - Mejorar Interfaz de Canje de Códigos

**Fecha**: Mayo 2, 2026  
**Estado Actual**: ✅ Corrección crítica completada  
**Próxima Tarea**: Task 6 (Mejorar interfaz de canje)

## 📋 Resumen de lo Completado

### ✅ Corrección Crítica: Sincronización de Perfil
- **Problema**: Modal de perfil en catalogo.html no se actualizaba
- **Causa**: IDs de elementos HTML incorrectos en función `openProfileModal()`
- **Solución**: Actualizar referencias a IDs correctos
- **Resultado**: Perfil sincronizado correctamente entre dforzze.html y catalogo.html

### ✅ Validación Completada
- Todos los elementos del modal se actualizan correctamente
- Timeline de rangos se visualiza con colores dinámicos
- Barra de progreso anima suavemente
- Datos se sincronizan entre páginas

## 🎯 Task 6: Mejorar Interfaz de Canje de Códigos

### Objetivo General
Mejorar la experiencia de usuario al canjear códigos de stickers, con mejor UX, validación mejorada y feedback visual.

### Subtareas

#### 6.1 Rediseñar modal de canje con mejor UX
**Objetivo**: Crear un modal de canje más intuitivo y atractivo

**Requisitos**:
- Crear header explicativo con instrucciones claras
- Implementar input mejorado con validación en tiempo real
- Añadir sección informativa sobre beneficios de stickers
- Mantener 100% compatibilidad con código existente

**Elementos a Mejorar**:
1. **Header del Modal**
   - Título claro: "Canjear Código"
   - Descripción: "Ingresa tu código para ganar stickers"
   - Icono visual

2. **Input de Código**
   - Placeholder mejorado: "Ej: DFORZZE-2024-ABC123"
   - Validación en tiempo real
   - Indicador visual de validez
   - Soporte para mayúsculas automáticas

3. **Sección Informativa**
   - Beneficios de stickers
   - Cómo funcionan los rangos
   - Próximos pasos después de canjear

4. **Botones de Acción**
   - Botón "Canjear" (principal)
   - Botón "Cancelar" (secundario)
   - Estados: normal, cargando, éxito, error

#### 6.2 Escribir test de propiedad para lógica de canje
**Objetivo**: Validar que la lógica de canje es correcta

**Propiedad 5: Code Redemption Business Logic**
- Validar que códigos válidos se aceptan
- Validar que códigos inválidos se rechazan
- Validar que códigos duplicados se previenen
- Validar que stickers se suman correctamente
- Validar que el rango se actualiza si es necesario

#### 6.3 Implementar validación mejorada de códigos
**Objetivo**: Validar códigos con reglas claras

**Reglas de Validación**:
1. Formato: `[A-Z0-9-]{6,20}`
2. No puede estar vacío
3. No puede contener caracteres especiales (excepto guiones)
4. No puede ser duplicado (ya canjeado)
5. Debe existir en la base de datos de códigos válidos

**Feedback**:
- ✓ Código válido: "Código válido"
- ✗ Código inválido: "Formato incorrecto"
- ✗ Código duplicado: "Ya has canjeado este código"
- ✗ Código no existe: "Código no encontrado"

#### 6.4 Añadir estados de carga y feedback visual
**Objetivo**: Proporcionar feedback visual durante el canje

**Estados**:
1. **Normal**: Input vacío, botón habilitado
2. **Escribiendo**: Validación en tiempo real
3. **Cargando**: Indicador de carga, botón deshabilitado
4. **Éxito**: Mensaje de éxito, animación de celebración
5. **Error**: Mensaje de error, input resaltado

**Animaciones**:
- Entrada del modal: fade + slide
- Validación: cambio de color suave
- Carga: spinner animado
- Éxito: checkmark animado + celebración
- Error: shake animation

## 📁 Archivos a Modificar

### catalogo.html
- Mejorar HTML del modal `catRedModal`
- Actualizar función `openCatRed()`
- Mejorar función `doCatRedeem()`
- Añadir validación en tiempo real

### stickers-enhanced.js
- Agregar función de validación de códigos mejorada
- Agregar función de canje con feedback
- Agregar animaciones de canje

### stickers-tests.js
- Agregar tests para Propiedad 5: Code Redemption Business Logic

## 🔧 Cambios Técnicos Necesarios

### 1. Validación en Tiempo Real
```javascript
// Escuchar cambios en el input
document.getElementById('catRedInp').addEventListener('input', function(e) {
  const code = e.target.value.toUpperCase();
  const validation = validateCode(code);
  
  // Mostrar feedback visual
  if (validation.valid) {
    // Verde: código válido
  } else {
    // Rojo: código inválido
  }
});
```

### 2. Estados de Carga
```javascript
// Antes de canjear
showLoadingState();

// Simular procesamiento
setTimeout(() => {
  if (success) {
    showSuccessState();
    showCelebration();
  } else {
    showErrorState();
  }
}, 1000);
```

### 3. Prevención de Duplicados
```javascript
// Verificar si el código ya fue canjeado
const redeemedCodes = u.redeemedCodes || [];
if (redeemedCodes.includes(code)) {
  showError('Ya has canjeado este código');
  return;
}
```

## 📊 Criterios de Aceptación

- ✅ Modal tiene header explicativo
- ✅ Input tiene validación en tiempo real
- ✅ Sección informativa visible
- ✅ Estados de carga funcionan
- ✅ Feedback visual claro
- ✅ Animaciones suaves
- ✅ Prevención de duplicados
- ✅ Mensajes de error claros
- ✅ 100% compatible con código existente
- ✅ Tests de propiedad pasan

## 🧪 Testing

### Tests Unitarios
- Validación de formato de código
- Prevención de duplicados
- Cálculo correcto de stickers
- Actualización de rango

### Tests de Propiedades
- **Propiedad 5**: Code Redemption Business Logic
  - Validar que códigos válidos se aceptan
  - Validar que códigos inválidos se rechazan
  - Validar que stickers se suman correctamente

### Tests Manuales
- Canjear código válido
- Intentar canjear código inválido
- Intentar canjear código duplicado
- Verificar que stickers se suman
- Verificar que rango se actualiza

## 📝 Documentación

Se crearán los siguientes documentos:
- `TASK_6_IMPLEMENTATION_SUMMARY.md` - Resumen de implementación
- `TASK_6_VALIDATION.md` - Validación de Task 6
- Tests en `test-task6-redemption.html`

## ⏱️ Estimación de Tiempo

- 6.1 Rediseño del modal: 30 minutos
- 6.2 Tests de propiedad: 20 minutos
- 6.3 Validación mejorada: 25 minutos
- 6.4 Estados y feedback: 25 minutos
- **Total**: ~100 minutos

## 🚀 Cómo Proceder

1. **Leer** los requisitos de Task 6 en `requirements.md`
2. **Revisar** el diseño en `design.md`
3. **Ejecutar** las subtareas 6.1 a 6.4 en orden
4. **Validar** con tests de propiedad
5. **Documentar** los cambios
6. **Proceder** a Task 7

## 📌 Notas Importantes

- Mantener 100% compatibilidad con código existente
- Usar iconos minimistas (Nike-style)
- Preservar nombres de rangos
- Sincronizar datos entre páginas
- Todos los tests deben pasar

---

**Estado**: Listo para comenzar Task 6  
**Próxima Revisión**: Después de completar Task 6
