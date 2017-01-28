const R = require('ramda');
const RepositoryStore = require('./RepositoryStore');
const LabelStore = require('./LabelStore');
const prompt = require('./prompt');

const selectRepo = async(input, valid, repos, token) => {
	return new Promise(async(resolve, reject) => {
		try {
			const validSources = R.map(repo => repo.full_name)(repos);
			const result = await readRepoName(input, validSources);
			const resultRepo = R.find(repo => repo.full_name === result)(repos);

			const labelStore = new LabelStore(token, resultRepo);
			const labels = await labelStore.getAll();
			const labelsString = R.map(label => label.name)(labels).join(', ');
			console.log(`Labels: ${labelsString}\n`);
			resolve({ repo: resultRepo, labels });
		} catch (e) {
			reject(e);
		}
	});
};

const canWriteRepo = repo => {
	return repo.permissions.admin || repo.permissions.push;
};

const readRepoName = async(message, validValues) => {
	return new Promise(async(resolve, reject) => {
		let result = '';
		try {
			while (!result) {
				result = await prompt.read({
					description: message,
					required: true,
					message: 'You need to enter a repository name',
				});

				if (!R.contains(result, validValues)) {
					console.log(`${result} is an invalid repository`);
					result = '';
				}
			}
			resolve(result);
		} catch (e) {
			reject(e);
		}
	});
};

const getRepos = async (token) => {
	return new Promise(async (resolve, reject) => {
		try {
			console.log('Loading repositories...')
			const repoStore = new RepositoryStore(token);
			const reposResult = await repoStore.getAll();
			console.log();
			const owner = await prompt.read('Owner (leave empty for all affilated repositories)');
			const repos = owner ? R.filter(repo => repo.owner.login === owner, reposResult) : reposResult;
			resolve(repos);
		} catch (error) {
			reject(error);
		}
	});
};

const run = async () => {
	try {
		const token = await prompt.getToken();
		const repos = await getRepos(token);
		if (!repos.length) {
			return console.log('\nFound no respotiories for this owner...');
		}
		console.log(`\nFound ${repos.length} repositories`);
		console.log('---------------------')
		prompt.showRepos(repos);
		console.log();

		const validSources = R.map(repo => repo.full_name)(repos);
		const source = await selectRepo('Source repository', validSources, repos, token);

		const validTargets = R.difference(validSources, [source.repo.full_name]);
		let target = {};
		do{
			target = await selectRepo('Target repository', validTargets, repos, token);
			if (!canWriteRepo(target.repo)) {
				console.error('\nYou have insufficient permissions to change labels, please select another target repository.');
			}
		}while(!canWriteRepo(target.repo));

		const labelStore = new LabelStore(token, target.repo);
		const labels = await labelStore.getLabelsToCreateAndUpdate(source, target);
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
