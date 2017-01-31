const Client = require('./Client');
const StoreBase = require('./StoreBase');

class RepositoryStore {
	constructor(token) {
		this.headers = {
			affilation: 'owner, organization_member',
			per_page: 100,
		};
		this.storeBase = new StoreBase(token, 'repos.getAll', this.headers);
	}

	async getAll() {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.storeBase.getAll();
				this.repos = result;
				resolve(result);
			} catch (e) {
				reject(e);
			}
		});
	}

	async getRepository(repository) {
		return new Promise(async (resolve, reject) => {
			try {
				const [owner, repo] = repository.split('/');
				const result = await this.storeBase.client.repos.get({
					owner,
					repo
				});
				resolve(result);
			} catch (error) {
				reject(error);
			}
		});
	};
}

module.exports = RepositoryStore;
