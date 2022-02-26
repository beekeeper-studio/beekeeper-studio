// .vuepress/config.js
module.exports = {
  title: 'Beekeeper Studio',
  description: 'Documentation & Support for Beekeeper Studio, the cross-platform SQL editor and database manager.',
  themeConfig: {
    logo: '/bk-logo-yellow-icon.svg',
    nav: [
      { text: 'User Guide', link: '/installation/' },
      { text: 'Troubleshooting', link: '/troubleshooting/' },
      { text: 'Contact', link: '/contact/' },
      { text: 'Homepage', link: 'https://www.beekeeperstudio.io' }
    ],
    sidebar: [
      ['/', 'Overview'],
      '/installation/',
      '/guide/',
      '/team_workspaces/',
      '/troubleshooting/'
    ]
  }
}
