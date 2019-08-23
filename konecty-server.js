const api = require('./api');

module.exports = function(RED) {
	function KonectyServerNode(n) {
		RED.nodes.createNode(this, n);
		this.host = n.host;
		this.key = n.key;
		this.name = n.name;
	}
	RED.nodes.registerType('konecty-server', KonectyServerNode);

	RED.httpAdmin.get('/konecty-server/:id/menu', RED.auth.needsPermission('konecty-server.read'), async function (req, res) {
		const { id } = req.params;
		const node = RED.nodes.getNode(id);

		if (node != null) {
			try {
				const { host, key } = node;
				const apiInstance = api({ host, key });
				const result = await apiInstance.getMenu();
				res.json(result);
			} catch (err) {
				res.sendStatus(500);
				node.error(`Konecty Server Failed: ${err.toString()}`);
			}
		} else {
			res.sendStatus(404);
		}
	});

	RED.httpAdmin.get('/konecty-server/:id/documents', RED.auth.needsPermission('konecty-server.read'), async function(req, res) {
		const { id } = req.params;
		const node = RED.nodes.getNode(id);
		if (node != null) {
			try {
				const { host, key } = node;

				const apiInstance = api({ host, key });

				const documents = await apiInstance.getDocuments();
				res.json(documents);
			} catch (err) {
				res.sendStatus(500);
				node.error(`Konecty Server Failed: ${err.toString()}`);
			}
		} else {
			res.sendStatus(404);
		}
	});
	RED.httpAdmin.get('/konecty-server/:id/documents/:document', RED.auth.needsPermission('konecty-server.read'), async function(
		req,
		res
	) {
		const { id, document } = req.params;
		const node = RED.nodes.getNode(id);
		if (node != null) {
			try {
				const { host, key } = node;

				const apiInstance = api({ host, key });

				const result = await apiInstance.getDocument(document);
				res.json(result);
			} catch (err) {
				res.sendStatus(500);
				node.error(`Konecty Server Failed: ${err.toString()}`);
			}
		} else {
			res.sendStatus(404);
		}
	});
	RED.httpAdmin.get(
		'/konecty-server/:id/lookup/:document/:field/:search',
		RED.auth.needsPermission('konecty-server.read'),
		async function(req, res) {
			const { id, document, field, search } = req.params;
			const node = RED.nodes.getNode(id);
			if (node != null) {
				try {
					const { host, key } = node;

					const apiInstance = api({ host, key });

					const result = await apiInstance.getSuggestions(document, field, search);
					if (result.success) {
						return res.json(result.data);
					}
					return [];
				} catch (err) {
					res.sendStatus(500);
					node.error(`Konecty Server Failed: ${err.toString()}`);
				}
			} else {
				res.sendStatus(404);
			}
		}
	);
};
