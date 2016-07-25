"use strict";
const path = require("path");

// we will use TransactionWrapper to encapsulate transactions
function TransactionWrapper (trx) {
	this._trx = trx; // the originial transaction is available
	this._methodCache = {}; // we will cache each method the first time it is
	                        // called and created, and subsequently reuse it
}

module.exports = function (knexClient, options, resources) {
	if (!resources && Array.isArray(options)) {
		resources = options;
		options = {};
	}
	const cwd = options.cwd || __dirname;

	// build DB resource from knex application across all resource subdirectories
	const Resources = resources.reduce(function (map, resource) {
		const filepath = path.resolve(cwd, resource);

		const createDbAccessors = require(filepath); // db => map of methods
		const dbAccessors = createDbAccessors(knexClient);  // map of methods

		// for each db accessor, add the accessor's name as a method on
		// TransactionWrapper's prototype, allowing the accessor to be
		// dynamically resolved from a recreated dbAccessors mapping.
		for (let accessorName in dbAccessors) {
			const descriptor = {
				get: function() {
					// memoize applied dbAccessor per-transaction
					if (this._methodCache[accessorName] === undefined) {
						this._methodCache = Object.assign(this._methodCache, createDbAccessors(this._trx));
					}
					return this._methodCache[accessorName];
				}
			};

			if (Object.hasOwnProperty.call(TransactionWrapper.prototype, accessorName)) {
				console.info(`TransactionWrapper already has method ${accessorName}`); // eslint-disable-line no-console
			}
			else {
				Object.defineProperty(TransactionWrapper.prototype, accessorName, descriptor);
			}
		}

		// apply the map of db accessors and keep rolling
		return Object.assign(map, dbAccessors);
	}, { knexClient }); // expose the passed in knex client as `knexClient`

	Resources.transaction = transactBody => {
		return knexClient.transaction(trx => {
			return transactBody(new TransactionWrapper(trx));
		});
	};

	return Resources;
};
