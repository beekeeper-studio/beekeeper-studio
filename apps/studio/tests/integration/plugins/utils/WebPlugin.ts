import { Manifest } from "@/services/plugin/types";

/**
 * Represents a plugin in tests.
 * Provides methods to send requests and receive responses from the host.
 */
export class WebPlugin {
  private requestIdCounter = 0;

  public readonly iframe: HTMLIFrameElement;
  public readonly manifest: Manifest;
  public readonly context: {
    command: string;
    pluginId?: string;
    pluginTabTypeId?: string;
    params?: any;
  };

  constructor() {
    // Create default manifest
    this.manifest = {
      manifestVersion: 1,
      id: "test-plugin",
      name: "Test Plugin",
      author: "Test Author",
      description: "Test Description",
      version: "1.0.0",
      capabilities: {
        views: [
          {
            id: "test-view",
            name: "Test View",
            type: "base-tab",
            entry: "index.html",
          },
        ],
        menu: [],
      },
    } as Manifest;

    // Create mock iframe with contentWindow
    this.iframe = document.createElement("iframe");

    // Create a mock contentWindow that can receive postMessage
    const mockContentWindow = {
      postMessage: jest.fn(),
    };

    // Override contentWindow
    Object.defineProperty(this.iframe, "contentWindow", {
      writable: true,
      value: mockContentWindow,
    });

    document.body.appendChild(this.iframe);

    this.context = {
      command: "test-command",
      pluginId: this.manifest.id,
    };
  }

  /**
   * Send a request to the host and wait for a response
   */
  async request(name: string, args: any = {}): Promise<any> {
    const id = this.requestIdCounter++;

    // Simulate plugin requesting via postMessage
    const messageEvent = new MessageEvent("message", {
      data: { id, name, args },
      source: this.iframe.contentWindow,
    });

    // Trigger the handleMessage
    window.dispatchEvent(messageEvent);

    // Wait a tick for async processing
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Get the response
    const response = this.getLastResponse();

    // Verify the response matches the request
    if (response.id !== id) {
      throw new Error(
        `Response ID mismatch: expected ${id}, got ${response.id}`
      );
    }

    return response;
  }

  /**
   * Send a notification to the host (no response expected)
   */
  async notify(name: string, args: any = {}): Promise<void> {
    // Simulate plugin sending notification via postMessage (no id)
    const messageEvent = new MessageEvent("message", {
      data: { name, args },
      source: this.iframe.contentWindow,
    });

    // Trigger the handleMessage
    window.dispatchEvent(messageEvent);

    // Wait a tick for async processing
    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  /**
   * Get the last response from the host
   */
  getLastResponse(): any {
    const mock = this.iframe.contentWindow.postMessage as jest.Mock;
    if (!mock.mock.calls.length) {
      throw new Error("No responses received from host");
    }
    return mock.mock.calls[mock.mock.calls.length - 1][0];
  }

  /**
   * Get all responses from the host
   */
  getAllResponses(): any[] {
    const mock = this.iframe.contentWindow.postMessage as jest.Mock;
    return mock.mock.calls.map((call) => call[0]);
  }

  /**
   * Clear all recorded responses
   */
  clearResponses(): void {
    const mock = this.iframe.contentWindow.postMessage as jest.Mock;
    mock.mockClear();
  }

  /**
   * Check if the host has sent any responses
   */
  hasResponses(): boolean {
    const mock = this.iframe.contentWindow.postMessage as jest.Mock;
    return mock.mock.calls.length > 0;
  }

  /**
   * Get the number of responses received
   */
  getResponseCount(): number {
    const mock = this.iframe.contentWindow.postMessage as jest.Mock;
    return mock.mock.calls.length;
  }

  /**
   * Clean up the plugin
   */
  dispose(): void {
    if (this.iframe && this.iframe.parentNode) {
      document.body.removeChild(this.iframe);
    }
  }
}
