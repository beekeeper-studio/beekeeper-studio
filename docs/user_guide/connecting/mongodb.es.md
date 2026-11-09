---
title: MongoDB
summary: "Conectate a MongoDB con Beekeeper Studio"
icon: simple/mongodb
description: "Usa una shell de MongoDB o editor SQL para ejecutar consultas contra MongoDB usando Beekeeper Studio"
---

# Soporte de MongoDB

## Funciones soportadas

- Vista de datos de tabla
- Ordenamiento y filtrado de datos de tabla
- Vista de estructura de tabla
- Barra lateral de entidades
- Edicion de datos
- Ejecutar consultas en algun tipo de REPL
- Escribir SQL contra Mongo
- Importar/Exportar
- Respaldo/Restauracion
- Edicion de esquema
- Modo solo lectura


## Todavia pendiente

- Tuneles SSH

## Windows on ARM { #windows-on-arm }

!!! note "El cifrado del lado del cliente no esta disponible en Windows ARM64"
    El cifrado de campos del lado del cliente (CSFLE) y Queryable Encryption de MongoDB necesitan la biblioteca `mongodb-client-encryption`, que MongoDB no publica para Windows ARM64. La version ARM64 de Beekeeper Studio no la incluye. Todo lo demas de esta pagina funciona igual que en x64.

    Si dependes del cifrado del lado del cliente, usa la version x64 de Beekeeper Studio, que funciona en PCs con Windows on ARM mediante emulacion. Consulta [Windows on ARM](../../installation/windows.md#windows-on-arm).
