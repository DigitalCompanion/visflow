
"use strict";

var extObject = {

  nodeShapeName: "none",

  contextmenuDisabled: {},

  initialize: function(para) {
    if (para == null)
      return console.error("null para passed to DataflowNode.initialize");
    this.hashtag = "h-" + Utils.randomString(8); // for serialization

    this.nodeId = para.nodeId;
    this.type = para.type;

    this.portHeight = 20;
    this.portGap = 4;

    // no ports by default
    this.inPorts = [];
    this.outPorts = [];
    this.ports = {};

    // default not showing icon
    this.detailsOn = true;

    // default not showing label
    this.labelOn = false;
    this.label = "node label";

    this.visModeOn = false;

    this.optionsOffset = null;

    this.css = {};
    this.visCss = {};
  },

  serialize: function() {
    this.label = this.jqview.find(".dataflow-node-label").text();


    this.saveCss();

    var result = {
      nodeId: this.nodeId,
      hashtag: this.hashtag,
      type: this.type,
      detailsOn: this.detailsOn,
      optionsOn: this.optionsOn,
      optionsOffset: this.optionsOffset,
      labelOn: this.labelOn,
      label: this.label,
      css: this.css,
      visModeOn: this.visModeOn,
      visCss: this.visCss
    };

    return result;
  },

  deserialize: function(save) {
    this.detailsOn = save.detailsOn;
    if (this.detailsOn == null) {
      this.detailsOn = true;
      console.error("detailsOn not saved");
    }
    this.optionsOffset = save.optionsOffset;
    this.optionsOn = save.optionsOn;
    this.labelOn = save.labelOn;
    this.label = save.label;

    this.css = save.css;

    this.visModeOn = save.visModeOn;
    this.visCss = save.visCss;
    if (this.visModeOn == null){
      console.error("visModeOn not saved");
      this.visModeOn = false;
      this.visCss = {};
    }

    if (this.labelOn == null) {
      console.error("labelOn not saved");
      this.labelOn = false;
    }
    if (this.label == null) {
      console.error("label not saved");
      this.label = "node label";
    }
  },

  // prepares all necessary data structures for references
  // called after initialize
  prepare: function() {
    this.preparePorts();
  },

  preparePorts: function() {
    var allports = this.inPorts.concat(this.outPorts);
    for (var i in allports) {
      this.ports[allports[i].id] = allports[i];
      allports[i].pack.changed = false; // initialize change to false after creation
    }
  },

  setJqview: function(jqview) {
    this.jqview = jqview;
    jqview.addClass(this.hashtag);
  },

  show: function() {
    // this removes everything created (including those from inheriting classes)
    // inheriting classes shall not remove again

    this.jqview.children()
      .not(".ui-resizable-handle")
      .remove();

    if (!this.visModeOn && core.dataflowManager.visModeOn) {
      // do not show if hidden in vis mode
      return;
    }
    this.jqview.show();
    this.showLabel();

    if (this.detailsOn) {
      this.jqview
        .addClass("dataflow-node dataflow-node-shape ui-widget-content ui-widget");

      if (this.nodeShapeName != "none") {
        this.jqview
          .removeClass("dataflow-node-shape")
          .addClass("dataflow-node-shape-" + this.nodeShapeName);
      }
      this.prepareNodeInteraction();
      this.prepareContextmenu();
      this.showDetails();
    } else {
      this.jqview
        .removeClass("dataflow-node-shape-" + this.nodeShapeName)
        .addClass("dataflow-node-shape");
      this.showIcon();
    }

    if (!core.dataflowManager.visModeOn) {
      // not show edges with vis mode on
      this.showPorts();
      this.updatePorts(); // update edges
    }
    this.options();
  },

  showIcon: function() {
    this.jqicon = $("<div></div>")
      .addClass(this.iconClass)
      .appendTo(this.jqview);
  },

  // show label
  showLabel: function() {
    var node = this;
    this.jqview.find(".dataflow-node-label").remove();
    if (this.labelOn) {
      $("<div></div>")
        .attr("contenteditable", true)
        .addClass("dataflow-node-label")
        .text(this.label)
        .prependTo(this.jqview)
        .mousedown(function(event) {
          $(this).attr("contenteditable", true);  // re-enable when clicked
        })
        .blur(function(event){
          node.label = $(this).text();  // may contain html tag, ignore
          $(this).attr("contenteditable", false); // disable, otherwise requires 2 clicks
        });
    }
  },

  // option handle, to implement options, write showOptions()
  options: function() {
    var node = this;
    if (this.optionsOn == true) {
      if (this.jqoptions) { // already shown, clear
        this.jqoptions.remove();
      }
      this.jqoptions = $("<div></div>")
        .addClass("dataflow-options")
        .addClass("ui-widget-content ui-widget")
        .appendTo(this.jqview)
        .draggable({
          stop: function(event) {
            var offset = $(event.target).position();  // relative position
            node.optionsOffset = offset;
          }
        });
      if (this.optionsOffset != null) {
        this.jqoptions.css(this.optionsOffset);
      }
      this.showOptions();
    } else {
      if (this.jqoptions) {
        this.jqoptions.remove();
        this.jqoptions = null;
      }
    }
  },

  prepareNodeInteraction: function() {
    if (this.nodeInteractionOn) // prevent making interaction twice
      return;
    this.nodeInteractionOn = true;

    var node = this,
        jqview = this.jqview;

    this.jqview
      .mouseenter(function() {
        jqview.addClass("dataflow-node-hover");
      })
      .mouseleave(function() {
        jqview.removeClass("dataflow-node-hover");
      })
      .mousedown(function(event, ui) {
        if (event.which === 1) // left click
          core.dataflowManager.activateNode(node.nodeId);
        else if (event.which === 3)
          $(".ui-contextmenu")
            .css("z-index", 1000); // over other things
        core.interactionManager.mousedownHandler({
          type: "node",
          event: event,
          node: node
        });
      })
      .mouseup(function(event, ui) {
        core.interactionManager.mouseupHandler({
          type: "node",
          event: event,
          node: node
        });
      })
      .resizable({
        handles: "all",
        resize: function(event, ui) {
          node.resize(ui.size);
        },
        stop: function(event, ui) {
          node.resizestop(ui.size);
        }
      })
      .draggable({
        cancel: "input, .dataflow-node-label",
        //containment: "#dataflow",
        start: function(event, ui) {
          core.interactionManager.dragstartHandler({
            type: "node",
            event: event,
            node: node
          });
        },
        drag: function(event, ui) {
          core.interactionManager.dragmoveHandler({
            type: "node",
            event: event,
            node: node
          });
          node.updateEdges();
        },
        stop: function(event, ui) {
          core.interactionManager.dragstopHandler({
            type: "node",
            event: event
          });
        }
     })
     .droppable({
        drop: function(event, ui) {
          core.interactionManager.dropHandler({
            type: "node",
            event: event,
            node: node
          });
        }
     });

    // remove resizable handler icon at se
    this.jqview.find(".ui-icon-gripsmall-diagonal-se")
      .removeClass("ui-icon ui-icon-gripsmall-diagonal-se");
    this.jqview.resizable("disable");
  },

  prepareContextmenu: function() {
    var node = this;

    // right-click menu
    this.jqview.contextmenu({
      delegate: this.jqview,
      addClass: "ui-contextmenu",
      menu: [
          {title: "Toggle Details", cmd: "details", uiIcon: "ui-icon-document"},
          {title: "Toggle Options", cmd: "options", uiIcon: "ui-icon-note"},
          {title: "Toggle Label", cmd: "label"},
          {title: "Visualization Mode", cmd: "vismode"},
          {title: "Delete", cmd: "delete", uiIcon: "ui-icon-close"},
          ],
      select: function(event, ui) {
        if (ui.cmd == "details") {
          node.toggleDetails();
        } else if (ui.cmd == "options") {
          node.toggleOptions();
        } else if (ui.cmd == "label") {
          node.toggleLabel();
        } else if (ui.cmd == "vismode") {
          node.toggleVisMode();
        } else if (ui.cmd == "delete") {
          core.dataflowManager.deleteNode(node);
        }
      },
      beforeOpen: function(event, ui) {
        if (core.interactionManager.contextmenuLock)
          return false;
        core.interactionManager.contextmenuLock = true;
      },
      close: function(event, ui) {
        core.interactionManager.contextmenuLock = false;
      }
    });

    // disable some of the entries based on child class specification
    // in this.contextmenuDisabled
    for (var entry in this.contextmenuDisabled) {
      this.jqview.contextmenu("showEntry", entry, false);
    }
  },

  prepareDimensionList: function(ignoreTypes) {
    if (ignoreTypes == null)
      ignoreTypes = [];

    var inpack = this.ports["in"].pack;
    if (inpack.isEmptyData())
      return [];
    var dims = inpack.data.dimensions,
        dimTypes = inpack.data.dimensionTypes;
    var list = [];
    for (var i in dims) {
      if (ignoreTypes.indexOf(dimTypes[i]) != -1)
        continue;
      list.push({
        value: i,
        text: dims[i]
      });
    }
    return list;
  },

  updateEdges: function() {
    for (var key in this.ports) {
      var port = this.ports[key];
      for (var i in port.connections) {
        var edge = port.connections[i];
        edge.update();
      }
    }
  },

  showPorts: function() {
    this.jqview.find(".dataflow-port").remove();

    var width = this.jqview.width(),
        height = this.jqview.innerHeight();

    var portStep = this.portHeight + this.portGap;
    var node = this;
    var inTopBase = (height - this.inPorts.length * portStep + this.portGap) / 2;
    for (var i in this.inPorts) {
      var port = this.inPorts[i];
      var jqview = $("<div></div>")
        .css("top", inTopBase + i * portStep)
        .appendTo(this.jqview);
      port.setJqview(jqview);
    }
    var outTopBase = (height - this.outPorts.length * portStep + this.portGap) / 2;
    for (var i in this.outPorts) {
      var port = this.outPorts[i];
      var jqview = $("<div></div>")
        .css("top", outTopBase + i * portStep)
        .appendTo(this.jqview);
      port.setJqview(jqview);
    }
  },

  updatePorts: function() {
    var width = this.jqview.width(),
        height = this.jqview.innerHeight();
    var node = this;
    var portStep = this.portHeight + this.portGap;
    var inTopBase = (height - this.inPorts.length * portStep + this.portGap) / 2;
    for (var i in this.inPorts) {
      var port = this.inPorts[i];
      port.jqview
        .css("top", inTopBase + i * portStep);
      for (var j in port.connections) {
        port.connections[j].update();
      }
    }
    var outTopBase = (height - this.outPorts.length * portStep + this.portGap) / 2;
    for (var i in this.outPorts) {
      var port = this.outPorts[i];
      port.jqview
        .css("top", outTopBase + i * portStep);
      for (var j in port.connections) {
        port.connections[j].update();
      }
    }
  },

  remove: function() {
    $(this.jqview).children().remove();
    core.viewManager.removeNodeView(this.jqview);
  },

  hide: function() {
    $(this.jqview).hide();
  },

  firstConnectable: function(port) {
    var ports = port.isInPort ? this.outPorts : this.inPorts;
    for (var i in ports) {
      var port2 = ports[i];
      if (port2.connectable(port) == 0){
        return port2;
      }
    }
    return null;
  },

  inPortsChanged: function() {
    for (var i in this.inPorts) {
      if (this.inPorts[i].isSingle) {
        if (this.inPorts[i].pack.changed)
          return true;
      } else {  // in-multiple
        for (var j in this.inPorts[i].packs) {
          if (this.inPorts[i].packs[j].changed)
            return true;
        }
      }
    }
    return false;
  },

  update: function() {
    if (!this.inPortsChanged()) {
      return; // everything not changed, do not process
    }

    this.process();
    this.show();

    /* TODO double check here, process shall already handles it
    for (var i in this.outPorts) {
      this.outPorts[i].pack.changed = true; // mark changes
    }
    */
  },

  process: function() {
    // process input data and generate output
    // write this function in inheritting classes

    // WARNING: you cannot call propagate in process, otherwise
    // dataflowManager will endlessly call process
  },

  saveCss: function() {
    var css = {
      left: this.jqview.position().left,
      top: this.jqview.position().top,
      width: this.jqview.width(),
      height: this.jqview.height()
    };
    if (!core.dataflowManager.visModeOn) {
      _(this.css).extend(css);
    } else {
      _(this.visCss).extend(css);
    }
  },

  loadCss: function() {
    if (!core.dataflowManager.visModeOn) {
      this.jqview.css(this.css);
    } else {
      this.jqview.css(this.visCss);
    }
  },

  keyAction: function(key, event) {
    if ($(event.target).is("input")) {
      // avoid interfering with user typing input
      return;
    }
    if (key == "." || key == "ctrl+X") {
      core.dataflowManager.deleteNode(this);
    } else if (key == "D") {
      this.toggleDetails();
    } else if (key == "T") {
      this.toggleOptions();
    } else if (key == "L") {
      this.toggleLabel();
    } else if (key == "V") {
      this.toggleVisMode();
    }
  },

  toggleVisMode: function() {
    this.visModeOn = !this.visModeOn;
  },

  toggleDetails: function() {
    if (this.contextmenuDisabled["details"] != null)
      return;
    this.detailsOn = !this.detailsOn;
    this.show();
    this.updatePorts();
  },

  toggleOptions: function() {
    if (this.contextmenuDisabled["options"] != null)
      return;
    this.optionsOn = !this.optionsOn;
      this.options();
  },

  toggleLabel: function() {
    if (this.contextmenuDisabled["label"] != null)
      return;
    this.labelOn = !this.labelOn;
    this.showLabel();
  },

  // process and propagate changes
  pushflow: function() {
    this.process();
    core.dataflowManager.propagate(this); // push property changes to downflow
  },

  // called when node is resized
  resize: function(size) {
    if (core.dataflowManager.visModeOn == false) {
      this.viewWidth = size.width;
      this.viewHeight = size.height;
      _(this.css).extend({
        width: size.width,
        height: size.height
      });
      this.updatePorts();
    } else {
      _(this.visCss).extend({
        width: size.width,
        height: size.height
      });
    }
  },

  resizestop: function(size) {
    this.resize(size);
  },

  // abstract
  showOptions: function() {},
  showDetails: function() {}

};

var DataflowNode = Base.extend(extObject);

