---
title: Seguridad y privacidad
summary: Configuracion y funciones para darte mas control de tu instalacion de Beekeeper Studio
icon: material/security
---

Beekeeper ofrece varias funciones disenadas para ayudarte a gestionar la privacidad de tu sesion, asegurar tu entorno o aplicar configuraciones de seguridad para todos los usuarios.


## Configuraciones de seguridad

Beekeeper Studio tiene varias configuraciones de seguridad

{% ini-include section="security" %}

### Modo de bloqueo con PIN

Habilitar el modo de bloqueo con PIN requiere que cualquier usuario de Beekeeper Studio ingrese un codigo PIN antes de conectarse a una base de datos. Combina esta configuracion con la desconexion automatica para mayor seguridad.

!!! warning "No olvides tu PIN"
    Si olvidas tu PIN, la unica forma de recuperarlo es eliminando tu instalacion local o deshabilitando el modo PIN por completo.

#### Pasos de restablecimiento (si olvidas tu PIN)

1. **Cierra Beekeeper Studio completamente**

2. **Elimina el directorio de datos de la aplicacion**:
   - **Windows**: `%APPDATA%\beekeeper-studio\`
   - **macOS**: `~/Library/Application Support/beekeeper-studio/`
   - **Linux**: `~/.config/beekeeper-studio/`

3. **Reinicia Beekeeper Studio** - comenzara de nuevo con la configuracion predeterminada


### Recomendaciones de seguridad empresarial

Para aplicar configuraciones de seguridad a todos los usuarios de Beekeeper Studio, puedes implementar un archivo de configuracion de administrador (`system.config.ini`) (consulta la [documentacion de configuracion](./configuration.md) como referencia)

1. Crea un archivo ini
2. Habilita `lockMode = pin`.
3. Habilita las 3 opciones de desconexion automatica con tiempos de espera razonables
4. Implementa este archivo de configuracion en la ubicacion de 'configuracion de administrador' para tu sistema operativo (ver arriba)

Esto obliga a todos los usuarios a establecer un PIN en la primera carga de la aplicacion, requiere ingresar el PIN al conectarse a una base de datos y desconecta a los usuarios cuando su sistema esta bloqueado, suspendido o inactivo.


## Modo de privacidad

Beekeeper Studio proporciona un modo de privacidad que oculta datos sensibles cuando compartes tu pantalla, para que puedas mantener la informacion privada en privado.

Al pasar el cursor sobre la barra lateral, puedes ver el boton "Alternar modo de privacidad", representado con un ojo.
Hacer clic en este boton alternara el modo de privacidad entre encendido/apagado.

| Modo de privacidad apagado | Modo de privacidad encendido |
| - | - |
|![image](../assets/images/privacy/privacy-mode-1.png)|![image](../assets/images/privacy/privacy-mode-2.png) |
| Fig.1 Boton apagado | Fig.2 Boton encendido |

### Que se oculta?

El modo de privacidad oculta algunos campos que podrian considerarse sensibles:
- Host / Puerto / BD en conexiones guardadas
- Ventana emergente con la URL completa al pasar el cursor
- Host / Puerto / BD en configuracion de conexion
- URL al pasar el cursor sobre el nombre de la BD despues de conectarse

| Host / Puerto / BD ocultos en conexiones guardadas | La ventana emergente con la URL completa al pasar el cursor |
|-|-|
|![image](../assets/images/privacy/privacy-mode-3.png) | ![image](../assets/images/privacy/privacy-mode-4.png)|
| Fig.3 - Funcion oculta 1 | Fig.4 - Funcion oculta 2 |

| Host / Puerto / BD en configuracion de conexion |  URL al pasar el cursor sobre el nombre de la BD despues de conectarse |
| - | - |
|![image](../assets/images/privacy/privacy-mode-5.png) | ![image](../assets/images/privacy/privacy-mode-6.png) |
| Fig.5 - Funcion oculta 3 | Fig.6 - Funcion oculta 4 |
