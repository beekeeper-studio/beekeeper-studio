import * as msal from '@azure/msal-node'
import axios from 'axios';
// not sure about this
import { shell } from '@electron/remote'
import { wait } from '@shared/lib/wait';

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
      redirectUri: beekeeperCloudToken.fulfillment_url,
      state: beekeeperCloudToken.id,
      prompt: 'consent'
    };
    const authUrl = await pca.getAuthCodeUrl(authCodeUrlParams);

    console.log(authUrl);

    shell.openExternal(authUrl);
    let count = 0;

    async function checkStatus() {
      count += 1
      const result = await axios.get(beekeeperCloudToken.url);
      console.log("result", result)
      console.log('count', count)
      if (result?.data && result.data.cloud_token.status !== 'fulfilled' && count <= 20) {
        await wait(2000);
        await checkStatus();
      } else {
        console.log('FULFILLED or failed')
        return
      }
    }

    await checkStatus();

  }
}
