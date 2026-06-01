# Novelle — Requerimientos

## Requerimientos Funcionales

### RF-01: Autenticación
- Los usuarios pueden registrarse con nombre, email y contraseña
- Los usuarios pueden iniciar sesión con email y contraseña
- Las contraseñas deben validarse con regex (min. 8 caracteres, mayúscula, número, especial)
- Soporte para "Recordarme" con token persistente

### RF-02: Exploración de Historias
- Los usuarios pueden ver una lista de historias disponibles
- Filtrar historias por categoría, popularidad y calificación
- Buscar historias por título, autor o tema
- Ver historias destacadas y recomendadas

### RF-03: Lectura Interactiva
- Los usuarios leen escenas narrativas con texto inmersivo
- Al llegar a un punto de decisión, se presentan opciones
- Las decisiones del usuario determinan la siguiente escena
- Cada camino lleva a diferentes finales

### RF-04: Sistema de Decisiones
- Cada escena puede tener 2-4 opciones de decisión
- Las decisiones se registran en el historial del usuario
- Las decisiones afectan el progreso narrativo
- Se muestran pistas sutiles sobre las consecuencias

### RF-05: Progreso y Guardado
- El progreso de lectura se guarda automáticamente
- Los usuarios pueden retomar historias donde las dejaron
- Se muestra una barra de progreso durante la lectura
- Historial visual de decisiones tomadas

### RF-06: Favoritos y Biblioteca
- Los usuarios pueden marcar historias como favoritas
- Biblioteca personal con historias en progreso y completadas
- Organización por estado: leyendo, completadas, guardadas

### RF-07: Perfil y Estadísticas
- Perfil con avatar, estadísticas de lectura
- Dashboard con métricas: historias leídas, decisiones, finales desbloqueados
- Historial de actividad con timeline visual

### RF-08: Personalización
- Modo oscuro y modo claro
- Configuración de tamaño de fuente para lectura
- Preferencias de notificaciones

### RF-09: CMS
- Panel de administración para crear/editar historias
- Gestión de escenas, decisiones, personajes y finales
- Revisión y aprobación de contenido generado por IA
- Estadísticas de uso

### RF-10: Inteligencia Artificial
- Generación de escenas narrativas
- Generación de finales
- Creación de personajes
- Adaptación según decisiones del usuario

---

## Requerimientos No Funcionales

### RNF-01: Rendimiento
- Tiempo de carga inicial < 2 segundos
- Transiciones entre páginas < 300ms
- Compilación SASS < 5 segundos

### RNF-02: Compatibilidad
- Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- iOS Safari, Chrome Android
- Responsive: 375px a 2560px

### RNF-03: Accesibilidad
- ARIA labels en elementos interactivos
- Navegación por teclado
- Soporte para lectores de pantalla
- Contraste de colores WCAG AA

### RNF-04: Seguridad
- Validación de inputs con regex (client + server)
- JWT para autenticación
- CORS configurado
- Sanitización de datos

### RNF-05: Mantenibilidad
- Código modular y documentado
- Arquitectura escalable por capas
- SASS modular con design tokens
- Separación de concerns en JavaScript

### RNF-06: Experiencia de Usuario
- Animaciones suaves (60fps)
- Feedback visual en todas las acciones
- Loading skeletons para contenido asíncrono
- Soporte para prefers-reduced-motion
