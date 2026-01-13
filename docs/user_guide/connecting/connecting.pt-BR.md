---
title: Bancos de Dados Suportados
summary: "Como começar a usar o Beekeeper Studio com seu banco de dados de escolha."
old_url: "https://docs.beekeeperstudio.io/docs/first-page"
---

Conectar ao seu banco de dados do Beekeeper Studio é fácil. Você pode conectar a um banco de dados de algumas maneiras diferentes:

1. Para bancos de dados SQLite, você pode simplesmente dar duplo clique no arquivo em seu navegador de arquivos
2. Para outros bancos de dados, você pode especificar host e porta, ou o caminho do socket unix.
3. Alguns fornecedores de nuvem suportam conectar com métodos de autenticação customizados, o Beekeeper Studio suporta muitos desses também (ex: SSO para Azure SQL).


## Primeiro Passo: Selecionar Tipo de Conexão

Quando você abre o Beekeeper Studio pela primeira vez, verá a tela de conexão. Pode selecionar o tipo de conexão que quer fazer do dropdown.

Você também pode importar uma URL de banco de dados aqui, isso é super útil para Heroku Postgres, Azure SQL, e outros bancos de dados em nuvem.

### Opcional: Explorar O Banco de Dados Demo

Toda nova instalação do Beekeeper Studio vem com um `Demo Database` no menu do lado direito. Este é um pequeno banco de dados SQLite que empacotamos com o app. Você pode usar isso para explorar os recursos do Beekeeper Studio sem conectar a um banco de dados real.

## Completo

![Image Alt Tag](../../assets/images/first-page-5.png)
A Tela de Conexão do Beekeeper Studio

## Modo de Conexão

Você pode conectar a alguns bancos de dados com uma conexão `socket` ou `TCP`. Conexões socket funcionam apenas quando o servidor do banco de dados está executando em sua máquina local (é a configuração padrão para uma instalação MySQL por exemplo). Conexões TCP requerem um hostname e porta.

![Image Alt Tag](../../assets/images/first-page-6.png)

Exemplo de conexão TCP (Host/Porta)

Note que SSL, SSH, e outras opções de conexão avançadas estão disponíveis apenas com uma conexão TCP.

## SSL

![Image Alt Tag](../../assets/images/first-page-7.png)

Configuração SSL do Beekeeper Studio


Há três maneiras de conectar a um banco de dados com SSL

1. **Trust the server:** Conectar com SSL sem fornecer seu próprio certificado. Este é o padrão.
2. **Required Cert:** Conectar com SSL, fornecer seus próprios certs, e desabilitar `rejectUnauthorized`.
3. **Verified Cert:** Conectar com SSL, fornecer seus próprios certs, e habilitar `rejectUnauthorized`.

Aqui está uma tabela de como as várias flags `sslmode` de clientes de linha de comando mapeiam para o Beekeeper:

| sslmode     | Ligar SSL? | rejectUnauthorized |
| ----------- | ------------ | ------------------ |
| disable     | no           | n/a                |
| allow       | no           | n/a                |
| prefer      | no           | n/a                |
| require     | yes          | false              |
| verify-ca   | yes          | false              |
| verify-full | yes          | true               |

Você pode fornecer seus próprios arquivos de certificado customizados se necessário.


## SSH

![Image Alt Tag](../../assets/images/first-page-8.png)

Configuração SSH do Beekeeper Studio


### Configuração do Servidor

Antes de poder usar um túnel SSH para conectar ao seu banco de dados, você precisa ter certeza que seu servidor SSH está configurado corretamente.

Primeiro tenha certeza que a seguinte linha está definida em seu `/etc/ssh/sshd_config`:

```
AllowTcpForwarding yes
```

#### chaves públicas ssh-rsa

Se você está usando uma chave ssh gerada pelo algoritmo `ssh-rsa`, precisará habilitar suporte para esse algoritmo em seu servidor ssh.

Para fazer isso, pode adicionar a seguinte linha ao arquivo `/etc/ssh/sshd_config` em seu servidor SSH

```
PubkeyAcceptedKeyTypes +ssh-rsa
```
Sim, o `+` é intencional


### Opções de Configuração do Cliente


O Beekeeper suporta tunelamento da sua conexão via SSH. Para conectar a um banco de dados remoto usando sua conta SSH naquela máquina:

1. **Ative o SSH Tunnel** para revelar os campos de detalhe de conexão ssh

2. **Digite o SSH Hostname** ou endereço IP do servidor SSH remoto

3. **Altere a Porta do servidor SSH** se não aceita conexões na porta padrão 22

4. **Digite Bastion Host (JumpHost)** (opcional) se a rede do seu servidor requer que você conecte através de um [JumpHost](https://www.redhat.com/sysadmin/ssh-proxy-bastion-proxyjump)

5. **Digite o Keepalive Interval** (opcional) para especificar, _em segundos_, com que frequência fazer ping no servidor enquanto ocioso para prevenir ser desconectado devido a um timeout. Isso é equivalente à opção [ServerAliveInterval](https://superuser.com/questions/37738/how-to-reliably-keep-an-ssh-tunnel-open#answer-601644) que você pode usar na linha de comando ssh, ou em seu arquivo `~/.ssh/config` -- **Digitar 0 (zero) desabilita esta funcionalidade**

6. **Selecione seu método de Autenticação SSH**:

    * `SSH Agent` se sua máquina local está executando um SSH Agent, você só precisa fornecer o **SSH Username** remoto da sua conta ssh no servidor

    * `Username and Password` para digitar tanto seu **SSH Username** quanto **SSH Password** (veja também a opção _Save Passwords_, abaixo)

    * `Key File` Selecione seu **SSH Private key File** (e opcionalmente digite sua **Key File PassPhrase**) se você usa sua [SSH Public Key](https://stackoverflow.com/questions/7260/how-do-i-setup-public-key-authentication#answers-header) no servidor para autenticação

7. **Digite um nome para sua Conexão** (opcionalmente marque a checkbox **Save Passwords**) e Pressione **Save** para que o Beekeeper lembre de tudo acima para você

8. **Pressione o botão Connect** para acessar seu banco de dados!

## Associações de Arquivo

O Beekeeper Studio fornece associações de arquivo para que você possa fazer as seguintes coisas sem abrir o app:

- Dar duplo clique em um arquivo sqlite `.db` em um navegador de arquivos para abri-lo no Beekeeper Studio!
- Abrir URLs e arquivos do terminal:
  - Mac: `open postgresql://user@host/database` ou `open ./example.db`
  - Linux: `xdg-open postgresql://user@host/database` ou `xdg-open ./example.db`