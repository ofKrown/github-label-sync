const R = require('ramda');
const RepositoryStore = require('./RepositoryStore');
const LabelStore = require('./LabelStore');
const prompt = require('./prompt');
const argv = require('yargs')
	.alias('o', 'owner')
	.alias('c', 'create')
	.alias('u', 'update')
	.alias('t', 'token')
	.alias('s', 'source')
	.alias('d', 'destination')
	.argv;

const selectRepo = async(input, valid, repos, token, preselected) => {
	return new Promise(async(resolve, reject) => {
		try {
			const result = await readRepoName(input, valid, token, preselected);
			let resultRepo = R.find(repo => repo.full_name === result)(repos);
			if (!resultRepo) {
				const repoStore = new RepositoryStore(token);
				resultRepo = await repoStore.getRepository(result);
			}
			const labelStore = new LabelStore(token, resultRepo);
			const labels = await labelStore.getAll();
			const labelsString = R.map(label => label.name)(labels).join(', ');
			console.log(`Existing labels for ${result}: ${labelsString}\n`);
			resolve({ repo: resultRepo, labels });
		} catch (e) {
			reject(e);
		}
	});
};

const canWriteRepo = repo => {
	return repo.permissions.admin || repo.permissions.push;
};

const readRepoName = async(message, validValues, token, preselected) => {
	return new Promise(async(resolve, reject) => {
		let result = '';
		try {
			let tryPreselected = !!preselected;
			while (!result) {
				if (tryPreselected) {
					result = preselected;
					tryPreselected = false;
				} else {
					result = await prompt.read({
						description: message,
						required: true,
						message: 'You need to enter a repository name',
					});
				}

				if (!R.contains(result, validValues)) {
					try {
						const repoStore = new RepositoryStore(token);
						const repository = await repoStore.getRepository(result);
						result = repository.full_name;
					} catch (e) {
						console.log(`${result} is neither a public repository nor affilated with your token`);
						result = '';
					}
				}
			}
			resolve(result);
		} catch (e) {
			reject(e);
		}
	});
};

const getRepos = async (token, owner, skipListing) => {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('Loading repositories...')
			const repoStore = new RepositoryStore(token);
			const reposResult = await repoStore.getAll();
			console.log();
			if (!owner) {
				owner = await prompt.read('Owner (leave empty for all affilated repositories)');
			}
			const repos = owner ? R.filter(repo => repo.owner.login === owner, reposResult) : reposResult;
			resolve(repos);
		} catch (error) {
			reject(error);
		}
	});
};

const run = async () => {
	try {
		let token = argv.token;
		if (!token) {
			token = await prompt.getToken();
		}
		const skipListing = argv.destination && argv.source;
		let repos = [];
		if (!skipListing) {
			repos = await getRepos(token, argv.owner);
			if (!repos.length) {
				return console.log('\nFound no respotiories for this owner...');
			} else {
				console.log(`\nFound ${repos.length} repositories`);
				console.log('---------------------')
				prompt.showRepos(repos);
			}
			console.log();
		}

		const validSources = R.map(repo => repo.full_name)(repos);
		const source = await selectRepo('Source repository', validSources, repos, token, argv.source);

		const validTargets = R.difference(validSources, [source.repo.full_name]);
		let target = {};
		do{
			target = await selectRepo('Destination repository', validTargets, repos, token, argv.destination);
			if (!canWriteRepo(target.repo)) {
				console.error('\nYou have insufficient permissions to change labels, please select another destination repository.');
			}
		}while(!canWriteRepo(target.repo));

		const labelStore = new LabelStore(token, target.repo);
		const labels = await labelStore.getLabelsToCreateAndUpdate(source, target, argv.create, argv.update);
		console.log();
		await labelStore.createLabels(labels.create);
		await labelStore.updateLabels(labels.update);

		console.log('\nDone...');
	} catch (e) {
		if (e.code === 401) {
			console.error('Github Authorization failed. Provide a valid API token!');
		} else if (e.name === 'prompt-canceled') {
			console.log('\nCanceled...');
		} else {
			console.error(e);
		}
	}
};

run();
