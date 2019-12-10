const axios_instance = require("axios");
const moment = require("moment");

module.exports = function(RED) {
  function KonectySearchNode(config) {
    RED.nodes.createNode(this, config);
    let node = this;
    let flow = node.context().flow;
    let global = node.context().global;
    node.server = RED.nodes.getNode(config.server);

    node.on("input", function(msg) {
      // FILTER EVALUATION
      let filter = JSON.parse(config.filter);
      for (let i = 0, j = filter.conditions.length; i < j; i++) {
        let c = filter.conditions[i];

        if (c.value1 && c.value1.length) {
          c.value1 = RED.util.evaluateNodeProperty(
            c.value1,
            c.value1Type,
            this,
            msg
          );
        }
        if (!!c.value2) {
          c.value2 = RED.util.evaluateNodeProperty(
            c.value2,
            c.value2Type,
            this,
            msg
          );
        }

        if (c.operator === "lookup") {
          c.term += "._id";
          c.operator = "equals";
          c.value = c.lookupId;
        } else if (c.operator === "between") {
          c.value = {};
          if (c.value1) {
            if (c.fieldType == "dateTime")
              c.value["greater_or_equals"] = {
                $date: moment(c.value1, "YYYY-MM-DD HH:mm").format()
              };
            else if (c.fieldType == "date")
              c.value["greater_or_equals"] = {
                $date: moment(c.value1, "YYYY-MM-DD").format()
              };
            else if (c.fieldType == "money" || c.fieldType == "number")
              c.value["greater_or_equals"] = Number(c.value1);
            else c.value["greater_or_equals"] = c.value1;
          }
          if (c.value2) {
            if (c.fieldType == "dateTime")
              c.value["less_or_equals"] = {
                $date: moment(c.value2, "YYYY-MM-DD HH:mm").format()
              };
            else if (c.fieldType == "date")
              c.value["less_or_equals"] = {
                $date: moment(c.value2, "YYYY-MM-DD").format()
              };
            else if (c.fieldType == "money" || c.fieldType == "number")
              c.value["less_or_equals"] = Number(c.value2);
            else c.value["less_or_equals"] = c.value2;
          }
        } else {
          c.value = c.value1;
        }
      }

      // Ensure that the condition will have value property
      filter.conditions = filter.conditions.filter(
        item => ![null, undefined, NaN].includes(item.value)
      );

      let root_url = node.server.host;
      if (root_url.endsWith("/")) {
        root_url = root_url.slice(0, root_url.length - 1);
      }

      let token = node.server.key;
      if (config.token && config.tokenType) {
        const userToken = RED.util.evaluateNodeProperty(
          config.token,
          config.tokenType,
          this,
          msg
        );
        if (/[^ ]+/.test(userToken)) {
          token = userToken;
        }
      }

      let start = 0;
      if (config.start && config.startType) {
        start = RED.util.evaluateNodeProperty(
          config.start,
          config.startType,
          this,
          msg
        );
      }

      node.status({ fill: "blue", shape: "ring", text: "searching..." });
      const axios = axios_instance.create({
        baseURL: root_url,
        headers: {
          Authorization: token
        }
      });

      const fields = JSON.parse(config.projections);
      const sort = JSON.parse(config.sort || "[]");

      const params = {
        filter: JSON.stringify(filter),
        limit: (config.limit && Number(config.limit)) || 0,
        start: Number(start),
        sort:
          sort.length === 0
            ? `[{"property":"_id","direction":"ASC"}]`
            : JSON.stringify(sort),
        fields:
          Array.isArray(fields) && fields.length > 0 ? fields.join() : undefined
      };

      if (config.debugMode) {
        node.warn(params);
      }

      axios
        .get(`/rest/data/${config.doc.split(":")[1]}/find`, { params })
        .then(function(response) {
          node.status({});
          msg.success = response.data.success;
          msg.payload = response.data.data;
          msg.total = response.data.total;
          node.send(msg);
        })
        .catch(function(error) {
          node.status({ fill: "red", shape: "ring", text: "Error searching" });
          node.error(error);
        });
    });

    node.on("close", function(removed, done) {
      if (removed) {
        // This node has been deleted
      } else {
        // This node is being restarted
      }
      done();
    });
  }

  RED.nodes.registerType("konecty-search", KonectySearchNode);
};
