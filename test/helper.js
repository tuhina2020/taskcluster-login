const taskcluster = require('taskcluster-client');
const testing = require('taskcluster-lib-testing');
const v1 = require('../src/v1');
const load = require('../src/main');
const config = require('taskcluster-lib-config');
const _ = require('lodash');

var helper = module.exports = {};

// Call this in suites or tests that make API calls, etc; it will set up
// what's required to respond to those calls.
helper.setup = function(options) {
  options = options || {};
  var webServer = null;

  var loadOptions = {
    profile: 'test',
    process: 'test-helper',
  };

  // Setup before tests
  suiteSetup(async () => {
    testing.fakeauth.start({
      'test-client': ['*'],
    });

    webServer = await load('server', _.defaults({
      authenticators: [],
    }, loadOptions));

    // Create client for working with API
    helper.baseUrl = 'http://localhost:' + webServer.address().port + '/v1';
    var reference = v1.reference({baseUrl: helper.baseUrl});
    helper.Login = taskcluster.createClient(reference);
    // Utility to create an Login instance with limited scopes
    helper.scopes = (...scopes) => {
      helper.login = new helper.Login({
        // Ensure that we use global agent, to avoid problems with keepAlive
        // preventing tests from exiting
        agent:            require('http').globalAgent,
        baseUrl:          helper.baseUrl,
        credentials: {
          clientId:       'test-client',
          accessToken:    'none',
        },
        authorizedScopes: scopes.length > 0 ? scopes : undefined,
      });
    };
  });

  // Setup before each test
  setup(async () => {
    // Setup client with all scopes
    helper.scopes();
  });

  // Cleanup after tests
  suiteTeardown(async () => {
    // Kill webServer
    if (webServer) {
      await webServer.terminate();
    }
    testing.fakeauth.stop();
  });
};
