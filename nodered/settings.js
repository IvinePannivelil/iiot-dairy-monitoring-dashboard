module.exports = {
  // Node-RED runtime port
  uiPort: 1880,

  // Allow the Node-RED editor to be accessed remotely
  // Set to false in production and use authentication
  httpAdminRoot: '/',

  // WebSocket endpoint for PLC data → Frontend bridge
  // This is consumed by src/services/noderedBridge.js
  httpNodeRoot: '/',

  // Credentials encryption key — set this to a random string in production
  credentialSecret: 'dairy-nodered-secret',

  // Disable editor in production (set to true when deploying to RADxAE52C)
  disableEditor: false,

  // Admin auth — uncomment and set in production
  // adminAuth: {
  //   type: 'credentials',
  //   users: [{
  //     username: 'admin',
  //     password: '$2b$08$...bcrypt-hashed-password...',
  //     permissions: '*'
  //   }]
  // },

  // Logging
  logging: {
    console: {
      level: 'info',
      metrics: false,
      audit: false
    }
  },

  // Editor theme
  editorTheme: {
    page: {
      title: 'Dairy Edge — Node-RED PLC Bridge'
    }
  }
};
