import i18n from "@/i18n";

export interface IWorkspace {
  id: number
  type: 'local' | 'cloud'
  name: string,
  logo?: string
  icon?: string
  trialEndsAt?: number
  trialEndsIn?: string
  active: boolean
  isOwner?: boolean
  level: string
}

export const LocalWorkspace: IWorkspace = {
  // can never exist in a real database
  id: -1,
  level: i18n.t('local').toString(),
  type: 'local',
  name: i18n.t('Local Workspace').toString(),
  icon: 'laptop',
  active: true

}