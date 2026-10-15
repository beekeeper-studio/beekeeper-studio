---
title: Despliegue empresarial en Windows (MSI)
summary: "Desplegar Beekeeper Studio en equipos Windows administrados con el paquete MSI"
---

# Despliegue empresarial en Windows (MSI)

Cada version para Windows incluye un paquete MSI para administradores de TI. Usalo para desplegar Beekeeper Studio con Microsoft Intune, Configuration Manager (SCCM), Directiva de grupo o cualquier otra herramienta que instale paquetes de Windows Installer.

El MSI se adjunta a cada version en la [pagina de versiones de GitHub](https://github.com/beekeeper-studio/beekeeper-studio/releases) como `Beekeeper-Studio-<version>.msi`.

## Paquete MSI vs instalador `.exe`

|                                | Paquete MSI                                            | Instalador `.exe`                           |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------- |
| Ubicacion de instalacion       | Todos los usuarios, `C:\Program Files\Beekeeper Studio` | Usuario actual por defecto, todos los usuarios opcional |
| Instalacion desatendida        | `msiexec /i <archivo>.msi /qn`                         | `<archivo>.exe /S`                          |
| Accesos directos               | Menu Inicio, todos los usuarios                        | Menu Inicio y escritorio                    |
| Actualizaciones                | Las despliega TI, se avisa a los usuarios cuando hay una | La aplicacion se actualiza sola            |
| Visual C++ Redistributable     | Requerido, la instalacion falla sin el                 | Se descarga durante la instalacion si falta |

## Avisos de actualizacion

Una instalacion MSI nunca descarga ni instala actualizaciones. Consulta GitHub al iniciar y una vez al dia en busca de nuevas versiones estables y, cuando hay una, muestra a los usuarios un aviso para que contacten a su administrador de sistemas. Para desactivar el aviso, agrega esto a [`system.config.ini`](#administrar-ajustes):

```ini
[general]
checkForUpdatesDisabled = true
```

La opcion **Release Channel** no aparece en el menu **Help**, asi que los usuarios no pueden optar por versiones beta.

## Requisito previo: Visual C++ Redistributable

Beekeeper Studio requiere Microsoft Visual C++ Redistributable (x64). El MSI no lo instala y se niega a instalarse sin el: una instalacion silenciosa termina con el codigo `1603` y este mensaje en su registro:

```text
Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). Install it from https://aka.ms/vc14/vc_redist.x64.exe, then run this installer again.
```

Despliega el runtime primero. En Intune o Configuration Manager, agregalo como dependencia de la aplicacion Beekeeper Studio para que se instale automaticamente antes. Para instalarlo manualmente:

```bat
vc_redist.x64.exe /install /quiet /norestart
```

Descarga el instalador desde [https://aka.ms/vc14/vc_redist.x64.exe](https://aka.ms/vc14/vc_redist.x64.exe).

## Instalar

Ejecuta desde una consola con privilegios elevados, o como SYSTEM desde tu herramienta de despliegue:

```bat
msiexec /i "Beekeeper-Studio-6.1.5.msi" /qn /norestart /l*v "%TEMP%\beekeeper-studio-install.log"
```

`/qn` instala sin interfaz. Omite `/l*v ...` si no necesitas un registro de instalacion.

## Actualizar

Despliega el MSI mas reciente con el mismo comando. Windows Installer reemplaza la version instalada. Todas las versiones comparten el codigo de actualizacion (upgrade code) `{D5B3EEEB-1754-55D1-A12B-C0245BF59784}`, para herramientas que identifican productos por ese codigo.

Las conexiones, consultas guardadas y ajustes se guardan por usuario en `%APPDATA%\beekeeper-studio` y se conservan entre actualizaciones.

Instalar un MSI anterior sobre uno mas reciente falla con *A newer version of "Beekeeper Studio" is already installed*. Para volver a una version anterior, desinstala primero.

## Desinstalar

```bat
msiexec /x "Beekeeper-Studio-6.1.5.msi" /qn /norestart
```

Los datos de los usuarios en `%APPDATA%\beekeeper-studio` se conservan.

## Herramientas de despliegue

- **Microsoft Intune**: agrega el MSI como *Line-of-business app* y asignalo a grupos de dispositivos. Intune lee el codigo de producto y la version del paquete.
- **Configuration Manager**: crea una aplicacion con un tipo de implementacion *Windows Installer (\*.msi file)*. El codigo de producto del MSI sirve como metodo de deteccion.
- **Directiva de grupo**: copia el MSI a un recurso compartido de red que las cuentas de equipo puedan leer y asignalo en *Computer Configuration > Policies > Software Settings > Software installation*.

## No lo mezcles con el instalador `.exe`

Desinstala las copias instaladas con el instalador `.exe` antes de desplegar el MSI:

- Una instalacion `.exe` para todos los usuarios usa la misma carpeta `C:\Program Files\Beekeeper Studio` que el MSI.
- Una instalacion `.exe` por usuario sigue actualizandose sola y agrega una segunda entrada en el menu Inicio.

## Administrar ajustes

Los ajustes en `C:\ProgramData\beekeeper-studio\system.config.ini` se aplican a todos los usuarios del equipo y reemplazan sus propios ajustes. Despliega este archivo junto con el MSI usando la misma herramienta. Por ejemplo, para cerrar las conexiones a bases de datos cuando Windows se bloquea o el usuario esta inactivo:

```ini
[security]
disconnectOnLock = true
disconnectOnIdle = true
idleThresholdSeconds = 900
```

Consulta [Configuracion](../user_guide/configuration.md) para ver todos los ajustes disponibles.

## Usar el instalador `.exe`

El instalador `.exe` tambien admite instalaciones desatendidas:

```bat
Beekeeper-Studio-Setup-6.1.5.exe /S /allusers
```

Se actualiza solo por defecto. Para desactivarlo, agrega esto a `system.config.ini`:

```ini
[general]
checkForUpdatesDisabled = true
```
