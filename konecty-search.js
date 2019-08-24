const axios_instance = require('axios');
const moment = require('moment');

function parseValue(msg, value, type) {
  if (type == "msg") value = value.split('.').reduce((o,k) => {return o[k]}, msg);
  else if (type == "flow") value = flow.get(value);
  else if (type == "global") value = global.get(value);
  else if (type == "num") value = Number(value);
  else if (type == "bool" && value == "true") value = true;
  else if (type == "bool" && value == "false") value = false;
  return value;
}

module.exports = function (RED) {
  function KonectySearchNode(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    let flow = node.context().flow;
    let global = node.context().global;
    node.server = RED.nodes.getNode(config.server);

    node.on('input', function (msg) {
      // FILTER EVALUATION
      let filter = JSON.parse(config.filter);
      for (let i=0, j=filter.conditions.length; i<j; i++) {
        let c = filter.conditions[i];
        c.value1 = parseValue(msg, c.value1, c.value1Type);
        c.value2 = parseValue(msg, c.value2, c.value2Type);
        if (c.operator === "lookup") {
          c.term += "._id";
          c.operator = "equals";
          c.value = c.lookupId;
        } else if (c.operator === "between") {
          c.value = {};
          if (c.value1) {
            if (c.fieldType == "dateTime") c.value["greater_or_equals"] = {"$date": moment(c.value1, "YYYY-MM-DD HH:mm").format() };
            else if (c.fieldType == "date") c.value["greater_or_equals"] = {"$date": moment(c.value1, "YYYY-MM-DD").format() };
            else if (c.fieldType == "money" || c.fieldType == "number") c.value["greater_or_equals"] = Number(c.value1);
          }
          if (c.value2) {
            if (c.fieldType == "dateTime") c.value["less_or_equals"] = {"$date": moment(c.value2, "YYYY-MM-DD HH:mm").format() };
            else if (c.fieldType == "date") c.value["less_or_equals"] = {"$date": moment(c.value2, "YYYY-MM-DD").format() };
            else if (c.fieldType == "money" || c.fieldType == "number") c.value["less_or_equals"] = Number(c.value2);
          }
        } else {
          c.value = c.value1;
        }
      }

      let root_url = node.credentials.url.trim();
      if (root_url.endsWith('/')) {
        root_url = root_url.slice(0, root_url.length-1);
      }
      node.status({fill:"red",shape:"ring",text:"searching..."});
      const axios = axios_instance.create({
        baseURL: root_url,
        headers: {
          'Authorization': node.credentials.token
        }
      });
      axios.get('/rest/data/'+ (config.doc.split(':')[1]) +'/find', {
        params: {
          filter: JSON.stringify(filter),
          limit: 0
        }
      })
      .then(function (response) {
        node.status({});
        msg.success = response.data.success;
        msg.payload = response.data.data;
        node.send(msg);
      })
      .catch(function (error) {
        console.log(error);
      })
      .then(function () {
        // always executed
        // console.log('Done.')
      });
    });

    node.on('close', function (removed, done) {
      if (removed) {
        // This node has been deleted
      } else {
        // This node is being restarted
      }
      done();
    });
  }

  RED.nodes.registerType("konecty-search", KonectySearchNode, {
    credentials: {
      url: {type:"text"},
      namespace: {type:"text"},
      token: {type:"text"}
    }
 });

}
