---
title: Trino
summary: "El soporte de Trino esta actualmente en alpha temprano"
icon: simple/trino
description: "Conectate a un coordinador Trino para ejecutar consultas usando Beekeeper Studio"
---

# Soporte de Trino

Vuelve frecuentemente ya que estamos haciendo actualizaciones continuas a nuestro soporte de Trino.

Super emocionados de tener soporte de Trino aqui para todos ustedes. Por favor ten en cuenta que Trino solo esta en las etapas iniciales de implementacion, pero queriamos lanzarlo para que lo prueben.

El soporte ha sido limitado a basicamente un estado de "solo lectura" ya que cualquier forma de escritura debe hacerse dentro de los limites de la base de datos misma.

## Como conectarse
Conectarse a una base de datos Trino desde Beekeeper Studio es sencillo. Selecciona Trino del menu desplegable, y completa los campos de host, puerto, nombre de usuario y contrasena del Cluster Trino (no de ninguna de las bases de datos subyacentes), luego haz clic en Conectar.

### Detalles de conexion de Trino

Para conectarte a una base de datos Trino, necesitaras la siguiente informacion:

- **Host**: La direccion IP o nombre de host de tu servidor Trino.
- **Puerto**: El puerto predeterminado es 8080, pero esto se puede personalizar si tu servidor usa un puerto diferente.
- **Nombre de usuario**: Tu nombre de usuario de Trino, siendo default el valor predeterminado tipico.
- **Contrasena**: Tu contrasena de Trino, si aplica.
- **Catalogo predeterminado (opcional)**: El catalogo al que quieres conectarte inicialmente al inicio

### Probar tu conexion de Trino

Antes de guardar los detalles de tu conexion, Beekeeper Studio te permite probar la conexion:

1. Ingresa los detalles de tu conexion.
2. Haz clic en el boton *Probar conexion*.
3. Si la prueba es exitosa, estas listo para conectarte. De lo contrario, verifica tus datos e intenta de nuevo.

### Guardar tu conexion de Trino

Una vez que los detalles de tu conexion han sido verificados, puedes elegir guardarlos ingresando un nombre, marcando la casilla `Guardar contrasenas` si lo deseas, y luego haciendo clic en guardar.

## Funciones soportadas

- Vista de datos de tabla
- Ordenamiento y filtrado de datos de tabla
- Vista de estructura de tabla
- Descargar resultados de consulta como JSON, CSV o Markdown

## Todavia pendiente

- Tuneles SSH
- Ejecutar consulta(s) directamente a archivo
