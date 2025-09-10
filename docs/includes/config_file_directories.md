!!! note "Configuration File Locations"

    Beekeeper Studio looks for specific files in specific locations. This is not configurable. Note that the user and admin files have different names

    === "MacOS"
        | Config | Location |
        | ---- | ------ |
        | User | ~/Library/Application Support/beekeeper-studio/user.config.ini |
        | Admin | /Library/Application Support/beekeeper-studio/system.config.ini |

    === "Linux"
        | Config | Location |
        | ---- | ----- |
        | User | ~/.config/beekeeper-studio/user.config.ini |
        | Admin | /etc/beekeeper-studio/system.config.ini |

    === "Windows"
        | Config | Location |
        | ---- | ----- |
        | User | %APPDATA%\beekeeper-studio\user.config.ini |
        | Admin | C:\ProgramData\beekeeper-studio\system.config.ini |

    === "Local Development"

        Put a `local.config.ini` in the root of the Beekeeper Studio project directory. This is used only during app development and takes the place of both user and admin files.