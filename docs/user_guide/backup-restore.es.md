---
title: Respaldo y restauracion
summary: "Respalda toda tu base de datos (o solo una parte) - esquemas, datos o ambos."
old_url: "https://docs.beekeeperstudio.io/docs/backup-restore"
icon: material/backup-restore
---

Beekeeper Studio proporciona una interfaz a herramientas nativas para respaldar y restaurar facilmente tus bases de datos.

## Herramientas soportadas
- Postgres
	- `pg_dump` y `pg_restore`
- MySQL/MariaDb
	- `mysqldump` y `mysql`
- SQLite
	- `sqlite3`

## Respaldar o restaurar una base de datos
Tanto Respaldo como Restauracion se pueden encontrar en la seccion de herramientas del menu de la aplicacion:
![La seccion de herramientas del menu de la aplicacion](../assets/images/backup-restore-89.png)

Despues de seleccionar Respaldo o Restauracion, seras guiado a traves de una serie de pasos para generar el comando para la herramienta de base de datos proporcionada por el proveedor.

La pestana de Respaldo:
1. Elegir entidades
2. Configurar respaldo
3. Revisar y ejecutar

La pestana de Restauracion:
1. Configurar restauracion
2. Revisar y ejecutar

### Elegir entidades
Aqui puedes elegir que quieres respaldar de tu base de datos. Para todos los dialectos soportados, no seleccionar ninguna entidad resultara en un respaldo completo de la base de datos.

![El primer paso del asistente de respaldo: seleccionando objetos a respaldar](../assets/images/backup-restore-91.png)

### Configurar respaldo/restauracion
Aqui es donde configuraras exactamente como se comportara la herramienta nativa de respaldo/restauracion. Tenemos una seleccion de configuraciones comunmente usadas que podemos colocar por ti con el clic de una casilla de verificacion o una seleccion de un menu desplegable.

![El segundo paso del asistente de respaldo: configurando flags de linea de comandos](../assets/images/backup-restore-92.png)

### Argumentos personalizados
Si una opcion que necesitas no es soportada, tambien te proporcionamos la capacidad de agregar flags personalizados al comando.

![La caja para establecer flags de linea de comandos personalizados para respaldo/restauracion](../assets/images/backup-restore-93.png)

### Revisar y ejecutar
Finalmente puedes ver el comando generado que se ejecutara (menos cualquier informacion sensible, que se proporciona en variables de entorno).

![La revision del comando que ha sido generado para respaldo/restauracion.](../assets/images/backup-restore-94.png)

Si prefieres ejecutar este comando en la terminal tu mismo, tambien puedes copiarlo a tu portapapeles aqui! Puede que tengas que establecer algunas variables de entorno para permitir que la herramienta se conecte correctamente a tu base de datos.

De lo contrario, puedes dejarnos ejecutar el comando por ti y verlo suceder dentro de la aplicacion.

## Monitorear el progreso de respaldo/restauracion
Si eliges ejecutar el proceso dentro de la aplicacion, puedes monitorear el progreso del comando mientras se ejecuta desde esta pantalla:
![Pantalla de progreso del comando](../assets/images/backup-restore-154.png)

Te mostramos las ultimas 100 lineas aproximadamente de los logs para que las leas mientras la herramienta hace su trabajo, pero si algo sale muy mal, tambien volcamos todos los logs a un archivo temporal para todas tus necesidades de depuracion.
