import * as msal from '@azure/msal-node'
import axios from 'axios';

export interface CloudToken {
  id: string,
  created_at: string,
  updated_at: string,
  params: string,
  status: string,
  url: string,
  fulfillment_url: string
}

// TODO (@day): refactor this shit lol
export class AzureAuthService {

  constructor() {
    // don't worry about this
  }

  async auth() {
    const res = await axios.post('https://app.beekeeperstudio.io/api/cloud_tokens');
    // DANGER
    const beekeeperCloudToken = res.data?.cloud_token as CloudToken;
    console.log(beekeeperCloudToken)
    const clientConfig = {
     auth: {
       clientId: 'da931511-74dc-4f3d-ae50-5436c6407572'
     }
    };
    console.log(clientConfig)
    const pca = new msal.PublicClientApplication(clientConfig);

    const authCodeUrlParams = {
      scopes: ['https://database.windows.net/.default', 'offline_access'],
      redirectUri: beekeeperCloudToken.url
    };
    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParams);

    console.log(authUrl);

    
  }
}
