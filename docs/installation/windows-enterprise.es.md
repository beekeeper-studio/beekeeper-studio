---
title: Despliegue empresarial en Windows (MSI)
summary: "Desplegar Beekeeper Studio en equipos Windows administrados con el paquete MSI"
---

# Despliegue empresarial en Windows (MSI)

Cada version para Windows incluye un paquete MSI para administradores de TI. Usalo para desplegar Beekeeper Studio con Microsoft Intune, Configuration Manager (SCCM), Directiva de grupo o cualquier otra herramienta que instale paquetes de Windows Installer.

El MSI se adjunta a cada version en la [pagina de versiones de GitHub](https://github.com/beekeeper-studio/beekeeper-studio/releases) como `Beekeeper-Studio-<version>.msi` para PCs x64, y `Beekeeper-Studio-<version>-arm64.msi` para PCs con [Windows on ARM](#windows-on-arm).

## Particularidades conocidas { #known-quirks }

Leelas antes de desplegar. Cada una se explica con mas detalle mas abajo.

- **Dos MSI, uno por arquitectura.** Despliega el MSI x64 en los PCs x64 y el MSI ARM64 en los PCs con Windows on ARM. Asigna solo uno de ellos a cada dispositivo: cada uno reemplaza al otro, incluso con la misma version. Consulta [Windows on ARM](#windows-on-arm).
- **El MSI ARM64 aparece como x64.** Intune, Configuration Manager y las herramientas de inventario lo muestran como un paquete x64, pero instala la aplicacion ARM64 nativa. Selecciona los PCs ARM64 con grupos o filtros de dispositivos, no con la arquitectura del paquete. Consulta [Por que el MSI ARM64 aparece como x64](#arm64-msi-labelled-x64).
- **El MSI x64 tambien se instala en PCs ARM64**, donde Beekeeper Studio se ejecuta con emulacion. El MSI ARM64 se niega a instalarse en PCs x64.
- **El Visual C++ Redistributable no viene incluido.** Despliega primero el runtime que corresponde al MSI (x64 o ARM64), o la instalacion falla con el codigo de salida `1603`. Consulta [Requisito previo: Visual C++ Redistributable](#vc-redist).
- **Sin actualizaciones automaticas.** Una instalacion MSI nunca se actualiza sola. Despliega cada MSI nuevo; los usuarios ven un aviso cuando sale una version. Consulta [Avisos de actualizacion](#update-notifications).
- **Un codigo de producto nuevo en cada MSI.** Cada MSI tiene su propio codigo de producto, incluidos los MSI x64 y ARM64 de la misma version. El codigo de actualizacion (upgrade code) no cambia nunca. Las reglas de deteccion basadas en el codigo de producto necesitan el codigo nuevo en cada version.
- **No lo mezcles con el instalador `.exe`** en el mismo PC. Consulta [No lo mezcles con el instalador `.exe`](#dont-mix-exe).

## Paquete MSI vs instalador `.exe`

|                                | Paquete MSI                                            | Instalador `.exe`                           |
| ------------------------------ | ------------------------------------------------------ | ------------------------------------------- |
| Ubicacion de instalacion       | Todos los usuarios, `C:\Program Files\Beekeeper Studio` | Usuario actual por defecto, todos los usuarios opcional |
| Instalacion desatendida        | `msiexec /i <archivo>.msi /qn`                         | `<archivo>.exe /S`                          |
| Accesos directos               | Menu Inicio, todos los usuarios                        | Menu Inicio y escritorio                    |
| Actualizaciones                | Las despliega TI, se avisa a los usuarios cuando hay una | La aplicacion se actualiza sola            |
| Visual C++ Redistributable     | Requerido, la instalacion falla sin el                 | Se descarga durante la instalacion si falta |

## Avisos de actualizacion { #update-notifications }

Una instalacion MSI nunca descarga ni instala actualizaciones. Consulta GitHub al iniciar y una vez al dia en busca de nuevas versiones estables y, cuando hay una, muestra a los usuarios un aviso para que contacten a su administrador de sistemas. Para desactivar el aviso, agrega esto a [`system.config.ini`](#administrar-ajustes):

```ini
[general]
checkForUpdatesDisabled = true
```

La opcion **Release Channel** no aparece en el menu **Help**, asi que los usuarios no pueden optar por versiones beta.

## Requisito previo: Visual C++ Redistributable { #vc-redist }

Beekeeper Studio requiere Microsoft Visual C++ Redistributable (x64). El MSI no lo instala y se niega a instalarse sin el: una instalacion silenciosa termina con el codigo `1603` y este mensaje en su registro:

```text
Beekeeper Studio requires the Microsoft Visual C++ Redistributable (x64). Install it from https://aka.ms/vc14/vc_redist.x64.exe, then run this installer again.
```

Despliega el runtime primero. En Intune o Configuration Manager, agregalo como dependencia de la aplicacion Beekeeper Studio para que se instale automaticamente antes. Para instalarlo manualmente:

```bat
vc_redist.x64.exe /install /quiet /norestart
```

Descarga el instalador desde [https://aka.ms/vc14/vc_redist.x64.exe](https://aka.ms/vc14/vc_redist.x64.exe).

La comprobacion busca la entrada del registro que crea el instalador del runtime. Si el runtime esta en el equipo pero se instalo de otra forma, omite la comprobacion:

```bat
msiexec /i "Beekeeper-Studio-6.1.5.msi" /qn SKIP_VCREDIST_CHECK=1
```

Hazlo solo si el runtime realmente esta instalado: los controladores de bases de datos de Beekeeper Studio lo necesitan.

El MSI ARM64 necesita en su lugar el runtime ARM64, desde [https://aka.ms/vc14/vc_redist.arm64.exe](https://aka.ms/vc14/vc_redist.arm64.exe), y se niega a instalarse sin el con este mensaje:

```text
Beekeeper Studio requires the Microsoft Visual C++ Redistributable (ARM64). Install it from https://aka.ms/vc14/vc_redist.arm64.exe, then run this installer again.
```

`SKIP_VCREDIST_CHECK=1` funciona igual con el.

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

## Windows on ARM (ARM64) { #windows-on-arm }

Despliega `Beekeeper-Studio-<version>-arm64.msi` en los PCs con Windows on ARM. Instala la version ARM64 nativa de Beekeeper Studio con los mismos comandos y propiedades que el MSI x64, y necesita el [runtime de Visual C++ ARM64](#vc-redist).

Solo se instala en PCs ARM64. En un PC x64 falla con el codigo de salida `1603` y este mensaje:

```text
This installer is for Windows on ARM (ARM64) PCs. Use the x64 Beekeeper Studio MSI on this PC.
```

Algunas funciones de bases de datos funcionan distinto en ARM64. Consulta [Windows on ARM](./windows.md#windows-on-arm).

### Por que el MSI ARM64 aparece como x64 { #arm64-msi-labelled-x64 }

Los instaladores de Beekeeper Studio se generan con electron-builder, y la version de WiX Toolset que incluye no puede crear paquetes ARM64 ([electron-builder#6077](https://github.com/electron-userland/electron-builder/issues/6077)). Por eso el MSI ARM64 es un paquete x64 que contiene la aplicacion ARM64:

- La plataforma del paquete (su propiedad de resumen `Template`) es `x64;1033`. Intune, Configuration Manager y las herramientas de inventario que la leen muestran el paquete como x64.
- La aplicacion que instala es ARM64 nativa, en la misma carpeta `C:\Program Files\Beekeeper Studio` que el MSI x64. La columna **Arquitectura** de la pestana **Detalles** del Administrador de tareas muestra `ARM64` para ella.
- Las comprobaciones del instalador miran el PC, no el paquete: rechaza los PCs x64 y busca el runtime ARM64.

Asigna el MSI ARM64 con grupos de dispositivos, filtros de asignacion o reglas de requisitos que seleccionen PCs ARM64. No dependas de la arquitectura del paquete.

### Pasar PCs del MSI x64 a ARM64 { #move-to-arm64 }

El MSI x64 no comprueba la arquitectura, asi que tambien se instala en PCs ARM64, donde Beekeeper Studio se ejecuta con emulacion. Ambos MSI comparten el codigo de actualizacion, y cada uno reemplaza al otro, incluso con la misma version. Por eso:

- Asigna solo un MSI a cada dispositivo. Si un dispositivo recibe los dos, cada instalacion elimina la otra, y una herramienta que aplica ambas asignaciones los reinstala una y otra vez.
- Para pasar un PC ARM64 a la version nativa, sacalo de la asignacion del MSI x64 (sirve un grupo de exclusion) y luego asignale el MSI ARM64. El MSI ARM64 reemplaza la instalacion x64 y se conservan los datos de los usuarios en `%APPDATA%\beekeeper-studio`.

## Desinstalar

```bat
msiexec /x "Beekeeper-Studio-6.1.5.msi" /qn /norestart
```

Los datos de los usuarios en `%APPDATA%\beekeeper-studio` se conservan.

## Herramientas de despliegue

Agrega los MSI x64 y ARM64 como aplicaciones (o tipos de implementacion) separadas, y asigna cada uno a sus propios PCs. Consulta [Windows on ARM](#windows-on-arm).

- **Microsoft Intune**: agrega el MSI como *Line-of-business app* y asignalo a grupos de dispositivos. Intune lee el codigo de producto y la version del paquete.
- **Configuration Manager**: crea una aplicacion con un tipo de implementacion *Windows Installer (\*.msi file)*. El codigo de producto del MSI sirve como metodo de deteccion.
- **Directiva de grupo**: copia el MSI a un recurso compartido de red que las cuentas de equipo puedan leer y asignalo en *Computer Configuration > Policies > Software Settings > Software installation*.

## No lo mezcles con el instalador `.exe` { #dont-mix-exe }

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
