const axios = require('axios');

module.exports = ({ host, key }) => ({
	async getDocuments() {
		const { data } = await axios.get(`${host}/rest/menu/documents`, {
			headers: {
				Authorization: key
			}
		});
		return data;
	},
	async getDocument(id) {
		const { data } = await axios.get(`${host}/rest/menu/documents/${id}`, {
			headers: {
				Authorization: key
			}
		});
		return data;
	},
	async getMenu(id) {
		const { data } = await axios.get(`${host}/rest/menu/list`, {
			headers: {
				Authorization: key
			}
		});
		return data;
	},
	async getSuggestions(document, field, search) {
		const { data } = await axios.get(`${host}/rest/data/${document}/lookup/${field}`, {
			headers: {
				Authorization: key
			},
			params: {
				page: 1,
				start: 0,
				limit: 10,
				search
			}
		});
		return data;
	},
	async getIdFromCode(document, code) {
		const { data } = await axios.get(`${host}/rest/data/${document}/find`, {
			headers: {
				Authorization: key
			},
			params: {
				limit: 1,
				filter: { match: 'and', conditions: [{ term: 'code', operator: 'equals', value: Number(code) }] },
				fields: '_id, _updatedAt'
			}
		});
		if (data.success === true && data.total === 1) {
			const {
				data: [{ _id, _updatedAt }]
			} = data;
			return { _id, _updatedAt: { $date: _updatedAt } };
		}
		return {};
	},
	async getIdFromId(document, id) {
		const { data } = await axios.get(`${host}/rest/data/${document}/${id}`, {
			headers: {
				Authorization: key
			},
			params: {
				fields: '_id, _updatedAt'
			}
		});
		if (data.success === true && data.total === 1) {
			const {
				data: [{ _id, _updatedAt }]
			} = data;
			return { _id, _updatedAt: { $date: _updatedAt } };
		}
		return {};
	},
	async update(document, ids, data) {
		const { data: result } = await axios.put(
			`${host}/rest/data/${document}`,
			{
				data,
				ids
			},
			{
				headers: {
					Authorization: key
				}
			}
		);

		return result;
	},
	async create(document, body) {
		const { data: result } = await axios.post(`${host}/rest/data/${document}`, body, {
			headers: {
				Authorization: key
			}
		});

		return result;
	},
	async getSuggestionsForDocument(document, field, search) {
		const { data } = await axios.get(`${host}/rest/data/${document}/find`, {
			headers: {
				Authorization: key
			},
			params: {
				limit: 20,
				filter: { match: 'and', conditions: [{ term: field, operator: 'contains', value: search }] },
				fields: `_id, ${field}`,
				sort: [{ property: field, direction: 'ASC' }]
			}
		});
		return data;
	},
	async getNextOnQueue(queueId) {
		const { data } = await axios.get(`${host}/rest/data/Queue/queue/next/${queueId}`, {
			headers: {
				Authorization: key
			}
		});
		return data;
	},
	async createContact(contactData) {
		const { data } = await axios.post(
			`${host}/rest/process/submit`,
			{
				data: [
					{
						name: 'contact',
						data: contactData
					}
				]
			},
			{
				headers: {
					Authorization: key
				}
			}
		);
		return data;
	}
});
