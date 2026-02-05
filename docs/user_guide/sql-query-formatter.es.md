---
title: Formateador de consultas SQL
summary: "Un formateador completo para guardar y usar preajustes para formatear tu SQL"
icon: material/format-align-center
---

El formateador de consultas SQL de Beekeeper es una excelente manera de asegurar que tu SQL cumpla con requisitos de formato estrictos, ya sea de tu jefe o simplemente de ti mismo. El formateador de consultas SQL trae las opciones del [paquete NPM SQL Formatter](https://www.npmjs.com/package/sql-formatter) a tu alcance para establecer, guardar y usar preajustes de formato.

## Primeros pasos

Haz clic derecho en la ventana del editor y selecciona **Abrir formateador de consultas** o haz clic en el boton junto a **Guardar** y **Ejecutar** para abrir el formateador. Desde ahi, puedes seleccionar y actualizar cualquiera de los preajustes disponibles.

![Formateador](../assets/images/sql-query-formatter/formatter-modal.png)

### Preajustes integrados
1. bk-default (predeterminado)
2. pgFormatter
3. prettier-sql

### Actualizar preajuste predeterminado
Puedes establecer el formateador predeterminado para tus consultas usando el [sistema de configuracion](./configuration.md) de Beekeeper Studio. Por defecto esto sera **bk-default**.

```ini
[ui.queryEditor]
defaultFormatter = bk-default
```

## Como formatear consultas

![formatear-consulta](../assets/images/sql-query-formatter/format-query.gif)

1. Abre el formateador de consultas SQL
2. Selecciona un preajuste del menu desplegable para usar como base
3. Selecciona opciones y asegurate de que la configuracion sea como deseas desde la vista previa a la derecha
4. Haz clic en Aplicar

*Nota, aplicar no guarda estas configuraciones al preajuste seleccionado.*


## Como guardar un preajuste

Sigue las instrucciones para formatear una consulta, pero en lugar de hacer clic en **Aplicar**, haz clic en **Guardar preajuste**

*Nota: Guardar no aplica automaticamente las actualizaciones. Haz clic en Aplicar para que la configuracion se aplique a tu consulta.*

## Crear un nuevo preajuste

![crear-nuevo-preajuste](../assets/images/sql-query-formatter/formatter-new-preset.gif)

1. Abre el formateador de consultas SQL
2. Selecciona un preajuste del menu desplegable para usar como base
3. Haz clic en el boton + junto al menu desplegable de preajustes
4. Ingresa un nombre para el formato (debe ser un nombre unico)
5. Selecciona opciones y asegurate de que la configuracion sea como deseas desde la vista previa a la derecha
6. Haz clic en **Guardar preajuste**

*Nota: Para aplicar el preajuste a tu SQL, haz clic en Aplicar.*

## Eliminar un preajuste

1. Abre el formateador de consultas SQL
2. Selecciona el preajuste del menu desplegable que quieres eliminar
3. Haz clic en el boton **Eliminar configuracion** junto

*Nota: Los 3 preajustes integrados no pueden ser eliminados. Sin embargo, pueden ser editados.*

## Formatear consultas usando preajustes

![seleccionar-preajuste](../assets/images/sql-query-formatter/formatter-select-preset.gif)

1. Haz clic derecho en tu ventana del editor
2. Pasa el cursor sobre **Formatear consulta**
3. Selecciona un preajuste de tus preajustes guardados.
