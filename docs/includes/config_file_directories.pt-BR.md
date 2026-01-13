!!! note "Localizações dos Arquivos de Configuração"

    O Beekeeper Studio procura arquivos específicos em localizações específicas. Isso não é configurável. Note que os arquivos de usuário e administrador têm nomes diferentes

    === "MacOS"
        | Configuração | Localização |
        | ---- | ------ |
        | Usuário | ~/Library/Application Support/beekeeper-studio/user.config.ini |
        | Administrador | /Library/Application Support/beekeeper-studio/system.config.ini |

    === "Linux"
        | Configuração | Localização |
        | ---- | ----- |
        | Usuário | ~/.config/beekeeper-studio/user.config.ini |
        | Administrador | /etc/beekeeper-studio/system.config.ini |

    === "Windows"
        | Configuração | Localização |
        | ---- | ----- |
        | Usuário | %APPDATA%\beekeeper-studio\user.config.ini |
        | Administrador | C:\ProgramData\beekeeper-studio\system.config.ini |

    === "Desenvolvimento Local"

        Coloque um `local.config.ini` na raiz do diretório do projeto Beekeeper Studio. Isso é usado apenas durante o desenvolvimento do aplicativo e substitui tanto os arquivos de usuário quanto de administrador.