export enum AzureAuthType {
  Default, // This actually may not work at all, might need to just give up on it
  Password,
  AccessToken,
  MSIVM,
  ServicePrincipalSecret
}

// supported auth types that actually work :roll_eyes: default i'm looking at you
export const AzureAuthTypes = [
  // Can't have 2FA, kinda redundant now
  // { name: 'Password', value: AzureAuthType.Password },
  { name: 'Azure AD SSO', value: AzureAuthType.AccessToken },
  // This may be reactivated when we move to client server architecture
  // { name: 'MSI VM', value: AzureAuthType.MSIVM },
  { name: 'Azure Service Principal Secret', value: AzureAuthType.ServicePrincipalSecret }
];
