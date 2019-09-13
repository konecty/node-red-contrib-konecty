const api = require('./api');

module.exports = function(RED) {
	function KonectyOpportunityNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		node.server = RED.nodes.getNode(config.server);
		node.on('input', function(msg) {
			const { host, key } = node.server;
			const { extraFields, extraFieldsType } = config;

			// Prepare payload

			let opportunityData = {};

			const product = RED.util.evaluateNodeProperty(config.product, config.productType, this, msg);

			if (/^[0-9]+$/.test(product)) {
				opportunityData.product = { code: product };
			} else if (/$[^\b]+$/.test(product)) {
				opportunityData.product = { _id: product };
			}

			const setFormData = field => {
				if (config[`${field}Type`] === 'form') {
					try {
						const { i = '' } = JSON.parse(config[`${field}Data`]);
						if (/[^\b]+/.test(i)) {
							opportunityData[field] = { _id: i };
						}
					} catch (_) {}
				} else {
					const i = RED.util.evaluateNodeProperty(config[field], config[`${field}Type`], this, msg) || '';
					if (/[^\b]+/.test(i)) {
						opportunityData[field] = { _id: i };
					}
				}
			};

			['contact', 'user', 'campaign'].forEach(setFormData);

			const extraFieldsData = RED.util.evaluateNodeProperty(extraFields, extraFieldsType, this, msg) || {};

			if (Object.keys(extraFieldsData).length > 0) {
				opportunityData = {
					...opportunityData,
					...extraFieldsData
				};
			}

			let token = key;
			if (config.token && config.tokenType) {
				const userToken = RED.util.evaluateNodeProperty(config.token, config.tokenType, this, msg);
				if (/[^ ]+/.test(userToken)) {
					token = userToken;
				}
			}

			const apiInstance = api({ host, key: token });

			if (Object.keys(opportunityData).length === 0) {
				node.warn(RED._('konecty-opportunity.errors.invalid-data'));
				node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-opportunity.errors.invalid-data') });
				return;
			}
			node.status({ fill: 'blue', shape: 'ring', text: RED._('konecty-opportunity.label.running') });
			apiInstance
				.createOpportunity(opportunityData)
				.then(({ success, processData: { opportunity } = {}, errors }) => {
					if (success) {
						node.send([
							{
								...msg,
								payload: opportunity
							}
						]);
						node.status({});
					} else {
						node.send([
							null,
							{
								...msg,
								payload: errors
							}
						]);
						const errMessages = errors.map(({ message }) => message).join('\n');
						node.error(RED._('konecty-opportunity.errors.error-processing', { message: errMessages }));
						node.status({
							fill: 'red',
							shape: 'ring',
							text: RED._('konecty-opportunity.errors.error-processing', { message: errMessages })
						});
					}
				})
				.catch(error => {
					node.error(RED._('konecty-opportunity.errors.error-processing', error));
					node.status({
						fill: 'red',
						shape: 'ring',
						text: RED._('konecty-opportunity.errors.error-processing', error)
					});
				});

			node.status({});
		});
	}
	RED.nodes.registerType('konecty-opportunity', KonectyOpportunityNode);
};
