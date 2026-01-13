---
title: Linux
summary: "Como instalar o Beekeeper Studio em sistemas Linux"
old_url: "https://docs.beekeeperstudio.io/docs/linux"
---


Existem várias maneiras de instalar o Beekeeper Studio em sistemas Linux.

Arquiteturas Suportadas: `x86-64` (a maioria dos laptops e desktops) e `ARM64` (Raspberry Pi).

!!! info "Recomendamos usar AppImage"
    Descobrimos que eles fornecem a experiência mais consistente em todas as distribuições Linux.

## AppImage

!!! info "Ubuntu requer Bibliotecas Fuse"
    No Ubuntu você precisará instalar libfuse para que o AppImage funcione. Veja como:
    Ubuntu < 22.04 use: `sudo apt-get install fuse libfuse2`
    Ubuntu >= 22.04 use: `sudo apt install libfuse2`

AppImages podem ser baixadas e executadas diretamente na maioria das distribuições Linux sem qualquer tipo de instalação. Isso é ótimo se você não tem acesso root, mas ainda quer usar o Beekeeper Studio.

A distribuição AppImage do Beekeeper Studio fornece atualizações automáticas.

Baixe a AppImage mais recente [da página inicial do Beekeeper Studio](https://www.beekeeperstudio.io/)

Se você quiser integrar a AppImage no shell do seu sistema (para que apareça no seu menu de Aplicativos), recomendamos que você [instale o AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher/releases/latest).

## DEB
Um repositório é fornecido para Debian e Ubuntu 22.04+.

Builds DEB são fornecidas tanto para sistemas x86_64 quanto ARM64.

Configure o repositório usando o código abaixo, ou [baixe o arquivo deb da versão mais recente](https://github.com/beekeeper-studio/beekeeper-studio/releases/latest), e ele instalará automaticamente o repositório na instalação.

```bash
# Instale nossa chave GPG
curl -fsSL https://deb.beekeeperstudio.io/beekeeper.key | sudo gpg --dearmor --output /usr/share/keyrings/beekeeper.gpg \
  && sudo chmod go+r /usr/share/keyrings/beekeeper.gpg \
  && echo "deb [signed-by=/usr/share/keyrings/beekeeper.gpg] https://deb.beekeeperstudio.io stable main" \
  | sudo tee /etc/apt/sources.list.d/beekeeper-studio-app.list > /dev/null

# Atualize o apt e instale
sudo apt update && sudo apt install beekeeper-studio -y
```

## RPM

Builds RPM são fornecidas tanto para sistemas x86_64 quanto ARM64

Configure o repositório usando o código abaixo, ou [baixe o arquivo rpm da versão mais recente](https://github.com/beekeeper-studio/beekeeper-studio/releases/latest), e ele instalará automaticamente o repositório na instalação.

```bash
# Baixe uma cópia do nosso arquivo .repo (para lidar com atualizações de software)
sudo curl -o /etc/yum.repos.d/beekeeper-studio.repo https://rpm.beekeeperstudio.io/beekeeper-studio.repo


# Adicione nossa chave pública GPG
sudo rpm --import https://rpm.beekeeperstudio.io/beekeeper.key

# verifique se o repositório está configurado corretamente
dnf repolist

# Então
sudo dnf install beekeeper-studio
# ou, em sistemas legados
sudo yum install beekeeper-studio
```

## Arch Linux (e derivados)

Pacotes Pacman (instalados como pacotes locais usando `pacman -U`) são fornecidos tanto para sistemas x86_64 quanto ARM64, você pode baixá-los da [versão mais recente](https://github.com/beekeeper-studio/beekeeper-studio).

Integração AUR real em breve.

## Flatpak

Arquivos Flatpak (.flatpak) são fornecidos separadamente tanto para sistemas x86_64 quanto ARM64, você pode baixá-los da [versão mais recente](https://github.com/beekeeper-studio/beekeeper-studio).

Integração Flathub em breve.

## Snap

Você também pode instalar o Beekeeper Studio através do Snapcraft (também parte da Ubuntu Store). Use o link da Snap Store abaixo, ou instale através do terminal.

!!! warning
    Algumas funcionalidades não estão disponíveis na versão Snap do Beekeeper Studio devido ao modelo de segurança dos pacotes Snap.

`snap` vem pré-instalado no Ubuntu 16.04+, e pode ser instalado no [Fedora](https://snapcraft.io/docs/installing-snap-on-fedora) e [Arch](https://snapcraft.io/docs/installing-snap-on-arch-linux)

Veja o Beekeeper na [Snap Store](https://snapcraft.io/beekeeper-studio), ou instale usando o terminal:

```bash
sudo snap install beekeeper-studio
```

### Problemas de Renderização de Fonte

Existem alguns problemas de renderização de fonte com Snaps na versão mais recente do Gnome com a versão `snap` do Beekeeper Studio. Isso só é realmente visível na tela de seleção de arquivo. [Esperamos que seja corrigido em breve](https://forum.snapcraft.io/t/snapped-app-not-loading-fonts-on-fedora-and-arch/12484/66)

Se você ver algo assim, recomendamos que mude para a versão [AppImage](#appimage).



![Image Alt Tag](../assets/images/linux-4.png)
Problemas de renderização de fonte no Gnome 3.38+ com o pacote snap
{: .text-muted .small .text-center }


### Acesso a Chave SSH Para o Snap
Devido ao modelo de segurança do Snap, você precisa ativar manualmente o acesso ao diretório .ssh se quiser usar tunelamento SSH.
Execute `sudo snap connect beekeeper-studio:ssh-keys :ssh-keys`.

- **SSH Agent**: Infelizmente, Snaps não têm como acessar seu SSH Agent, então se você precisar usar o SSH agent recomendamos usar a versão `deb` ou `AppImage` do aplicativo.

## Suporte Wayland (incluindo escalonamento fracional)

O Beekeeper Studio suporta completamente Wayland (testado apenas no Gnome) com escalonamento fracional também.

Se você está experimentando uma interface borrada usando modo Wayland e escalonamento fracional -- ative o modo wayland nativo abaixo.

No entanto, o modo nativo Wayland não é habilitado por padrão devido aos problemas com drivers Nvidia e renderizadores wayland (womp womp).

Para habilitar o modo nativo wayland crie um arquivo `~/.config/bks-flags.conf`. Esta ideia é copiada da [implementação AUR de code-flags para VSCode no wrapper visual-studio-code-bin](https://aur.archlinux.org/cgit/aur.git/commit/?h=visual-studio-code-bin&id=a0595836467bb205fcabb7e6d44ad7da82b29ed2).


### Habilitando suporte Wayland

1. Crie ~/.config/bks-flags.conf
2. Adicione flags para habilitar suporte wayland

```bash
# crie o arquivo
touch ~/.config/bks-flags.conf
```

```bash
# adicione as flags
echo "--ozone-platform-hint=auto" >> ~/.config/bks-flags.conf
echo "--enable-features=UseOzonePlatform" >> ~/.config/bks-flags.conf
```