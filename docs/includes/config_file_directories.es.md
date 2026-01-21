!!! note "Ubicaciones de Archivos de Configuracion"

    Beekeeper Studio busca archivos especificos en ubicaciones especificas. Esto no es configurable. Ten en cuenta que los archivos de usuario y administrador tienen nombres diferentes

    === "MacOS"
        | Config | Ubicacion |
        | ---- | ------ |
        | Usuario | ~/Library/Application Support/beekeeper-studio/user.config.ini |
        | Admin | /Library/Application Support/beekeeper-studio/system.config.ini |

    === "Linux"
        | Config | Ubicacion |
        | ---- | ----- |
        | Usuario | ~/.config/beekeeper-studio/user.config.ini |
        | Admin | /etc/beekeeper-studio/system.config.ini |

    === "Windows"
        | Config | Ubicacion |
        | ---- | ----- |
        | Usuario | %APPDATA%\beekeeper-studio\user.config.ini |
        | Admin | C:\ProgramData\beekeeper-studio\system.config.ini |

    === "Desarrollo Local"

        Coloca un `local.config.ini` en la raiz del directorio del proyecto de Beekeeper Studio. Esto se usa solo durante el desarrollo de la aplicacion y toma el lugar de los archivos de usuario y admin.
