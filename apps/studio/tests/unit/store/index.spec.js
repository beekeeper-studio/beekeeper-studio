// Mock the BeekeeperPlugin
const BeekeeperPlugin = {
  buildConnectionName: jest.fn((config) => {
    return config.name || 'Unknown Connection';
  })
};

// Mock the store
const store = {
  actions: {
    updateWindowTitle(context) {
      const config = context.state.usedConfig
      const maxLength = 30
      const suffix = ' - Beekeeper Studio'
      let title = config 
        ? BeekeeperPlugin.buildConnectionName(config) 
        : 'Beekeeper Studio'
      if (config) {
        title = title.length > maxLength
          ? `${title.substring(0, maxLength)}...${suffix}`
          : `${title}${suffix}`
      }
      if (context.getters.isTrial && context.getters.isUltimate) {
        const days = context.rootGetters['licenses/licenseDaysLeft']
        title += ` - Free Trial (${window.main.pluralize('day', days, true)} left)`
      }
      if (context.getters.isCommunity) {
        title += ' - Free Version'
      }
      context.commit('updateWindowTitle', title)
      window.main.setWindowTitle(title);
    }
  },
  state: {
    usedConfig: null,
    windowTitle: 'Beekeeper Studio'
  }
};

// Mocking global window.main
global.window = {
  main: {
    setWindowTitle: jest.fn(),
    pluralize: jest.fn((word, count, showCount) => {
      return showCount ? `${count} ${word}${count !== 1 ? 's' : ''}` : `${word}${count !== 1 ? 's' : ''}`;
    })
  }
};

describe('Store actions - updateWindowTitle', () => {
  // Store the original window.main to restore after tests
  const originalWindowMain = window.main;
  
  beforeEach(() => {
    jest.clearAllMocks();

    store.state.usedConfig = null;
    store.state.windowTitle = 'Beekeeper Studio';
  });
  
  afterEach(() => {
    window.main = originalWindowMain;
  });
  
  test('should set default title when no config is present', () => {
    // Create a mock context based on the store structure
    const context = {
      state: { ...store.state, usedConfig: null },
      commit: jest.fn(),
      getters: {
        isCommunity: false,
        isTrial: false,
        isUltimate: false
      },
      rootGetters: {}
    };
    
    store.actions.updateWindowTitle(context);
    
    expect(context.commit).toHaveBeenCalledWith('updateWindowTitle', 'Beekeeper Studio');
    expect(window.main.setWindowTitle).toHaveBeenCalledWith('Beekeeper Studio');
  });
  
  test('should include connection name in title when config is present', () => {
    const config = { name: 'Test DB', id: 1 };
    
    const context = {
      state: { ...store.state, usedConfig: config },
      commit: jest.fn(),
      getters: {
        isCommunity: false,
        isTrial: false,
        isUltimate: false
      },
      rootGetters: {}
    };
    
    BeekeeperPlugin.buildConnectionName.mockReturnValue('Test DB');
    
    store.actions.updateWindowTitle(context);
    
    expect(BeekeeperPlugin.buildConnectionName).toHaveBeenCalledWith(config);

    expect(context.commit).toHaveBeenCalledWith('updateWindowTitle', 'Test DB - Beekeeper Studio');
    expect(window.main.setWindowTitle).toHaveBeenCalledWith('Test DB - Beekeeper Studio');
  });
  
  test('should truncate long connection names', () => {
    
    const config = {
      name: 'Very Long Database Connection Name That Should Be Truncated',
      id: 1
    };
    
    const context = {
      state: { ...store.state, usedConfig: config },
      commit: jest.fn(),
      getters: {
        isCommunity: false,
        isTrial: false,
        isUltimate: false
      },
      rootGetters: {}
    };
    
    BeekeeperPlugin.buildConnectionName.mockReturnValue(config.name);
    
    store.actions.updateWindowTitle(context);
    
    expect(context.commit).toHaveBeenCalledWith(
      'updateWindowTitle', 
      'Very Long Database Connection ... - Beekeeper Studio'
    );
    expect(window.main.setWindowTitle).toHaveBeenCalledWith(
      'Very Long Database Connection ... - Beekeeper Studio'
    );
  });
  
  test('should append trial info when isTrial and isUltimate are true', () => {
    const config = { name: 'Test DB', id: 1 };
    
    const context = {
      state: { ...store.state, usedConfig: config },
      commit: jest.fn(),
      getters: {
        isCommunity: false,
        isTrial: true,
        isUltimate: true
      },
      rootGetters: {
        'licenses/licenseDaysLeft': 7
      }
    };
    
    BeekeeperPlugin.buildConnectionName.mockReturnValue('Test DB');
    
    store.actions.updateWindowTitle(context);
    
    expect(context.commit).toHaveBeenCalledWith(
      'updateWindowTitle',
      'Test DB - Beekeeper Studio - Free Trial (7 days left)'
    );
    expect(window.main.pluralize).toHaveBeenCalledWith('day', 7, true);
  });
  
  test('should append community version suffix when isCommunity is true', () => {
    const config = { name: 'Test DB', id: 1 };
    
    const context = {
      state: { ...store.state, usedConfig: config },
      commit: jest.fn(),
      getters: {
        isCommunity: true,
        isTrial: false,
        isUltimate: false
      },
      rootGetters: {}
    };
    
    BeekeeperPlugin.buildConnectionName.mockReturnValue('Test DB');
    
    store.actions.updateWindowTitle(context);
    
    expect(context.commit).toHaveBeenCalledWith(
      'updateWindowTitle',
      'Test DB - Beekeeper Studio - Free Version'
    );
  });
  
  test('should handle both trial and community version info correctly', () => {
    const config = { name: 'Test DB', id: 1 };
    
    const context = {
      state: { ...store.state, usedConfig: config },
      commit: jest.fn(),
      getters: {
        isCommunity: true,
        isTrial: true,
        isUltimate: true
      },
      rootGetters: {
        'licenses/licenseDaysLeft': 3
      }
    };
    
    BeekeeperPlugin.buildConnectionName.mockReturnValue('Test DB');
    
    store.actions.updateWindowTitle(context);
    
    expect(context.commit).toHaveBeenCalledWith(
      'updateWindowTitle',
      'Test DB - Beekeeper Studio - Free Trial (3 days left) - Free Version'
    );
  });
});