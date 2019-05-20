const axios_instance = require('axios');
const moment = require('moment');

module.exports = function (RED) {
  function KonectySearchNode(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    let flow = node.context().flow;
    let global = node.context().global;

    node.on('input', function (msg) {
      // node.log('>> name......: ' + config.name);
      // node.log('>> namespace.: ' + config.namespace);
      // node.log('>> document..: ' + config.doc);
      // node.log('>> filter....: ' + config.filter);
      // node.log('>> url.......: ' + node.credentials.url);
      // node.log('>> token.....: ' + node.credentials.token);

      // FILTER EVALUATION
      let filter = JSON.parse(config.filter);
      for (let i=0, j=filter.conditions.length; i<j; i++) {
        let ff = filter.conditions[i];
        let type = filter.conditions[i].type;
        if (ff.operator === "lookup") {
          ff.term += "._id";
          ff.operator = "equals";
          ff.value = ff.lookupId;
        } else if (ff.operator === "between") {
          ff.value = {
            "greater_or_equals": {"$date": moment(ff.from + " " + ff.fromTime, "MM/DD/YYYY HH:mm").format() },
            "less_or_equals": {"$date": moment(ff.to + " " + ff.toTime, "MM/DD/YYYY HH:mm").format() }
          };
        } else if (type === "msg") ff.value = msg[ff.value];
        else if (type === "flow") ff.value = flow.get(ff.value);
        else if (type === "global") ff.value = global.get(ff.value);
        else if (type === "num") ff.value = Number(ff.value);
        else if (type === "bool" && ff.value === "true") ff.value = true;
        else if (type === "bool" && ff.value === "false") ff.value = false;
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
          filter: JSON.stringify(filter)
        }
      })
      .then(function (response) {
        node.status({});
        msg.payload = response.data;
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
