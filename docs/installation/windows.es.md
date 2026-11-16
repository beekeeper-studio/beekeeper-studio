---
title: Windows
summary: "Como instalar Beekeeper Studio en Windows"
old_url: "https://docs.beekeeperstudio.io/docs/windows"
---

## Simplemente descarga y ejecuta


Descarga y ejecuta el instalador de Windows desde [nuestro sitio web](https://beekeeperstudio.io).

Beekeeper Studio esta disponible para ambas arquitecturas de Windows:

- **x64**: PCs con un procesador Intel o AMD.
- **ARM64**: PCs con Windows on ARM, como los que tienen un procesador Snapdragon X.

La pagina de descarga elige la version adecuada para tu PC. Si no sabes cual tienes, abre **Configuracion → Sistema → Acerca de** y revisa **Tipo de sistema**: indica `procesador basado en x64` o `procesador basado en ARM`.


## Version portatil de Beekeeper Studio

Tambien tenemos una version portatil de Beekeeper Studio que no requiere instalacion. Esta tambien esta disponible en nuestro sitio web, para x64 y ARM64.


## Despliegue empresarial (MSI)

Los administradores de TI pueden desplegar Beekeeper Studio con el paquete MSI, usando Intune, Configuration Manager, Directiva de grupo o una instalacion silenciosa con `msiexec`. Consulta [Despliegue empresarial en Windows (MSI)](./windows-enterprise.md).


## Windows on ARM (ARM64) { #windows-on-arm }

La version ARM64 se ejecuta de forma nativa en Windows on ARM, por lo que es mas rapida y consume menos bateria que la version x64 ejecutandose con emulacion. Se actualiza sola, igual que la version x64.

Si ya usas la version x64 en un PC ARM, descarga el instalador ARM64 y ejecutalo. Se instala sobre la version x64 y conserva tus conexiones, consultas guardadas y configuracion. La version x64 no se cambia a ARM64 por si sola al actualizarse, pero muestra un aviso con un enlace de descarga cuando detecta que se ejecuta en un PC ARM.

El instalador ARM64 solo funciona en PCs ARM. En un PC x64 se detiene con un mensaje que te indica el instalador x64.

### Limitaciones de bases de datos en ARM64

Algunos drivers de bases de datos dependen de bibliotecas nativas que sus fabricantes no publican para Windows on ARM. En la version ARM64:

- Las conexiones **LibSQL** no son compatibles. El driver `libsql` no tiene una version para Windows ARM64. Usa la version x64 de Beekeeper Studio si necesitas LibSQL.
- **Oracle** se conecta solo en [modo thin](../user_guide/connecting/oracle-database.md). Oracle no ofrece un Instant Client para Windows on ARM, por lo que las funciones del modo thick, como Native Network Encryption, no estan disponibles.
- El cifrado de campos del lado del cliente (CSFLE) y Queryable Encryption de **MongoDB** no estan disponibles. Necesitan la biblioteca `mongodb-client-encryption`, que MongoDB no publica para Windows ARM64. Consulta [MongoDB](../user_guide/connecting/mongodb.md#windows-on-arm).
- **SQL Anywhere** necesita las bibliotecas cliente de SQL Anywhere de SAP (`dbcapi.dll`), que SAP no publica para Windows on ARM.
- La autenticacion integrada de **SQL Server** (**Kerberos / Windows (via ODBC)**) necesita la version ARM64 de [Microsoft ODBC Driver 18 for SQL Server](https://learn.microsoft.com/en-us/sql/connect/odbc/download-odbc-driver-for-sql-server). ODBC Driver 17 no tiene version ARM64. Las autenticaciones SQL Login, Domain (NTLM) y Azure / Entra ID no necesitan nada adicional.

Todas las demas bases de datos funcionan igual que en x64.
