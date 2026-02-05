---
title: Como conectarse a ClickHouse
description: Conectarse a ClickHouse es muy facil, incluso a traves de un tunel SSH o con TLS/SSL, en Windows, Mac y Linux.
icon: simple/clickhouse
---

# Como conectarse a ClickHouse

Conectarse a una base de datos ClickHouse desde Beekeeper Studio es sencillo. Simplemente selecciona ClickHouse del menu desplegable, completa los campos de host, puerto, nombre de usuario y contrasena, luego haz clic en Conectar.

## Detalles de conexion de ClickHouse

Para conectarte a una base de datos ClickHouse, necesitaras la siguiente informacion:

- Host: La direccion IP o nombre de host de tu servidor ClickHouse.
- Puerto: El puerto predeterminado es 9000, pero esto se puede personalizar si tu servidor usa un puerto diferente.
- Nombre de usuario: Tu nombre de usuario de ClickHouse, siendo default el valor predeterminado tipico.
- Contrasena: Tu contrasena de ClickHouse, si aplica.

## Probar tu conexion de ClickHouse

Antes de guardar los detalles de tu conexion, Beekeeper Studio te permite probar la conexion:

1. Ingresa los detalles de tu conexion.
2. Haz clic en el boton Probar conexion.
3. Si la prueba es exitosa, estas listo para conectarte. De lo contrario, verifica tus datos e intenta de nuevo.

## Guardar tu conexion de ClickHouse

Una vez que los detalles de tu conexion han sido verificados, puedes elegir guardarlos ingresando un nombre, marcando la casilla `Guardar contrasenas` si lo deseas, y luego haciendo clic en guardar.

![Formulario para guardar conexion](../../assets/images/saving-connection.png)

## Configuracion avanzada de ClickHouse (Opcional)

Para usuarios que necesitan configuraciones avanzadas:

- Configuracion TLS/SSL: Si tu servidor ClickHouse requiere una conexion segura, expande la configuracion TLS/SSL y configura los certificados y claves necesarios si es necesario.
- Tunel SSH: Si necesitas conectarte a tu servidor ClickHouse a traves de un tunel SSH, puedes configurar los ajustes SSH expandiendo la configuracion del tunel SSH y configurando los detalles necesarios del servidor SSH.
