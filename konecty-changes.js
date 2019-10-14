const WebSocket = require('ws');
const EJSON = require('ejson');
const url = require('url');

module.exports = function(RED) {
	function KonectyChangesNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		node.server = RED.nodes.getNode(config.server);
		if (node.server == null) {
			node.status({ fill: 'red', shape: 'ring', text: 'konecty-changes.errors.invalid-data' });
			return;
		}

		const { host: configHost, key } = node.server;

		try {
			const { protocol, host } = url.parse(configHost);

			const useSsl = /^https/i.test(protocol);

			const endpoint = `${useSsl ? 'wss://' : 'ws://'}${host}/websocket`;

			const startListening = () => {
				try {
					let ws = new WebSocket(endpoint);

					const wsSend = message => {
						ws.send(EJSON.stringify(message));
					};

					const doLogin = () => {
						const loginMessage = {
							msg: 'method',
							method: 'auth:loginWithToken',
							params: [{ resume: key }],
							id: '1'
						};
						wsSend(loginMessage);
					};

					const subscribeChanges = () => {
						wsSend({
							msg: 'sub',
							id: '2',
							name: 'changeStream',
							params: [config.document]
						});
					};

					const heartbeat = () => {
						clearTimeout(ws.pingTimeout);
						ws.pingTimeout = setTimeout(() => {
							node.warn(RED._('konecty-changes.errors.connection-broken'));
							ws.terminate();
						}, 30000 + 1000);
					};

					ws.on('open', () => {
						heartbeat();
						wsSend({
							msg: 'connect',
							version: '1',
							support: ['1']
						});
					});

					ws.on('close', () => {
						// try to reconect in 10 seconds
						node.warn(RED._('konecty-changes.errors.connection-broken'));
						ws.terminate();
						setTimeout(startListening, 10000);
					});
					ws.on('message', data => {
						const { id, msg, error, collection, fields } = EJSON.parse(data);

						switch (msg) {
							case 'connected':
								doLogin();
								break;
							case 'ping':
								wsSend({ msg: 'pong' });
								heartbeat();
								break;
							case 'result':
								if (id === '1') {
									// Login
									if (error != null) {
										node.error(RED._('konecty-changes.errors.error-processing', error));
										node.status({
											fill: 'red',
											shape: 'ring',
											text: RED._('konecty-changes.errors.error-processing', error)
										});
									} else {
										subscribeChanges();
									}
								}
								break;
							case 'added':
								if (fields != null && collection === config.document) {
									const { type, document } = fields;
									node.send({
										type,
										payload: document
									});
								}
								break;
							default:
								break;
						}
					});
				} catch (error) {
					node.error(RED._('konecty-changes.errors.error-processing', error));
					node.status({
						fill: 'red',
						shape: 'ring',
						text: RED._('konecty-changes.errors.error-processing', error)
					});
				}
			};
			startListening();
		} catch (error) {
			node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-changes.errors.error-processing', error) });
			node.error(error);
		}
	}
	RED.nodes.registerType('konecty-changes', KonectyChangesNode);
};
