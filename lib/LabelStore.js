const Client = require('./Client');
const StoreBase = require('./StoreBase');
const prompt = require('./prompt');
const R = require('ramda');

class LabelStore {
	constructor(token, repository) {
		this.headers = {
			owner: repository.owner.login,
			repo: repository.name,
			per_page: 100,
		};
		this.repository = repository;
		this.storeBase = new StoreBase(token, 'issues.getLabels', this.headers);
	}

	async createLabel(label, update) {
		return new Promise(async (resolve, reject) => {
			try {
				const options = {
					owner: this.repository.owner.login,
					repo: this.repository.name,
					name: label.name,
					color: label.color,
				};
				if (update) {
					options.oldname = label.name;
					await this.storeBase.client.issues.updateLabel(options);
				} else {
					await this.storeBase.client.issues.createLabel(options);
				}
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	async updateLabel(label) {
		return this.createLabel(label, true);
	}

	async createLabels(labels, update) {
		return new Promise(async (resolve, reject) => {
			try {
				if (labels.length) {
					for (var i = 0; i < labels.length; i++) {
						if (update) {
							console.log(`Updating label '${labels[i].name}'`);
							await this.updateLabel(labels[i]);
						} else {
							console.log(`Creating label '${labels[i].name}'`);
							await this.createLabel(labels[i]);
						}
					}
				} else {
					console.log(`Nothing to ${update ? 'update' : 'create'}...`);
				}
				resolve();
			} catch (error) {
				reject(error);
			}
		});
	}

	async updateLabels(labels) {
		return this.createLabels(labels, true);
	}

	async getAll() {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.storeBase.getAll();
				this.labels = result;
				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	}

	async getLabelsToCreateAndUpdate (source, target, autoCreate, autoUpdate) {
		return new Promise(async (resolve, reject) => {
			try {
				console.log(`${source.repo.full_name} --> ${target.repo.full_name}\n`);
				const sourceLabelNames = R.map(label => label.name, source.labels);
				const targetLabelNames = R.map(label => label.name, target.labels);
				const compare = (a, b) => {
					return a.name === b.name && a.color === b.color;
				};

				const labelsToCreate = R.difference(sourceLabelNames, targetLabelNames);
				const labelsToUpdate = R.difference(R.map(label => label.name, R.differenceWith(compare, source.labels, target.labels)), labelsToCreate);

				let createLabelDefinitions = [];
				let updateLabelDefinitions = [];
				if (labelsToCreate.length) {
					console.log(`These labels will be created in repository ${target.repo.full_name}: ${labelsToCreate.join(', ')}\n`);
					if (autoCreate || await prompt.askYesNo('You want to create these labels')) {
						createLabelDefinitions = R.filter(label =>  R.contains(label.name, labelsToCreate), source.labels);
					}
				}
				if (labelsToUpdate.length) {
					console.log(`\nThese labels aready exist but with different colors: ${labelsToUpdate.join(', ')}\n`);
					if(autoUpdate || await prompt.askYesNo('Do you want to update the colors of these labels')) {
						updateLabelDefinitions = R.filter(label =>  R.contains(label.name, labelsToUpdate), source.labels);
					}
				}
				resolve({ create: createLabelDefinitions, update: updateLabelDefinitions });
			} catch (error) {
				reject(error);
			}
		});
	};
}

module.exports = LabelStore;
