const prompt = require('prompt');
const fs = require('fs');

prompt.start();
prompt.message = '';

const read = async(schema) => {
	let promptSchema = schema;
	if (!(schema instanceof Object)) {
		promptSchema = {
			properties: {
				input: {
					description: schema,
				},
			},
		};
	} else {
		promptSchema = {
			properties: {
				input: schema,
			},
		};
	}
	return new Promise(async(resolve, reject) => {
		prompt.get(promptSchema, (err, result) => {
			if (err) {
				const error = new Error('Canceled');
				error.message = err;
				error.name = 'prompt-canceled';
				return reject(error);
			}
			resolve(result.input);
		});
	});
};

const readTokenFromFile = async () => {
	return new Promise((resolve) => {
		try {
			let token = fs.readFileSync('token').toString().trim();
			token = token.replace(/[\t\r\n]/g, '');
			resolve(token);
		} catch (e) {
			resolve();
		}
	});
};

const getToken = async () => {
	return new Promise(async(resolve, reject) => {
		try {
			let token = process.env.GITHUB_API_TOKEN;
			if (!token) {
				token = await readTokenFromFile();
			}
			if (!token) {
				console.log('Info: You can provide the token as environment variable (GITHUB_API_TOKEN), or as a CLI argument e.g: npm start -- --token 123456abc');
				token = await read('GitHub API Token');
				if (!token) {
					return reject('You have to provide a GitHub API token!');
				}
			}
			resolve(token);
		} catch (e) {
			reject(e);
		}
	});
};

const askYesNo = async (question) => {
	return new Promise(async (resolve, reject) => {
		try {
			prompt.delimiter = '?';
			const answer = await read({
				description: `${question} (y/n)`,
				message: 'Enter y or n',
				required: true,
				pattern: /[yYnN]/,
				before: val => {
					return val.toLowerCase();
				},
			});
			prompt.delimiter = ':';
			resolve(answer === 'y');
		} catch (error) {
			reject(error);
		}
	});
};

const showRepos = repos => {
	repos.forEach(repo => console.log(repo.full_name));
}

module.exports = {
	read,
	showRepos,
	askYesNo,
	getToken,
};
