Puedes configurar el modo de ordenamiento de parametros usando el [archivo de configuracion](../user_guide/configuration.md):

```ini
[app]
; Modo de ordenamiento de parametros para el modal de entrada de parametros de consulta
; Opciones: 'insertion' (predeterminado) o 'alphanumeric'
parameterSortMode = insertion
```

**Opciones disponibles:**

- `insertion` - (Predeterminado) Muestra los parametros en el orden en que aparecen en tu consulta
- `alphanumeric` - Ordena los parametros con manejo inteligente de numeros (`:1`, `:2`, `:10` en lugar de `:1`, `:10`, `:2`)
