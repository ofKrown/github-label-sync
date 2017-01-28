const Client = require('./Client');

class StoreBase {
	constructor(token, baseCommand, headers) {
		this.headers = headers;
		this._client = new Client(token);
		this.baseCommand = this.traverse(this.client, baseCommand);
	}

	get client() {
		return this._client;
	}

	traverse(obj, path) {
		const steps = path.split('.');
		if (obj) {
			let nest = obj;
			for (var i = 0; i < steps.length; i++) {
				if (nest[steps[i]]) {
					nest = nest[steps[i]];
				} else {
					throw new Error(`${steps[i]} not found`);
				}
			}
			return nest;
		} else {
			throw new Error('can\'t traverse undefined');
		}
	}

	async getFirstPage() {
		return this.baseCommand(this.headers);
	}

	async getNextPage(previous) {
		return this.client.getNextPage(previous, this.headers);
	}

	async getAll() {
		return new Promise(async (resolve, reject) => {
			try {
				let result = await this.getFirstPage();
				this.repos = [].concat(result);
				while(this.client.hasNextPage(result)) {
					result = await this.getNextPage(result);
					this.repos = this.repos.concat(result);
				}
				resolve(this.repos);
			} catch (e) {
				reject(e);
			}
		});
	}
}

module.exports = StoreBase;
