---
title: Deprecated Configurations
summary: List of configuration deprecations and how to update

---

From time to time, we may update configuration keys, and thus need to deprecate old keys that are no longer needed. Here you can find configuration options that have been deprecated and how to properly update your own configuration.

## v5.7.0
We have changed how query actions are defined in the app to allow for the ability to change the default run method in the editor. As such, four keys have been renamed.
    - submitTabQuery -> primaryQueryAction
    - submitCurrentQuery -> secondaryQueryAction
    - submitQueryToFile -> primaryQueryToFileAction
    - submitCurrentQueryToFile -> secondaryQueryToFileAction

The default behaviour for this has not changed as of yet, but you can now change the primary and secondary actions using the `primaryQueryAction` and `secondaryQueryAction` options under the `settings.queryEditor` section found in the [config file](../user_guide/configuration.md).
