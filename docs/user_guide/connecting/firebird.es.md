---
title: Firebird
summary: "Como conectarse a Firebird 3+ desde Beekeeper Studio con autenticacion Legacy"
icon: material/database
---

Beekeeper Studio aun no soporta el protocolo de red de Firebird 3+, por lo que tu servidor Firebird necesita permitir conexiones legacy.

!!! Warning
    Si la seguridad es una preocupacion, no debes usar el plugin de autenticacion Legacy_Auth. El metodo de conexion legacy envia contrasenas por la red sin cifrar, no soporta cifrado del protocolo de red, y tambien limita (trunca!) la longitud utilizable de la contrasena a 8 bytes.


## Localizar Firebird.conf

`firebird.conf` generalmente se encuentra en el directorio de instalacion de tu servidor Firebird. Puede variar segun la distribucion pero tipicamente se ve asi:

| SO             | Ruta predeterminada                                |
|----------------|----------------------------------------------------|
| Linux o MacOS  | /opt/firebird/firebird.conf                        |
| Windows        | %ProgramFiles%\Firebird\Firebird_5_0\firebird.conf |


## Configurar autenticacion legacy del cliente

Para configurar la autenticacion legacy en Firebird 3, necesitas agregar lo siguiente en `firebird.conf`:

```
AuthServer = Srp, Legacy_Auth
WireCrypt = Enabled # o Disabled
UserManager = Legacy_UserManager
```

Para configurar la autenticacion legacy en Firebird 4+, necesitas agregar lo siguiente en `firebird.conf`:

```
AuthServer = Srp256, Srp, Legacy_Auth
WireCrypt = Enabled # o Disabled
UserManager = Legacy_UserManager
```
