---
title: Ubicacion de Almacenamiento de Datos
summary: "Donde Beekeeper Studio almacena tus consultas SQL y conexiones cuando las guardas."
old_url: "https://docs.beekeeperstudio.io/docs/deep-dive-overview"
---

Cuando guardas conexiones y consultas SQL en Beekeeper Studio, se persisten en una base de datos SQLite en el directorio de configuracion de la aplicacion.

## Ubicacion de la Base de Datos

La base de datos se llama `app.db` y se almacena en la carpeta `userData` que el sistema operativo proporciona para que Beekeeper Studio almacene configuraciones y preferencias.

### Ubicaciones del directorio UserData:

- Windows: `<Directorio de Usuario>\AppData\Roaming\beekeeper-studio`
- MacOS: `~/Library/Application Support/Beekeeper Studio`
    - Nota: El directorio ~/Library esta tipicamente oculto en Finder. Sin embargo, puedes usar Ir -> Ir a la carpeta para abrir este directorio.
- Linux: `~/.config/beekeeper-studio`

## Acceder a la Base de Datos de Beekeeper Studio...Desde Beekeeper Studio

Si navegas a `Ayuda -> Agregar Base de Datos de Beekeeper` la aplicacion agregara una nueva conexion de base de datos para que uses - la propia base de datos de Beekeeper.

Puedes usar esta conexion para explorar tus datos guardados, exportar consultas SQL, o hacer lo que necesites.
