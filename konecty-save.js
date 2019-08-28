const api = require('./api');
const STANDARD_TYPES = ['str', 'num', 'json', 're', 'date', 'bin', 'msg', 'flow', 'global', 'bool', 'jsonata', 'env'];
module.exports = function(RED) {
	function KonectySaveNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		node.server = RED.nodes.getNode(config.server);
		node.on('input', function(msg) {
			const { host, key } = node.server;

			const { document } = config;

			const apiInstance = api({ host, key });

			var data = JSON.parse(config.data) || msg.payload;

			node.status({});
			if (!Array.isArray(data) || data.length === 0) {
				node.warn(RED._('konecty-save.errors.invalid-data'));
				node.status({ fill: 'red', shape: 'ring', text: 'konecty-save.errors.invalid-data' });
				return;
			}

			const body = data.reduce((acc, { n, t, vt, v }) => {
				switch (t) {
					case 'email':
						if (STANDARD_TYPES.includes(vt)) {
							return { ...acc, [n]: JSON.parse(RED.util.evaluateNodeProperty(v, vt, this, msg)) };
						} else {
							return {
								...acc,
								[n]: {
									type: vt,
									address: v
								}
							};
						}
					case 'date':
					case 'dateTime':
						return { ...acc, [n]: Date.parse(RED.util.evaluateNodeProperty(v, vt, this, msg)) };
					case 'lookup':
						if (vt === 'form') {
							return { ...acc, [n]: { _id: v.i } };
						} else {
							return { ...acc, [n]: { _id: RED.util.evaluateNodeProperty(v, vt, this, msg) } };
						}
					case 'richText':
						if (STANDARD_TYPES.includes(vt)) {
							return { ...acc, [n]: RED.util.evaluateNodeProperty(v, vt, this, msg) };
						} else {
							return { ...acc, [n]: v };
						}
					case 'money':
						if (STANDARD_TYPES.includes(vt)) {
							return { ...acc, [n]: { value: Number(RED.util.evaluateNodeProperty(v, vt, this, msg)) } };
						} else {
							return {
								...acc,
								[n]: {
									currency: vt,
									value: Number(v)
								}
							};
						}
					case 'boolean':
						return { ...acc, [n]: /^true$/i.test(RED.util.evaluateNodeProperty(v, vt, this, msg)) };
					case 'picklist':
						if (STANDARD_TYPES.includes(vt)) {
							return { ...acc, [n]: RED.util.evaluateNodeProperty(v, vt, this, msg) };
						}
						return { ...acc, [n]: v };
					case 'address':
					case 'personName':
						if (vt === 'form') {
							const result = Object.keys(v).reduce(
								(acc, k) => ({
									...acc,
									[k]: RED.util.evaluateNodeProperty(v[k].v, v[k].vt, this, msg)
								}),
								{}
							);
							return { ...acc, [n]: result };
						}
						return { ...acc, [n]: JSON.parse(RED.util.evaluateNodeProperty(v, vt, this, msg)) };
					default:
						return { ...acc, [n]: RED.util.evaluateNodeProperty(v, vt, this, msg) };
				}
			}, {});

			const handleKonectyResponse = ({ success, data, errors }) => {
				if (success) {
					node.send([
						{
							...msg,
							payload: data
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
					node.error(RED._('konecty-save.errors.error-processing', { message: errMessages }));
					node.status({
						fill: 'red',
						shape: 'ring',
						text: RED._('konecty-save.errors.error-processing', { message: errMessages })
					});
				}
			};

			if (config.action === 'update') {
				var codes = JSON.parse(config.ids) || msg.ids;
				if (!Array.isArray(codes) || codes.length === 0) {
					node.warn(RED._('konecty-save.errors.invalid-ids'));
					node.status({ fill: 'red', shape: 'ring', text: 'konecty-save.errors.invalid-ids' });
					return;
				}

				Promise.all(
					codes.map(({ v, vt }) => {
						if (STANDARD_TYPES.includes(vt)) {
							return Promise.resolve(JSON.parse(RED.util.evaluateNodeProperty(v, vt, this, msg)));
						}
						if (vt === 'id') {
							return apiInstance.getIdFromId(document, v);
						}
						return apiInstance.getIdFromCode(document, v);
					})
				).then(ids => {
					apiInstance.update(document, ids, body).then(handleKonectyResponse);
				});
			} else {
				apiInstance.create(document, body).then(handleKonectyResponse);
			}
		});
	}
	RED.nodes.registerType('konecty-save', KonectySaveNode);
};
