---
title: Configuracion
summary: "Personaliza el comportamiento de Beekeeper Studio con archivos de configuracion INI - ajusta atajos, tiempos de espera, configuraciones de seguridad y mas."
old_url: ""
icon: material/cog
---

# Configuracion

Beekeeper Studio usa un sistema de configuracion `ini` que te permite personalizar la aplicacion para que coincida con tu flujo de trabajo y preferencias. Usando archivos de configuracion INI simples, puedes ajustar todo, desde atajos de teclado y tiempos de espera de conexion de base de datos hasta configuraciones de seguridad como proteccion con PIN.

!!! tip "Inicio rapido"
    Nuevo en la configuracion? Salta a la [seccion de Primeros pasos](#getting-started-with-configuration) para un recorrido simple, o revisa nuestras [configuraciones de ejemplo](#example-configurations) para ver personalizaciones comunes.

## Archivos de configuracion

Beekeeper Studio usa un sistema de configuracion de tres niveles que te da control flexible sobre las configuraciones. Las configuraciones se cargan en el orden a continuacion.

| Configuracion | Proposito                                         | Orden de carga |
| ------------- | ------------------------------------------------- | -------------- |
| **Predeterminada** | Configuraciones base que vienen con la aplicacion | Primero |
| **Usuario**        | Tus personalizaciones personales                  | Segundo |
| **Administrador**  | Configuraciones a nivel de maquina (controladas por admin) | Tercero |

Eso significa: Las configuraciones de administrador anulan las configuraciones de usuario, las configuraciones de usuario anulan las configuraciones predeterminadas. Los administradores de TI pueden aplicar politicas proporcionando una configuracion de administrador a nivel de maquina.

{% include-markdown '../includes/config_file_directories.md'%}


## Como usar archivos de configuracion

### Paso 1: Crear tu archivo de configuracion

Decide que archivo cambiar (usuario o administrador). Si el archivo aun no existe, crealo usando cualquier editor de texto. Aqui hay una configuracion inicial simple. Puedo poner esto en mi **configuracion de Usuario**:

```ini
; Mi configuracion de Beekeeper Studio
; Las lineas que comienzan con punto y coma son comentarios

[ui.tableTable]
pageSize = 200                          ; Mostrar mas filas por pagina

```

### Paso 2: Guardar y reiniciar

1. Guarda tu archivo de configuracion
2. Reinicia Beekeeper Studio
3. Tu nueva configuracion tendra efecto


!!! warning "La configuracion no funciona?"
    Si tus cambios no surten efecto:

    - **Ubicacion del archivo**: Asegurate de que tu archivo de configuracion este en el directorio correcto para tu sistema operativo
    - **Errores de sintaxis**: Verifica la sintaxis INI (encabezados de seccion en `[corchetes]`, espacios alrededor de `=`)
    - **Reinicio requerido**: Los cambios de configuracion requieren un reinicio completo de la aplicacion
    - **Nombres de configuracion**: Busca errores tipograficos en nombres de seccion o claves de configuracion
    - **Permisos de archivo**: Asegurate de que el archivo de configuracion sea legible por Beekeeper Studio
    - **Revisar logs**: Habilita el registro de depuracion para ver los detalles de carga de configuracion

## Referencia de configuracion

A continuacion estan los valores de configuracion predeterminados para Beekeeper Studio, copia y modifica segun sea necesario.
{% ini-include %}
