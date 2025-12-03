# API Documentation - Sports Connection Platform

**Base URL:** `http://localhost:3000` (development)

**Versión:** 1.0.0

**Última actualización:** 3 de Diciembre, 2025

## Tabla de Contenidos

1. [Autenticación](#autenticación)
2. [Perfil de Usuario](#perfil-de-usuario)
3. [Foto de Perfil](#foto-de-perfil)
4. [Sistema de Swipe y Matches](#sistema-de-swipe-y-matches)
5. [Publicaciones](#publicaciones)
6. [Suscripciones](#suscripciones)
7. [Venues (Lugares Deportivos)](#venues-lugares-deportivos)
8. [Lookup (Datos de Referencia)](#lookup-datos-de-referencia)
9. [Admin - Usuarios](#admin---usuarios)
10. [Admin - Deportes](#admin---deportes)
11. [Admin - Ubicaciones](#admin---ubicaciones)
12. [Admin - Publicaciones](#admin---publicaciones)
13. [Admin - Suscripciones y Planes](#admin---suscripciones-y-planes)

---

## Autenticación

### 1. Registro de Usuario

**Endpoint:** `POST /api/auth/signup`

**Descripción:** Crea un nuevo usuario en el sistema con email y contraseña.

**Headers:** Ninguno requerido

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Respuesta Exitosa (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores Posibles:**
- `400`: Usuario ya existe
- `500`: Error del servidor

---

### 2. Inicio de Sesión

**Endpoint:** `POST /api/auth/login`

**Descripción:** Inicia sesión con email y contraseña.

**Headers:** Ninguno requerido

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errores Posibles:**
- `401`: Credenciales inválidas
- `500`: Error del servidor

---

### 3. Login con Google

**Endpoint:** `POST /api/auth/google`

**Descripción:** Inicia sesión usando autenticación de Google OAuth.

**Headers:** Ninguno requerido

**Request Body:**
```json
{
  "token": "google_id_token_here"
}
```

**Respuesta Exitosa (200) - Usuario Nuevo:**
```json
{
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresProfile": true,
  "profileTypes": {
    "available": ["athlete", "agent", "team"],
    "requirements": {
      "athlete": ["name", "last_name", "birthdate", "height", "weight", "location_id", "sport_id", "phone_number", "ig_user", "x_user", "description"],
      "agent": ["name", "last_name", "description", "location_id", "sport_id", "phone_number", "ig_user", "x_user", "agency"],
      "team": ["name", "job", "description", "sport_id", "location_id", "phone_number", "ig_user", "x_user"]
    }
  }
}
```

**Respuesta Exitosa (200) - Usuario Existente con Perfil:**
```json
{
  "user": {
    "id": 1,
    "email": "user@gmail.com",
    "role": "user"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requiresProfile": false,
  "profile": {
    "type": "athlete",
    "data": { /* datos del perfil */ }
  }
}
```

---

### 4. Completar Perfil

**Endpoint:** `POST /api/auth/complete-profile`

**Descripción:** Crea el perfil específico del usuario (athlete, agent o team). **Obligatorio después del registro.**

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body - Athlete:**
```json
{
  "profileType": "athlete",
  "name": "John",
  "last_name": "Doe",
  "birthdate": "1995-03-15",
  "height": 180,
  "weight": 75,
  "location_id": 1,
  "sport_id": 1,
  "phone_number": "+1234567890",
  "ig_user": "johndoe_athlete",
  "x_user": "johndoe",
  "description": "Professional soccer player"
}
```

**Request Body - Agent:**
```json
{
  "profileType": "agent",
  "name": "Jane",
  "last_name": "Smith",
  "description": "Sports agent with 10 years experience",
  "location_id": 2,
  "sport_id": 1,
  "phone_number": "+1234567890",
  "ig_user": "jane_agent",
  "x_user": "janesmith",
  "agency": "Top Sports Agency"
}
```

**Request Body - Team:**
```json
{
  "profileType": "team",
  "name": "Barcelona FC",
  "job": "Scout",
  "description": "Looking for young talent",
  "sport_id": 1,
  "location_id": 3,
  "phone_number": "+34123456789",
  "ig_user": "barcelona_fc",
  "x_user": "fcbarcelona"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile completed successfully",
  "profileType": "athlete",
  "profile": {
    "id": 1,
    "user_id": 1,
    "name": "John",
    "last_name": "Doe",
    "birthdate": "1995-03-15",
    "height": 180,
    "weight": 75,
    "location": {
      "id": 1,
      "country": "USA",
      "province": "California",
      "city": "Los Angeles"
    },
    "sport": {
      "id": 1,
      "name": "Soccer"
    },
    "phone_number": "+1234567890",
    "ig_user": "johndoe_athlete",
    "x_user": "johndoe",
    "description": "Professional soccer player",
    "photo_url": null,
    "created_at": "2025-10-22T10:30:00.000Z"
  }
}
```

**Errores Posibles:**
- `400`: Tipo de perfil inválido
- `400`: Campos requeridos faltantes
- `400`: location_id o sport_id inválidos
- `400`: Usuario ya tiene un perfil de este tipo
- `401`: Token inválido
- `500`: Error del servidor

---

## Perfil de Usuario

### 5. Obtener Mi Perfil

**Endpoint:** `GET /api/profile/me`

**Descripción:** Obtiene el perfil completo del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  },
  "profileType": "athlete",
  "profile": {
    "id": 1,
    "user_id": 1,
    "name": "John",
    "last_name": "Doe",
    "birthdate": "1995-03-15",
    "height": 180,
    "weight": 75,
    "location": {
      "id": 1,
      "country": "USA",
      "province": "California",
      "city": "Los Angeles"
    },
    "sport": {
      "id": 1,
      "name": "Soccer"
    },
    "phone_number": "+1234567890",
    "ig_user": "johndoe_athlete",
    "x_user": "johndoe",
    "description": "Professional soccer player",
    "photo_url": "https://...",
    "created_at": "2025-10-22T10:30:00.000Z"
  }
}
```

**Errores Posibles:**
- `401`: Token inválido
- `404`: Perfil no encontrado
- `500`: Error del servidor

---

### 6. Actualizar Mi Perfil

**Endpoint:** `PUT /api/profile/me`

**Descripción:** Actualiza el perfil del usuario autenticado. Solo envía los campos que deseas actualizar.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "userUpdates": {
    "email": "newemail@example.com",
    "password": "newPassword123"
  },
  "profileUpdates": {
    "name": "Johnny",
    "description": "Updated description",
    "location_id": 2,
    "sport_id": 1,
    "height": 182,
    "weight": 77,
    "ig_user": "new_ig_handle"
  }
}
```

**Notas:**
- `userUpdates` es opcional (para actualizar email/password)
- `profileUpdates` es opcional (para actualizar datos del perfil)
- La contraseña se hashea automáticamente
- No se puede cambiar: `id`, `user_id`, `created_at`, `role`

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile updated successfully",
  "profile": {
    "id": 1,
    "user_id": 1,
    "name": "Johnny",
    "last_name": "Doe",
    "description": "Updated description",
    "location": { /* ... */ },
    "sport": { /* ... */ },
    "height": 182,
    "weight": 77,
    "ig_user": "new_ig_handle",
    /* ... otros campos ... */
  },
  "user": {
    "id": 1,
    "email": "newemail@example.com",
    "role": "user"
  }
}
```

**Errores Posibles:**
- `400`: location_id o sport_id inválidos
- `401`: Token inválido
- `404`: Perfil no encontrado
- `500`: Error del servidor

---

### 7. Obtener Perfil de Otro Usuario

**Endpoint:** `GET /profile/:userId`

**Descripción:** Obtiene el perfil de otro usuario. Diseñado para ver perfiles en el contexto de matches o después de interacciones (swipes). Incluye validaciones de privacidad.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `userId`: ID del usuario cuyo perfil se desea ver

**Ejemplo:**
```
GET /profile/10
```

**Reglas de Privacidad:**
- **Sin interacción**: Retorna perfil básico/limitado (nombre, foto, deporte, ubicación, descripción)
- **Con interacción (swipe)**: Retorna perfil completo
- **Con match activo**: Retorna perfil completo + contexto de match
- No puedes usar este endpoint para ver tu propio perfil (usa `/profile/me`)

**Respuesta Exitosa (200) - Perfil Limitado (Sin Interacción):**
```json
{
  "user_id": 10,
  "profile_type": "team",
  "profile": {
    "name": "FC Barcelona",
    "photo_url": "https://...",
    "sport": {
      "id": 1,
      "name": "Soccer"
    },
    "location": {
      "id": 3,
      "country": "Spain",
      "province": "Catalonia",
      "city": "Barcelona"
    },
    "description": "Looking for young talent"
  },
  "relationship": {
    "has_interaction": false,
    "has_match": false,
    "can_view_full_profile": false
  },
  "limited_view": true
}
```

**Respuesta Exitosa (200) - Perfil Completo (Con Interacción/Match):**
```json
{
  "user_id": 10,
  "profile_type": "team",
  "profile": {
    "id": 5,
    "user_id": 10,
    "name": "FC Barcelona",
    "job": "Scout",
    "description": "Looking for young talent",
    "sport_id": 1,
    "location_id": 3,
    "phone_number": "+34123456789",
    "ig_user": "barcelona_fc",
    "x_user": "fcbarcelona",
    "photo_url": "https://...",
    "created_at": "2025-10-20T15:00:00.000Z",
    "sport": {
      "id": 1,
      "name": "Soccer",
      "created_at": "2025-10-01T00:00:00.000Z"
    },
    "location": {
      "id": 3,
      "country": "Spain",
      "province": "Catalonia",
      "city": "Barcelona",
      "created_at": "2025-10-01T00:00:00.000Z"
    }
  },
  "relationship": {
    "has_interaction": true,
    "has_match": true,
    "can_view_full_profile": true
  },
  "limited_view": false
}
```

**Casos de Uso:**
- Ver perfil completo de un usuario con el que hiciste match
- Ver perfil limitado antes de dar swipe
- Ver información de contacto (teléfono, redes sociales) solo si hay match

**Errores Posibles:**
- `400`: Intentando ver tu propio perfil (usa `/profile/me`)
- `401`: Token inválido
- `404`: Usuario no encontrado
- `404`: Perfil no encontrado
- `500`: Error del servidor

---

### 8. Eliminar Mi Perfil y Usuario

**Endpoint:** `DELETE /profile/me`

**Descripción:** Elimina permanentemente el perfil y la cuenta del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile and user deleted successfully"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `404`: Perfil no encontrado
- `500`: Error del servidor

---

## Foto de Perfil

### 9. Subir Foto de Perfil

**Endpoint:** `POST /profile-photo/upload`

**Descripción:** Sube una foto de perfil para el usuario autenticado. La foto se almacena en Supabase Storage.

**Headers:**
```
Authorization: Bearer {token}
Content-Type: multipart/form-data
```

**Request Body (Form Data):**
```
photo: [archivo de imagen]
```

**Restricciones:**
- Tamaño máximo: 5MB
- Formatos permitidos: Imágenes (image/*)
- El tipo de perfil se detecta automáticamente

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile photo uploaded successfully",
  "photo_url": "https://supabase.co/storage/v1/object/public/profile_photos/1.jpg",
  "profileType": "athlete"
}
```

**Errores Posibles:**
- `400`: No se subió ningún archivo
- `400`: Perfil no encontrado (debe completar perfil primero)
- `401`: Token inválido
- `500`: Error del servidor

---

### 10. Eliminar Foto de Perfil

**Endpoint:** `DELETE /profile-photo/delete`

**Descripción:** Elimina la foto de perfil del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Profile photo deleted successfully"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `404`: No se encontró foto de perfil para eliminar
- `500`: Error del servidor

---

## Sistema de Swipe y Matches

### 11. Dar Like o Dislike

**Endpoint:** `POST /swipe`

**Descripción:** Registra un like o dislike a otro usuario. Si ambos usuarios se dan like, se crea un match automáticamente. **Usuarios gratuitos tienen un límite de 10 swipes cada 24 horas.**

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "swiped_user_id": 5,
  "action": "like"
}
```

**Reglas de Negocio:**
- `action` debe ser: `"like"` o `"dislike"`
- No puedes dar swipe a ti mismo
- Solo puedes interactuar con usuarios del mismo deporte
- Solo se permite una interacción por par de usuarios
- **Usuarios gratuitos**: Límite de 10 swipes cada 24 horas
- **Usuarios premium**: Swipes ilimitados

**Respuesta Exitosa (201) - Sin Match:**
```json
{
  "success": true,
  "match": false,
  "message": "Swipe registrado",
  "swipes_remaining": 7,
  "is_premium": false
}
```

**Respuesta Exitosa (201) - Con Match:**
```json
{
  "success": true,
  "match": true,
  "message": "¡Match creado!",
  "swipes_remaining": 6,
  "is_premium": false
}
```

**Respuesta Exitosa (201) - Usuario Premium:**
```json
{
  "success": true,
  "match": false,
  "message": "Swipe registrado",
  "swipes_remaining": null,
  "is_premium": true
}
```

**Errores Posibles:**
- `400`: Campos requeridos faltantes
- `400`: Acción inválida
- `400`: No puedes dar like/dislike a ti mismo
- `400`: Solo puedes interactuar con usuarios del mismo deporte
- `400`: Ya interactuaste con este usuario
- `401`: Token inválido
- `403`: Límite diario de swipes alcanzado (usuarios gratuitos)
- `500`: Error del servidor

**Error de Límite Alcanzado (403):**
```json
{
  "error": "Daily swipe limit reached",
  "message": "Límite diario de swipes alcanzado. Mejora a premium para swipes ilimitados.",
  "remaining": 0,
  "requires_subscription": true
}
```

---

### 12. Obtener Usuarios para Descubrir

**Endpoint:** `GET /swipe/discover`

**Descripción:** Obtiene una lista de usuarios disponibles para dar swipe, filtrados por deporte y tipo de perfil. **Los filtros avanzados requieren suscripción premium.**

**Headers:**
```
Authorization: Bearer {token}
```

**Query Parameters:**
- `profile_type_filter` (opcional - **solo premium**): `"team"`, `"agent"`, `"both"` (solo para atletas)
- `limit` (opcional): Número de usuarios a retornar (default: 10)

**Reglas de Filtrado:**
- **Athletes** ven: Teams y Agents (filtrable solo con premium)
- **Teams** ven: Solo Athletes
- **Agents** ven: Solo Athletes
- Solo se muestran usuarios del mismo deporte
- Se excluyen usuarios ya vistos (con swipe previo)
- **Filtros avanzados**: Requieren suscripción premium activa

**Ejemplo de Request (Sin Filtro - Gratuito):**
```
GET /api/swipe/discover?limit=20
```

**Ejemplo de Request (Con Filtro - Premium):**
```
GET /api/swipe/discover?profile_type_filter=team&limit=20
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "users": [
    {
      "id": 5,
      "user_id": 10,
      "name": "FC Barcelona",
      "job": "Scout",
      "description": "Looking for young talent",
      "photo_url": "https://...",
      "sport_id": 1,
      "location_id": 3,
      "phone_number": "+34123456789",
      "ig_user": "barcelona_fc",
      "x_user": "fcbarcelona",
      "created_at": "2025-10-20T15:00:00.000Z",
      "user": {
        "id": 10,
        "created_at": "2025-10-20T14:50:00.000Z"
      },
      "sport": {
        "name": "Soccer"
      },
      "location": {
        "country": "Spain",
        "province": "Catalonia",
        "city": "Barcelona"
      },
      "profile_type": "team"
    }
    /* ... más usuarios ... */
  ],
  "user_profile_type": "athlete",
  "user_sport_id": 1,
  "count": 20
}
```

**Errores Posibles:**
- `400`: Tipo de filtro inválido
- `401`: Token inválido
- `403`: Los filtros avanzados requieren suscripción premium
- `500`: Error del servidor

**Error de Filtro Premium (403):**
```json
{
  "error": "Advanced filters require premium subscription",
  "message": "Los filtros avanzados requieren una suscripción premium",
  "requires_subscription": true,
  "feature": "profile_type_filters"
}
```

---

### 13. Obtener Mis Matches

**Endpoint:** `GET /swipe/matches`

**Descripción:** Obtiene todos los matches activos del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "matches": [
    {
      "match_id": 1,
      "created_at": "2025-10-22T12:00:00.000Z",
      "other_user": {
        "id": 10,
        "profile_type": "team",
        "profile": {
          "id": 5,
          "user_id": 10,
          "name": "FC Barcelona",
          "job": "Scout",
          "description": "Looking for young talent",
          "photo_url": "https://...",
          "sport_id": 1,
          "location_id": 3,
          "phone_number": "+34123456789",
          "ig_user": "barcelona_fc",
          "x_user": "fcbarcelona"
        }
      }
    }
    /* ... más matches ... */
  ],
  "count": 1
}
```

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 14. Obtener Estadísticas de Swipes

**Endpoint:** `GET /swipe/stats`

**Descripción:** Obtiene las estadísticas de swipes del usuario: límite diario, swipes restantes y estado premium.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200) - Usuario Gratuito:**
```json
{
  "swipes_remaining": 7,
  "is_premium": false,
  "daily_limit": 10
}
```

**Respuesta Exitosa (200) - Usuario Premium:**
```json
{
  "swipes_remaining": null,
  "is_premium": true,
  "daily_limit": 10
}
```

**Notas:**
- `swipes_remaining`: Número de swipes disponibles (null si es premium)
- `is_premium`: Indica si el usuario tiene suscripción activa
- `daily_limit`: Límite diario para usuarios gratuitos
- Los swipes se resetean cada 24 horas

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 15. Contacto Directo (Solo Premium)

**Endpoint:** `GET /swipe/contact/:target_user_id`

**Descripción:** Obtiene la información de contacto completa de otro usuario sin necesidad de match. **Requiere suscripción premium activa.**

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `target_user_id`: ID del usuario cuya información se desea obtener

**Ejemplo:**
```
GET /api/swipe/contact/10
```

**Reglas de Negocio:**
- **Solo usuarios premium** pueden acceder a este endpoint
- Ambos usuarios deben estar en el **mismo deporte**
- No se requiere match previo ni interacción
- Retorna email, teléfono, Instagram y Twitter

**Respuesta Exitosa (200):**
```json
{
  "contact_info": {
    "email": "player@example.com",
    "phone": "+1234567890",
    "instagram": "@player_ig",
    "twitter": "@player_x"
  },
  "profile_type": "athlete",
  "name": "John",
  "last_name": "Doe"
}
```

**Errores Posibles:**
- `400`: Solo puedes contactar usuarios del mismo deporte
- `401`: Token inválido
- `403`: El contacto directo requiere suscripción premium
- `404`: Usuario o perfil no encontrado
- `500`: Error del servidor

**Error de Premium Requerido (403):**
```json
{
  "error": "Direct contact requires premium subscription",
  "message": "El contacto directo requiere una suscripción premium",
  "requires_subscription": true,
  "feature": "direct_contact"
}
```

---

## Publicaciones

### 14. Crear Publicación

**Endpoint:** `POST /posts`

**Descripción:** Crea una nueva publicación asociada al usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "text": "Great training session today! #athlete",
  "url": "https://example.com/my-post"
}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Post created successfully",
  "post": {
    "id": 1,
    "user_id": 1,
    "text": "Great training session today! #athlete",
    "url": "https://example.com/my-post",
    "created_at": "2025-10-22T13:00:00.000Z"
  }
}
```

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 15. Obtener Todas las Publicaciones

**Endpoint:** `GET /posts`

**Descripción:** Obtiene todas las publicaciones ordenadas por fecha (más recientes primero). **Ruta pública.**

**Headers:** Ninguno requerido

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "text": "Great training session today! #athlete",
    "url": "https://example.com/my-post",
    "created_at": "2025-10-22T13:00:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user"
    }
  }
  /* ... más publicaciones ... */
]
```

---

### 16. Obtener Mis Publicaciones

**Endpoint:** `GET /posts/my-posts`

**Descripción:** Obtiene todas las publicaciones del usuario autenticado.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "User posts retrieved successfully",
  "post": [
    {
      "id": 1,
      "user_id": 1,
      "text": "Great training session today! #athlete",
      "url": "https://example.com/my-post",
      "created_at": "2025-10-22T13:00:00.000Z"
    }
    /* ... más publicaciones ... */
  ]
}
```

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 17. Obtener Publicación por ID

**Endpoint:** `GET /posts/:id`

**Descripción:** Obtiene una publicación específica por su ID. **Ruta pública.**

**Headers:** Ninguno requerido

**Parámetros de URL:**
- `id`: ID de la publicación

**Ejemplo:**
```
GET /api/posts/1
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "text": "Great training session today! #athlete",
  "url": "https://example.com/my-post",
  "created_at": "2025-10-22T13:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

**Errores Posibles:**
- `404`: Publicación no encontrada
- `500`: Error del servidor

---

### 18. Eliminar Publicación

**Endpoint:** `DELETE /posts/:id`

**Descripción:** Elimina una publicación específica. Solo el propietario puede eliminar su publicación.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `id`: ID de la publicación

**Ejemplo:**
```
DELETE /api/posts/1
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Post deleted successfully"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

## Suscripciones

### 19. Obtener Planes Disponibles

**Endpoint:** `GET /subscriptions/plans`

**Descripción:** Obtiene todos los planes de suscripción disponibles. **Ruta pública.**

**Headers:** Ninguno requerido

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Premium Monthly",
    "price": 9.99
  },
  {
    "id": 2,
    "name": "Premium Yearly",
    "price": 99.99
  }
]
```

---

### 20. Crear Sesión de Checkout

**Endpoint:** `POST /subscriptions/create-checkout-session`

**Descripción:** Crea una sesión de checkout de Stripe para que el usuario pueda pagar una suscripción.

**Headers:**
```
Authorization: Bearer {token}
```

**Request Body:**
```json
{
  "plan_id": 1
}
```

**Respuesta Exitosa (200):**
```json
{
  "subscription_id": 1,
  "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_..."
}
```

**Notas:**
- El usuario debe acceder a `checkout_url` para completar el pago
- La suscripción se crea en estado `"pending"`
- Cuando el pago se completa, Stripe enviará un webhook para activar la suscripción
- **Configuración de Redirección:**
  - `FRONTEND_URL` debe estar configurada en las variables de entorno
  - Formato requerido: `https://dominio.com` (con protocolo completo)
  - Para apps móviles sin frontend web, puede usar: `https://stripe.com/docs/payments/checkout`
  - Después del pago, el usuario será redirigido a `${FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`
  - Si cancela, será redirigido a `${FRONTEND_URL}/cancel`

**Errores Posibles:**
- `400`: Plan ID requerido o inválido
- `400`: Usuario ya tiene una suscripción activa
- `401`: Token inválido
- `404`: Plan no encontrado
- `500`: Error del servidor o de Stripe

---

### 21. Verificar Estado del Pago

**Endpoint:** `GET /subscriptions/verify-payment`

**Descripción:** Verifica el estado de la última suscripción del usuario.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "status": "active",
  "subscription_id": 1
}
```

**Estados posibles:**
- `"pending"`: Pago pendiente
- `"active"`: Suscripción activa
- `"cancelled"`: Suscripción cancelada
- `"expired"`: Suscripción expirada
- `"payment_failed"`: Pago fallido

**Errores Posibles:**
- `401`: Token inválido
- `404`: No se encontró suscripción
- `500`: Error del servidor

---

### 22. Obtener Estado de Suscripción

**Endpoint:** `GET /subscriptions/status`

**Descripción:** Obtiene detalles completos de la suscripción activa del usuario.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200) - Con Suscripción Activa:**
```json
{
  "active": true,
  "subscription_details": {
    "plan_name": "Premium Monthly",
    "start_date": "2025-10-01T10:00:00.000Z",
    "end_date": "2025-11-01T10:00:00.000Z",
    "status": "active"
  }
}
```

**Respuesta Exitosa (200) - Sin Suscripción:**
```json
{
  "active": false,
  "message": "No active subscription"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 23. Cancelar Suscripción

**Endpoint:** `POST /subscriptions/cancel`

**Descripción:** Cancela la suscripción activa del usuario inmediatamente.

**Headers:**
```
Authorization: Bearer {token}
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Subscription cancelled successfully"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `404`: No se encontró suscripción activa
- `500`: Error del servidor

---

### 24. Webhook de Stripe

**Endpoint:** `POST /subscriptions/webhook`

**Descripción:** Endpoint para recibir eventos de Stripe (pago exitoso, cancelación, etc.). **Uso interno de Stripe.**

**Headers:**
```
stripe-signature: {firma_de_stripe}
Content-Type: application/json
```

**Request Body:** Raw JSON de Stripe (procesado internamente como Buffer)

**Eventos Manejados:**
- `checkout.session.completed`: Activa la suscripción (cambia status de `pending` a `active`)
- `customer.subscription.deleted`: Cancela la suscripción
- `invoice.payment_failed`: Marca el pago como fallido
- `invoice.payment_succeeded`: Renueva la suscripción (extiende 30 días)

**Respuesta Exitosa (200):**
```json
{
  "received": true
}
```

**Configuración en Stripe Dashboard:**

1. Ve a **Developers → Webhooks → Add endpoint**
2. Endpoint URL: `https://tu-dominio.com/subscriptions/webhook`
3. Selecciona eventos:
   - `checkout.session.completed`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
   - `invoice.payment_succeeded`
4. Copia el **Signing secret** (`whsec_...`)
5. Agrégalo como variable de entorno: `STRIPE_WEBHOOK_SECRET=whsec_...`

**Testing con Stripe CLI:**
```bash
# Forward webhooks a servidor local
stripe listen --forward-to localhost:3000/subscriptions/webhook

# Trigger evento de prueba
stripe trigger checkout.session.completed
```

**Errores Posibles:**
- `400`: Firma inválida - verificar `STRIPE_WEBHOOK_SECRET`
- `500`: Error procesando evento - revisar logs del servidor

**Notas:**
- El webhook NO usa autenticación JWT
- Stripe verifica la autenticidad mediante firma criptográfica
- La verificación de firma es obligatoria en producción

---

### 25. Marcar Suscripciones Expiradas

**Endpoint:** `POST /subscriptions/mark-expired`

**Descripción:** Marca como expiradas todas las suscripciones activas cuya fecha de finalización ya pasó. **Útil para ejecutar con cron job.**

**Headers:** Ninguno requerido

**Respuesta Exitosa (200):**
```json
{
  "message": "Successfully marked 3 subscription(s) as expired",
  "expired_subscriptions": [
    {
      "id": 1,
      "user_id": 5,
      "status": "expired",
      "end_date": "2025-10-20T00:00:00.000Z"
    }
    /* ... más suscripciones ... */
  ]
}
```

---

## Venues (Lugares Deportivos)

### 26. Obtener Todos los Venues

**Endpoint:** `GET /venues`

**Descripción:** Obtiene todos los lugares deportivos activos almacenados en la base de datos. Útil para mostrar pines en un mapa.

**Headers:**
```
Authorization: Bearer {token}
```

**Ejemplo:**
```
GET /api/venues
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Venues retrieved successfully",
  "data": [
    {
      "id": 1,
      "name": "LA Fitness",
      "address": "123 Main St, Los Angeles, CA",
      "lat": 34.0522,
      "lng": -118.2437,
      "phone": "+1234567890",
      "website": "https://lafitness.com",
      "is_active": true,
      "created_at": "2025-10-22T10:00:00.000Z",
      "updated_at": "2025-10-22T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Gold's Gym",
      "address": "456 Sunset Blvd, Los Angeles, CA",
      "lat": 34.0983,
      "lng": -118.3267,
      "phone": "+1234567891",
      "website": "https://goldsgym.com",
      "is_active": true,
      "created_at": "2025-10-23T11:00:00.000Z",
      "updated_at": "2025-10-23T11:00:00.000Z"
    }
    /* ... más venues ... */
  ]
}
```

**Notas:**
- Retorna todos los venues con `is_active = true`
- Los venues están ordenados alfabéticamente por nombre
- Los datos se obtienen directamente de la base de datos (no usa Google Maps API)
- Ideal para renderizar múltiples marcadores en mapas (Google Maps, Mapbox, Leaflet)

**Errores Posibles:**
- `401`: Token inválido
- `500`: Error del servidor

---

### 27. Obtener Detalles de un Venue

**Endpoint:** `GET /venues/:id`

**Descripción:** Obtiene detalles completos de un venue específico por su ID.

**Headers:**
```
Authorization: Bearer {token}
```

**Parámetros de URL:**
- `id`: ID del venue en la base de datos

**Ejemplo:**
```
GET /api/venues/1
```

**Respuesta Exitosa (200):**
```json
{
  "message": "Venue details retrieved successfully",
  "data": {
    "id": 1,
    "name": "LA Fitness",
    "address": "123 Main St, Los Angeles, CA",
    "lat": 34.0522,
    "lng": -118.2437,
    "phone": "+1234567890",
    "website": "https://lafitness.com",
    "is_active": true,
    "created_at": "2025-10-22T10:00:00.000Z",
    "updated_at": "2025-10-22T10:00:00.000Z"
  }
}
```

**Errores Posibles:**
- `401`: Token inválido
- `404`: Venue not found
- `500`: Error del servidor

---

## Lookup (Datos de Referencia)

### 28. Obtener Todos los Deportes

**Endpoint:** `GET /lookup/sports`

**Descripción:** Obtiene la lista completa de deportes disponibles. **Ruta pública.**

**Headers:** Ninguno requerido

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Soccer",
    "created_at": "2025-10-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "name": "Basketball",
    "created_at": "2025-10-01T00:00:00.000Z"
  }
  /* ... más deportes ... */
]
```

---

### 29. Obtener Todas las Ubicaciones

**Endpoint:** `GET /lookup/locations`

**Descripción:** Obtiene la lista completa de ubicaciones disponibles. **Ruta pública.**

**Headers:** Ninguno requerido

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "country": "USA",
    "province": "California",
    "city": "Los Angeles",
    "created_at": "2025-10-01T00:00:00.000Z"
  },
  {
    "id": 2,
    "country": "Spain",
    "province": "Catalonia",
    "city": "Barcelona",
    "created_at": "2025-10-01T00:00:00.000Z"
  }
  /* ... más ubicaciones ... */
]
```

---

## Admin - Usuarios

**Nota:** Todas las rutas de admin requieren autenticación y rol de `admin`.

**Headers para todas las rutas:**
```
Authorization: Bearer {token_de_admin}
```

### 30. Obtener Todos los Usuarios

**Endpoint:** `GET /admin/users`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "email": "user@example.com",
    "role": "user",
    "created_at": "2025-10-01T10:00:00.000Z",
    "athlete": [
      {
        "id": 1,
        "name": "John",
        "last_name": "Doe",
        /* ... más campos ... */
      }
    ],
    "agent": [],
    "team": []
  }
  /* ... más usuarios ... */
]
```

---

### 31. Obtener Usuario por ID

**Endpoint:** `GET /admin/users/:id`

**Parámetros de URL:**
- `id`: ID del usuario

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "user",
  "created_at": "2025-10-01T10:00:00.000Z",
  "athlete": [
    {
      "id": 1,
      "name": "John",
      "last_name": "Doe",
      /* ... más campos ... */
    }
  ],
  "agent": [],
  "team": []
}
```

**Errores Posibles:**
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `404`: Usuario no encontrado
- `500`: Error del servidor

---

### 32. Actualizar Usuario

**Endpoint:** `PUT /admin/users/:id`

**Parámetros de URL:**
- `id`: ID del usuario

**Request Body:**
```json
{
  "email": "newemail@example.com",
  "password": "newPassword123",
  "role": "admin"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "email": "newemail@example.com",
  "role": "admin",
  "created_at": "2025-10-01T10:00:00.000Z"
}
```

---

### 33. Eliminar Usuario

**Endpoint:** `DELETE /admin/users/:id`

**Parámetros de URL:**
- `id`: ID del usuario

**Respuesta Exitosa (200):**
```json
{
  "message": "Usuario eliminado correctamente"
}
```

---

### 34. Cambiar Rol de Usuario

**Endpoint:** `PATCH /admin/users/:id/role`

**Parámetros de URL:**
- `id`: ID del usuario

**Request Body:**
```json
{
  "role": "admin"
}
```

**Valores válidos:** `"user"` o `"admin"`

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "admin",
  "created_at": "2025-10-01T10:00:00.000Z"
}
```

**Errores Posibles:**
- `400`: Rol inválido
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `404`: Usuario no encontrado
- `500`: Error del servidor

---

## Admin - Deportes

### 35. Obtener Todos los Deportes (Admin)

**Endpoint:** `GET /admin/sports`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Soccer",
    "created_at": "2025-10-01T00:00:00.000Z"
  }
  /* ... más deportes ... */
]
```

---

### 36. Obtener Deporte por ID

**Endpoint:** `GET /admin/sports/:id`

**Parámetros de URL:**
- `id`: ID del deporte

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "name": "Soccer",
  "created_at": "2025-10-01T00:00:00.000Z"
}
```

**Errores Posibles:**
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `404`: Deporte no encontrado
- `500`: Error del servidor

---

### 37. Crear Deporte

**Endpoint:** `POST /admin/sports`

**Request Body:**
```json
{
  "name": "Tennis"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": 3,
  "name": "Tennis",
  "created_at": "2025-10-22T14:00:00.000Z"
}
```

**Errores Posibles:**
- `400`: Nombre requerido
- `400`: Deporte con ese nombre ya existe
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `500`: Error del servidor

---

### 38. Actualizar Deporte

**Endpoint:** `PUT /admin/sports/:id`

**Parámetros de URL:**
- `id`: ID del deporte

**Request Body:**
```json
{
  "name": "Football (Soccer)"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "name": "Football (Soccer)",
  "created_at": "2025-10-01T00:00:00.000Z"
}
```

---

### 39. Eliminar Deporte

**Endpoint:** `DELETE /admin/sports/:id`

**Parámetros de URL:**
- `id`: ID del deporte

**Respuesta Exitosa (200):**
```json
{
  "message": "Sport deleted successfully"
}
```

---

## Admin - Ubicaciones

### 40. Obtener Todas las Ubicaciones (Admin)

**Endpoint:** `GET /admin/locations`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "country": "USA",
    "province": "California",
    "city": "Los Angeles",
    "created_at": "2025-10-01T00:00:00.000Z"
  }
  /* ... más ubicaciones ... */
]
```

---

### 41. Obtener Ubicación por ID

**Endpoint:** `GET /admin/locations/:id`

**Parámetros de URL:**
- `id`: ID de la ubicación

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "country": "USA",
  "province": "California",
  "city": "Los Angeles",
  "created_at": "2025-10-01T00:00:00.000Z"
}
```

---

### 42. Crear Ubicación

**Endpoint:** `POST /admin/locations`

**Request Body:**
```json
{
  "country": "Argentina",
  "province": "Buenos Aires",
  "city": "Buenos Aires"
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": 10,
  "country": "Argentina",
  "province": "Buenos Aires",
  "city": "Buenos Aires",
  "created_at": "2025-10-22T14:00:00.000Z"
}
```

**Errores Posibles:**
- `400`: Campos requeridos faltantes (country, province, city)
- `400`: Ubicación con esa combinación ya existe
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `500`: Error del servidor

---

### 43. Actualizar Ubicación

**Endpoint:** `PUT /admin/locations/:id`

**Parámetros de URL:**
- `id`: ID de la ubicación

**Request Body:**
```json
{
  "country": "Argentina",
  "province": "CABA",
  "city": "Ciudad Autónoma de Buenos Aires"
}
```

**Respuesta Exitosa (200):**
```json
{
  "id": 10,
  "country": "Argentina",
  "province": "CABA",
  "city": "Ciudad Autónoma de Buenos Aires",
  "created_at": "2025-10-22T14:00:00.000Z"
}
```

---

### 44. Eliminar Ubicación

**Endpoint:** `DELETE /admin/locations/:id`

**Parámetros de URL:**
- `id`: ID de la ubicación

**Respuesta Exitosa (200):**
```json
{
  "message": "Location deleted successfully"
}
```

---

## Admin - Publicaciones

### 45. Obtener Todas las Publicaciones (Admin)

**Endpoint:** `GET /admin/posts`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "user_id": 1,
    "text": "Great training session today!",
    "url": "https://example.com/post",
    "created_at": "2025-10-22T13:00:00.000Z",
    "user": {
      "id": 1,
      "email": "user@example.com",
      "role": "user"
    }
  }
  /* ... más publicaciones ... */
]
```

---

### 46. Obtener Publicación por ID (Admin)

**Endpoint:** `GET /admin/posts/:id`

**Parámetros de URL:**
- `id`: ID de la publicación

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "user_id": 1,
  "text": "Great training session today!",
  "url": "https://example.com/post",
  "created_at": "2025-10-22T13:00:00.000Z",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "user"
  }
}
```

---

### 47. Eliminar Publicación (Admin)

**Endpoint:** `DELETE /admin/posts/:id`

**Parámetros de URL:**
- `id`: ID de la publicación

**Respuesta Exitosa (200):**
```json
{
  "message": "Post deleted successfully"
}
```

---

## Admin - Suscripciones y Planes

### 48. Obtener Todos los Planes (Admin)

**Endpoint:** `GET /admin/plans`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "name": "Premium Monthly",
    "price": 9.99,
    "created_at": "2025-10-01T00:00:00.000Z"
  }
  /* ... más planes ... */
]
```

---

### 49. Crear Plan

**Endpoint:** `POST /admin/plans`

**Request Body:**
```json
{
  "name": "Premium Quarterly",
  "price": 24.99
}
```

**Respuesta Exitosa (201):**
```json
{
  "id": 3,
  "name": "Premium Quarterly",
  "price": 24.99,
  "created_at": "2025-10-22T14:00:00.000Z"
}
```

**Errores Posibles:**
- `400`: Campos requeridos faltantes (name, price)
- `400`: Plan con ese nombre ya existe
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `500`: Error del servidor

---

### 50. Eliminar Plan

**Endpoint:** `DELETE /admin/plans/:id`

**Parámetros de URL:**
- `id`: ID del plan

**Respuesta Exitosa (200):**
```json
{
  "message": "Plan deleted successfully"
}
```

---

### 51. Obtener Todas las Suscripciones (Admin)

**Endpoint:** `GET /admin/subscriptions`

**Respuesta Exitosa (200):**
```json
[
  {
    "id": 1,
    "user_id": 5,
    "plan_id": 1,
    "status": "active",
    "end_date": "2025-11-22T00:00:00.000Z",
    "stripe_session_id": "cs_test_...",
    "stripe_subscription_id": "sub_...",
    "stripe_customer_id": "cus_...",
    "created_at": "2025-10-22T10:00:00.000Z",
    "user": {
      "id": 5,
      "email": "subscriber@example.com",
      "role": "user"
    }
  }
  /* ... más suscripciones ... */
]
```

---

### 52. Obtener Suscripción por ID (Admin)

**Endpoint:** `GET /admin/subscriptions/:id`

**Parámetros de URL:**
- `id`: ID de la suscripción

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "user_id": 5,
  "plan_id": 1,
  "status": "active",
  "end_date": "2025-11-22T00:00:00.000Z",
  "stripe_session_id": "cs_test_...",
  "stripe_subscription_id": "sub_...",
  "stripe_customer_id": "cus_...",
  "created_at": "2025-10-22T10:00:00.000Z",
  "user": {
    "id": 5,
    "email": "subscriber@example.com",
    "role": "user"
  }
}
```

---

### 53. Actualizar Suscripción

**Endpoint:** `PUT /admin/subscriptions/:id`

**Parámetros de URL:**
- `id`: ID de la suscripción

**Request Body:**
```json
{
  "status": "cancelled",
  "end_date": "2025-10-25T00:00:00.000Z"
}
```

**Estados válidos:**
- `"pending"`: Pago pendiente
- `"active"`: Suscripción activa
- `"cancelled"`: Suscripción cancelada
- `"expired"`: Suscripción expirada
- `"payment_failed"`: Pago fallido

**Respuesta Exitosa (200):**
```json
{
  "id": 1,
  "user_id": 5,
  "plan_id": 1,
  "status": "cancelled",
  "end_date": "2025-10-25T00:00:00.000Z",
  "stripe_session_id": "cs_test_...",
  "stripe_subscription_id": "sub_...",
  "stripe_customer_id": "cus_...",
  "created_at": "2025-10-22T10:00:00.000Z",
  "user": {
    "id": 5,
    "email": "subscriber@example.com",
    "role": "user"
  }
}
```

**Errores Posibles:**
- `400`: Estado inválido
- `400`: Formato de fecha inválido
- `400`: No hay campos válidos para actualizar
- `401`: Token inválido
- `403`: Requiere privilegios de admin
- `404`: Suscripción no encontrada
- `500`: Error del servidor

---

### 54. Eliminar Suscripción (Admin)

**Endpoint:** `DELETE /admin/subscriptions/:id`

**Parámetros de URL:**
- `id`: ID de la suscripción

**Respuesta Exitosa (200):**
```json
{
  "message": "Subscription deleted successfully"
}
```

---

## Notas Finales

### Estructura del Token JWT

El token JWT contiene el siguiente payload:
```json
{
  "id": 1,
  "email": "user@example.com",
  "role": "user"
}
```

### Variables de Entorno Requeridas

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=24h

# Server
PORT=3000
NODE_ENV=development

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Frontend
FRONTEND_URL=http://localhost:5173
```

### Códigos de Estado HTTP

- **200 OK**: Solicitud exitosa
- **201 Created**: Recurso creado exitosamente
- **400 Bad Request**: Solicitud inválida (campos faltantes, validación fallida)
- **401 Unauthorized**: Token inválido o faltante
- **403 Forbidden**: Sin permisos suficientes (requiere admin)
- **404 Not Found**: Recurso no encontrado
- **500 Internal Server Error**: Error del servidor

### Reglas de Negocio Importantes

1. **Completar Perfil es Obligatorio**: Después de signup/login, el usuario debe llamar a `/auth/complete-profile` antes de usar otras funcionalidades.

2. **Segregación por Deporte**: Los swipes solo funcionan entre usuarios del mismo `sport_id`.

3. **Sistema de Matching**:
   - Athletes pueden ver Teams y Agents
   - Teams solo ven Athletes
   - Agents solo ven Athletes
   - Un match se crea cuando ambos usuarios se dan like

4. **Una Suscripción por Usuario**: No se puede crear una nueva suscripción si ya existe una activa.

5. **Cache de Venues**: Los venues se obtienen directamente de la base de datos sin integración con Google Maps API.

6. **Sistema Premium - Límite de Swipes**:
   - **Usuarios Gratuitos**: 10 swipes por día (ventana rodante de 24 horas)
   - **Usuarios Premium**: Swipes ilimitados
   - El límite se resetea automáticamente cada 24 horas desde el primer swipe del día
   - Consultar `/swipe/stats` para verificar swipes restantes

7. **Funcionalidades Premium**:
   - **Filtros Avanzados**: Solo athletes premium pueden filtrar por team/agent en `/swipe/discover`
   - **Contacto Directo**: Solo usuarios premium pueden usar `/swipe/contact/:id` para obtener información de contacto sin match
   - Todas las funcionalidades premium requieren suscripción activa (`status: 'active'` en tabla `subscription`)

### Testing

Para probar los endpoints, puedes usar:
- **Postman**
- **Thunder Client** (VS Code Extension)
- **cURL**
- **Insomnia**

**Flujo de Testing Típico:**

1. **Signup** → Obtener token
2. **Complete Profile** → Crear perfil específico
3. **Upload Photo** → Subir foto de perfil
4. **Get Discover Users** → Ver usuarios disponibles
5. **Create Swipe** → Dar like/dislike
6. **Get Matches** → Ver matches creados

---

## Estructura de la Base de Datos

### Tabla `sports_venues`

```sql
sports_venues
├── id (bigint, primary key)
├── name (character varying, not null)
├── address (character varying, not null)
├── lat (numeric, not null) - Latitud para posicionamiento en mapa
├── lng (numeric, not null) - Longitud para posicionamiento en mapa
├── phone (character varying)
├── website (character varying)
├── is_active (boolean, default: true)
├── created_at (timestamp with time zone, default: now())
└── updated_at (timestamp with time zone, default: now())
```

**Notas:**
- La tabla almacena información básica de clubes deportivos
- `lat` y `lng` son coordenadas GPS estándar compatibles con cualquier API de mapas
- Compatible con Google Maps, Mapbox, Leaflet y otros servicios de mapeo
- Los venues se gestionan manualmente (sin integración automática con Google Places)

### Tabla `subscription`

```sql
subscription
├── id (bigint, primary key)
├── user_id (bigint, foreign key → users)
├── plan_id (bigint, foreign key → plan)
├── status (text: 'pending' | 'active' | 'cancelled' | 'expired' | 'payment_failed')
├── end_date (timestamp)
├── stripe_session_id (text) - ID de sesión de checkout de Stripe
├── stripe_subscription_id (text) - ID de suscripción en Stripe (para renovaciones)
├── stripe_customer_id (text) - ID de cliente en Stripe
└── created_at (timestamp)
```

**Notas:**
- `stripe_session_id`: Se asigna al crear el checkout session
- `stripe_subscription_id` y `stripe_customer_id`: Se asignan cuando el webhook de Stripe confirma el pago
- Los webhooks usan `stripe_subscription_id` para manejar renovaciones y cancelaciones

---

**Documento generado:** 26 de noviembre de 2025  
**Total de Endpoints:** 54  
**Última actualización:** 30 de noviembre de 2025 - Sistema de venues simplificado
