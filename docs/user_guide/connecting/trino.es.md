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
- **Puerto**: El puerto predeterminado es 8080 para HTTP, o 8443 para HTTPS. Esto se puede personalizar si tu servidor usa un puerto diferente.
- **Nombre de usuario**: Tu nombre de usuario de Trino, siendo default el valor predeterminado tipico.
- **Contrasena**: Tu contrasena de Trino, si aplica.
- **Catalogo predeterminado (opcional)**: El catalogo al que quieres conectarte inicialmente al inicio

### Conexiones SSL / HTTPS

Si tu coordinador Trino esta configurado con TLS/HTTPS, habilita **SSL** en el formulario de conexion. Beekeeper Studio soporta tres modos de SSL:

1. **Confiar en el certificado del servidor** — Habilita SSL sin proporcionar archivos de certificado. Beekeeper Studio se conectara por HTTPS pero no verificara el certificado del servidor. Esta es la opcion mas sencilla y funciona con certificados autofirmados.
2. **Proporcionar un certificado CA** — Si tu servidor Trino usa un certificado firmado por una CA privada, proporciona el archivo de certificado CA. Deja "Rechazar no autorizados" desmarcado para permitir la conexion.
3. **Verificacion completa de certificados** — Proporciona el certificado CA y opcionalmente un certificado de cliente y archivo de clave, luego marca "Rechazar no autorizados" para aplicar la verificacion TLS completa.

!!! tip
    Si importas una URL de conexion que comienza con `https://`, SSL se habilitara automaticamente.

### Probar tu conexion de Trino

Antes de guardar los detalles de tu conexion, Beekeeper Studio te permite probar la conexion:

1. Ingresa los detalles de tu conexion.
2. Haz clic en el boton *Probar conexion*.
3. Si la prueba es exitosa, estas listo para conectarte. De lo contrario, verifica tus datos e intenta de nuevo.

### Guardar tu conexion de Trino

Una vez que los detalles de tu conexion han sido verificados, puedes elegir guardarlos ingresando un nombre, marcando la casilla `Guardar contrasenas` si lo deseas, y luego haciendo clic en guardar.

## Funciones soportadas

- Conexiones SSL / HTTPS (con archivos opcionales de CA, certificado de cliente y clave)
- Vista de datos de tabla
- Ordenamiento y filtrado de datos de tabla
- Vista de estructura de tabla
- Descargar resultados de consulta como JSON, CSV o Markdown

## Todavia pendiente

- Tuneles SSH
- Ejecutar consulta(s) directamente a archivo
