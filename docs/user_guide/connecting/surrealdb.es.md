---
title: SurrealDB
summary: "El soporte de SurrealDB esta actualmente en alpha temprano"
icon: simple/surrealdb
description: "Conectarse a SurrealDB a traves de websocket o http"
---

# Como conectarse a SurrealDB

Conectarse a una instancia de SurrealDB es simple. Selecciona SurrealDB del menu desplegable, y completa los campos de protocolo, host, puerto, nombre de usuario y contrasena, luego haz clic en Conectar.

## Detalles de conexion de SurrealDB

Para conectarte a una instancia de SurrealDB, necesitaras la siguiente informacion:

- Protocolo: El protocolo sobre el que deseas comunicarte. Actualmente soportamos ws, wss, http y https.
- Host: La direccion IP o nombre de host de tu instancia de SurrealDB
- Puerto: El puerto predeterminado es 8000, pero esto se puede personalizar si tu servidor usa un puerto diferente.
- Metodo de autenticacion: Elige entre los varios metodos de autenticacion proporcionados por Surreal
- Nombre de usuario: Tu nombre de usuario de SurrealDB.
- Contrasena: Tu contrasena de SurrealDB.

# Soporte de SurrealDB

Esta es todavia una implementacion temprana de nuestro soporte para SurrealDB. Vuelve frecuentemente ya que estamos haciendo actualizaciones continuas a nuestro soporte de SurrealDB.

## Funciones soportadas

- Vista de datos de tabla
- Ordenamiento y filtrado de datos de tabla
- Vista de estructura de tabla (para tablas schemafull)
- Barra lateral de entidades
- Edicion de datos
- Ejecutar consultas contra tu base de datos
- Exportar
- Tuneles SSH

## Todavia pendiente
- Importar
- Edicion de esquema
- Respaldo/Restauracion
