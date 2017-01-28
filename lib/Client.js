const GitHubAPI = require('github');

function Client(token) {
	const github = new GitHubAPI(Object.assign({}, {
		version: '3.0.0',
		headers: {
			'user-agent': 'bmatz/github-sync',
		},
		timeout: 5000,
		protocol: 'https',
	}));

	github.authenticate({
		type: 'oauth',
		token,
	});

	return github;
}

module.exports = Client;
