import { UserSetting, UserSettingValueType } from "@/common/appdb/models/user_setting";
import { AiServerOptions, DEFAULT_OPTIONS } from "@/common/interfaces/IAiServer";

const KEY = "aiServerOptions";

function normalize(raw: unknown): AiServerOptions {
  const r = (raw ?? {}) as Partial<AiServerOptions>;
  const bindLocal = !!r.bindLocal;
  // LAN binding without auth would be wildly unsafe — force token on.
  const requireToken = bindLocal ? true : r.requireToken !== false;
  return { requireToken, bindLocal };
}

export async function loadOptions(): Promise<AiServerOptions> {
  const setting = await UserSetting.get(KEY);
  if (!setting || setting.value == null) return { ...DEFAULT_OPTIONS };
  return normalize(setting.value);
}

export async function saveOptions(options: AiServerOptions): Promise<AiServerOptions> {
  const cleaned = normalize(options);
  let setting = await UserSetting.get(KEY);
  if (!setting) {
    setting = new UserSetting();
    setting.key = KEY;
    setting.valueType = UserSettingValueType.object;
    setting.defaultValue = JSON.stringify(DEFAULT_OPTIONS);
  } else if (setting.valueType !== UserSettingValueType.object) {
    setting.valueType = UserSettingValueType.object;
  }
  setting.value = cleaned as unknown as Record<string, unknown>;
  await setting.save();
  return cleaned;
}
