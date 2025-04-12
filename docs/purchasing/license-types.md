---
title: Offline Licenses
summary: If you're behind a firewall or are managing a fleet of machines, an offline license might be useful.
---

When you purchase a Beekeeper Studio license by default you'll be given a license name and license key to enter into the app.

This license key and name will be validated against the Beekeeper Studio servers.

This works great for 99% of users, but sometimes online validation of a license key might not work, and the app will tell you that you don't have a valid license (even when you do)

![Trial ended by mistake](../assets/images/trial-ended.png)

To solve this problem, if you purchased a yearly professional license or team license you can download the key for 100% offline validation.

## How to use an offline license

1. Go to [the license management dashboard](https://app.beekeeperstudio.io/purchases)
2. Click on your license
3. Click `Download offline key` - this will give you your offline license key
  ![License](../assets/images/download-key.png)
4. Save the file as `license.json` in the Beekeeper Studio configuration directory:
    - Linux: `~/.config/beekeeper-studio/license.json`
    - Linux (snap): `~/snap/beekeeper-studio/current/.config/beekeeper-studio/license.json`
    - Windows: `~\AppData\Roaming\beekeeper-studio\license.json`
    - MacOS: `~/Library/Application Support/beekeeper-studio/license.json`
5. Restart Beekeeper Studio
6. Check `Help -> Manage License Keys` and you should see it registered
  ![Offline license](../assets/images/offline-license.png)

## How offline licenses work

The offline license file contains a digitally signed license key that Beekeeper Studio can verify locally without contacting any servers. When present, the offline license takes priority over any online licenses. The app verifies the license signature using a public key that's bundled with the application.

## Troubleshooting

If your offline license isn't recognized:

- Make sure the file is named exactly `license.json`
- Verify the file is in the correct directory for your operating system
- Check that the file wasn't corrupted during download
- Try downloading the license file again from the dashboard
