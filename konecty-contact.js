const api = require('./api');

module.exports = function(RED) {
	function KonectyContactNode(config) {
		RED.nodes.createNode(this, config);
		const node = this;
		node.server = RED.nodes.getNode(config.server);
		node.on('input', function(msg) {
			const { host, key } = node.server;
			const { fullname, fullnameType, email, emailType, phoneNumber, phoneNumberType, extraFields, extraFieldsType } = config;

			// Prepare payload

			const contactData = {
				name: RED.util.evaluateNodeProperty(fullname, fullnameType, this, msg),
				email: RED.util.evaluateNodeProperty(email, emailType, this, msg),
				phone: RED.util.evaluateNodeProperty(phoneNumber, phoneNumberType, this, msg)
			};

			if (/[^\b]+/.test(contactData.phone)) {
				if (!/^([0-9]){10,11}$/.test(contactData.phone)) {
					node.warn(RED._('konecty-contact.errors.invalid-phone'));
					node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-contact.errors.invalid-phone') });
					return;
				}
			} else {
				delete contactData.phone;
			}
			if (/[^\b]+/.test(contactData.email)) {
				if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(contactData.email)) {
					node.warn(RED._('konecty-contact.errors.invalid-email'));
					node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-contact.errors.invalid-email') });
					return;
				}
			} else {
				delete contactData.email;
			}

			if (contactData.phone == null && contactData.email == null) {
				node.warn(RED._('konecty-contact.errors.phone-or-email-is-required'));
				node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-contact.errors.phone-or-email-is-required') });
				return;
			}

			const setFormData = field => {
				if (config[`${field}Type`] === 'form') {
					try {
						const { i = '' } = JSON.parse(config[`${field}Data`]);
						if (/[^\b]+/.test(i)) {
							contactData[field] = { _id: i };
						}
					} catch (_) {}
				} else {
					const i = RED.util.evaluateNodeProperty(config[field], config[`${field}Type`], this, msg) || '';
					if (/[^\b]+/.test(i)) {
						contactData[field] = { _id: i };
					}
				}
			};

			['user', 'campaign', 'queue'].forEach(setFormData);

			const extraFieldsData = RED.util.evaluateNodeProperty(extraFields, extraFieldsType, this, msg) || {};

			if (Object.keys(extraFieldsData).length > 0) {
				contactData.extraFields = extraFieldsData;
			}

			let token = key;
			if (config.token && config.tokenType) {
				const userToken = RED.util.evaluateNodeProperty(config.token, config.tokenType, this, msg);
				if (/[^ ]+/.test(userToken)) {
					token = userToken;
				}
			}

			const apiInstance = api({ host, key: token });

			if (Object.keys(contactData).length === 0) {
				node.warn(RED._('konecty-contact.errors.invalid-data'));
				node.status({ fill: 'red', shape: 'ring', text: RED._('konecty-contact.errors.invalid-data') });
				return;
			}
			node.status({ fill: 'blue', shape: 'ring', text: RED._('konecty-contact.label.running') });
			apiInstance
				.createContact(contactData)
				.then(({ success, processData: { contact } = {}, errors }) => {
					if (success) {
						node.send([
							{
								...msg,
								payload: contact
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
						node.error(RED._('konecty-contact.errors.error-processing', { message: errMessages }));
						node.status({
							fill: 'red',
							shape: 'ring',
							text: RED._('konecty-contact.errors.error-processing', { message: errMessages })
						});
					}
				})
				.catch(error => {
					node.error(RED._('konecty-contact.errors.error-processing', error));
					node.status({
						fill: 'red',
						shape: 'ring',
						text: RED._('konecty-contact.errors.error-processing', error)
					});
				});

			node.status({});
		});
	}
	RED.nodes.registerType('konecty-contact', KonectyContactNode);
};
