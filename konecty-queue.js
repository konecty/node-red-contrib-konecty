const api = require('./api');

module.exports = function(RED) {
	function KonectyQueueNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		node.server = RED.nodes.getNode(config.server);
		node.on('input', function(msg) {
			const { host, key } = node.server;
			const { queueType, queue, queueData } = config;

			let token = key;
			if (config.token && config.tokenType) {
				const userToken = RED.util.evaluateNodeProperty(config.token, config.tokenType, this, msg);
				if (/[^ ]+/.test(userToken)) {
					token = userToken;
				}
			}

			const apiInstance = api({ host, key: token });

			let id;
			if (queueType === 'form') {
				const { i } = JSON.parse(queueData);
				id = i;
			} else {
				id = RED.util.evaluateNodeProperty(queue, queueType, this, msg);
			}

			if (id == null) {
				node.warn(RED._('konecty-queue.errors.invalid-data'));
				node.status({ fill: 'red', shape: 'ring', text: 'konecty-queue.queue.invalid-data' });
				return;
			}
			node.status({ fill: 'blue', shape: 'ring', text: RED._('konecty-queue.label.running') });
			apiInstance
				.getNextOnQueue(id)
				.then(({ success, user: { user } }) => {
					if (success) {
						node.send([
							{
								...msg,
								payload: user
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
						node.error(RED._('konecty-queue.errors.error-processing', { message: errMessages }));
						node.status({
							fill: 'red',
							shape: 'ring',
							text: RED._('konecty-queue.errors.error-processing', { message: errMessages })
						});
					}
				})
				.catch(error => {
					node.error(RED._('konecty-queue.errors.error-processing', error));
					node.status({
						fill: 'red',
						shape: 'ring',
						text: RED._('konecty-queue.errors.error-processing', error)
					});
				});

			node.status({});
		});
	}
	RED.nodes.registerType('konecty-queue', KonectyQueueNode);
};
