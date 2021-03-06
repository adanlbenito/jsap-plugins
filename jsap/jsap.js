/*globals document */
/*eslint-env browser */

var LinkedStore = function (storeName) {
    // Store for the semantic terms, each store holds its own data tree
    // Terms are added as key/value paris to a root node
    var root = {};

    function objectToXML(obj, root, doc) {
        // Used if an object was passed as a term value
        var term;
        for (term in obj) {
            if (obj.hasOwnProperty(term)) {
                if (typeof obj[term] === "object") {
                    var docNode;
                    if (obj[term].toXML) {
                        docNode = obj[term].toXML(doc);
                    } else {
                        docNode = doc.createElement(term);
                        root.appendChild(docNode);
                        if (obj[term].length) {
                            arrayToXML(obj[term], docNode, doc);
                        } else {
                            objectToXML(obj[term], docNode, doc);
                        }
                    }
                    root.appendChild(docNode);
                } else {
                    root.setAttribute(term, obj[term]);
                }
            }
        }
    }

    function arrayToXML(arr, root, doc) {
        // Used to convert an array to a list of XML entries
        var all_numbers = true,
            all_strings = true,
            i, l = arr.length;
        for (i = 0; i < l; i++) {
            switch (typeof arr[i]) {
                case "string":
                    all_numbers = false;
                    break;
                case "number":
                    all_strings = false;
                    break;
                case "object":
                    all_numbers = all_strings = false;
                    break;
            }
        }
        if (all_numbers || all_strings) {
            // An array of numbers or strings
            for (i = 0; i < l; i++) {
                root.setAttribute("index-" + i, arr[i]);
            }
        } else {
            // An array of objects
            for (i = 0; i < l; i++) {
                var node = document.createElement("value");
                node.setAttribute("index", i);
                objectToXML(arr[i], node, doc);
                root.appendChild(node);
            }
        }
    }

    Object.defineProperties(this, {
        'name': {
            'get': function () {
                return storeName;
            },
            'set': function (name) {
                if (storeName === undefined) {
                    name = storeName;
                } else {
                    throw ("Name is already set");
                }
            }
        },
        'addTerm': {
            'value': function (term, value) {
                if (typeof term !== "string" && term.length === 0) {
                    throw ("term must be a string");
                }
                root[term] = value;
            }
        },
        'addTerms': {
            'value': function (termsObject) {
                if (typeof termsObject !== "object") {
                    throw ("addTerms takes an object of term/value pairs");
                }
                var term;
                for (term in termsObject) {
                    if (termsObject.hasOwnProperty(term)) {
                        this.addTerm(term, termsObject[term]);
                    }
                }
            }
        },
        'deleteTerm': {
            'value': function (term) {
                if (typeof term !== "string" && term.length === 0) {
                    throw ("term must be a string");
                }
                root[term] = undefined;
            }
        },
        'getTerm': {
            'value': function (term) {
                if (typeof term !== "string" && term.length === 0) {
                    throw ("term must be a string");
                }
                return root[term];
            }
        },
        'hasTerm': {
            'value': function (term) {
                if (typeof term !== "string" && term.length === 0) {
                    throw ("term must be a string");
                }
                return root.hasOwnProperty(term);
            }
        },
        'toJSON': {
            'value': function () {
                return JSON.parse(JSON.stringify(root));
            }
        },
        'toXML': {
            'value': function (doc) {
                var node;
                if (!doc) {
                    doc = document.implementation.createDocument(null, storeName, null);
                    node = doc.firstElementChild;
                } else {
                    node = doc.createElement(storeName);
                }
                objectToXML(root, node, doc);
                return node;
            }
        }
    });
};

// Add getInputs to all AudioNodes to ease deployment
/*globals AudioNode, Worker, console, window, document, Promise, XMLHttpRequest */
/*eslint-env browser */
AudioNode.prototype.getInputs = function () {
    return [this];
};

// This should simply define the BasePlugin from which custom plugins can be built from
var BasePlugin = function (factory, owner) {
    var inputList = [],
        outputList = [],
        pOwner = owner;
    this.context = factory.context;
    this.factory = factory;
    this.featureMap = new PluginFeatureInterface(this);
    this.parameters = new ParameterManager(this);

    this.addInput = function (node) {
        inputList.push(node);
        return inputList;
    };
    this.deleteInput = function (node) {
        var i = inputList.findIndex(function (e) {
            return e === this;
        }, node);
        if (i === -1) {
            return false;
        }
        inputList.splice(i, 1);
        return true;
    };
    this.addOutput = function (node) {
        outputList.push(node);
        return this.outputs;
    };
    this.deleteOutput = function (node) {
        var i = outputList.findIndex(function (e) {
            return e === this;
        }, node);
        if (i === -1) {
            return false;
        }
        outputList.splice(i, 1);
        return true;
    };

    Object.defineProperties(this, {
        "numInputs": {
            get: function () {
                return inputList.length;
            },
            set: function () {
                throw ("Cannot set the number of inputs of BasePlugin");
            }
        },
        "numOutputs": {
            get: function () {
                return outputList.length;
            },
            set: function () {
                throw ("Cannot set the number of outputs of BasePlugin");
            }
        },
        "numParameters": {
            get: function () {
                return this.parameters.parameters.length;
            },
            set: function () {
                throw ("Cannot set the number of parameters of BasePlugin");
            }
        },
        "owner": {
            get: function () {
                return pOwner;
            },
            set: function (owner) {
                if (typeof owner === "object") {
                    pOwner = owner;
                }
                return pOwner;
            }
        },
        "inputs": {
            get: function (index) {
                return inputList;
            },
            set: function () {
                throw ("Illegal attempt to modify BasePlugin");
            }
        },
        "outputs": {
            get: function (index) {
                return outputList;
            },
            set: function () {
                throw ("Illegal attempt to modify BasePlugin");
            }
        }
    });
};

BasePlugin.prototype.connect = function (dest) {
    this.outputs[0].connect(dest.inpt ? dest.input : dest);
};

BasePlugin.prototype.disconnect = function (dest) {
    if (dest === undefined) {
        this.outputs[0].disconnect();
    } else {
        this.outputs[0].disconnect(dest.input ? dest.input : dest);
    }
};

BasePlugin.prototype.getInputs = function () {
    return this.inputs;
};
BasePlugin.prototype.getOutputs = function () {
    return this.outputs;
};

BasePlugin.prototype.start = function () {};
BasePlugin.prototype.stop = function () {};

BasePlugin.prototype.onloaded = function () {};
BasePlugin.prototype.onunloaded = function () {};
BasePlugin.prototype.deconstruct = function () {};

BasePlugin.prototype.getParameterNames = function () {
    return this.parameters.getParameterNames();
};

BasePlugin.prototype.getParameterByName = function (name) {
    return this.parameters.getParameterByName(name);
};

BasePlugin.prototype.getParameterObject = function () {
    return this.parameters.getParameterObject();
};

BasePlugin.prototype.setParameterByName = function (name, value) {
    return this.parameters.setParameterByName(name, value);
};

BasePlugin.prototype.setParametersByObject = function (object) {
    // Set a parameter by passing a paired tuple object of the parameter name with the value
    // For instance, the Volume Control could use object = {volume: 0.5}
    // The LowPass could use object = {gain: 0.5, frequency: 1000, Q: 1.3}
    return this.parameters.setParametersByObject(object);
};

var ParameterManager = function (owner) {
    var parameterList = [];

    function findPlugin(name) {
        return parameterList.find(function (e) {
            return e.name === name;
        });
    }

    function findPluginIndex(name) {
        return parameterList.findIndex(function (e) {
            return e.name === name;
        });
    }

    function buildParameterObject() {
        var obj = {};
        parameterList.forEach(function (e) {
            obj[e.name] = e;
        });
        return obj;
    }

    function createParameter(dataType, name, defaultValue, minimum, maximum) {
        var p = new PluginParameter(owner, dataType, name, defaultValue, minimum, maximum);
        parameterList.push(p);
        return p;
    }

    function PluginParameter(owner, dataType, name, defaultValue, minimum, maximum) {
        /* Plugin Private Variables
              These are accessed by the public facing getter/setter
        */

        var _parentProcessor = owner,
            _dataType, _minimum, _maximum, _value, _name, _actions, _update, _translate, _trigger, boundParam, _default;

        if (arguments.length < 3) {
            throw ("INVALID PARAMETERS: Must always define owner, dataType and name");
        }
        dataType = dataType.toLowerCase();
        switch (dataType) {
            case "number":
                _dataType = "Number";
                _minimum = minimum;
                _maximum = maximum;
                break;
            case "string":
                _dataType = "String";
                _minimum = minimum;
                _maximum = maximum;
                break;
            case "button":
                _dataType = "Button";
                break;
            case "switch":
                _dataType = "Switch";
                break;
            default:
                throw ("Invalid dataType");
        }

        _default = _value = defaultValue;
        _name = name;
        _actions = [];

        // Update Function
        _update = function (value) {
            return value;
        };

        // Translate Function
        _translate = function (value) {
            return value;
        };

        // Trigger Function
        _trigger = function () {};

        this.bindToAudioParam = function (AudioParameterNode) {
            if ((_dataType === "Number" || _dataType === "Switch") && typeof AudioParameterNode.value === "number") {
                boundParam = AudioParameterNode;
                if (AudioParameterNode !== undefined) {
                    this.value = _translate(boundParam.value);
                }
                return;
            } else if (_dataType === "String" && typeof AudioParameterNode.value === "string") {
                boundParam = AudioParameterNode;
                if (AudioParameterNode !== undefined) {
                    this.value = _translate(boundParam.value);
                }
                return;
            }
            throw ("Cannot bind parameter of type " + _dataType + " to an AudioParameter of type " + typeof AudioParameterNode.value + " . Use the trigger instead.");
        };

        function addAction(event) {
            // Add an action to the list
            switch (_dataType) {
                case "Number":
                case "String":
                    if (typeof event === _dataType.toLowerCase()) {
                        _actions.push({
                            'time': new Date(),
                            'value': event
                        });
                    }
                    break;
                case "Switch":
                    if (event === 1 || event === true) {
                        event = 1;
                    } else {
                        event = 0;
                    }
                    _actions.push({
                        'time': new Date(),
                        'state': event
                    });
                    break;
                case "Button":
                    _actions.push({
                        'time': new Date(),
                        'event': event.type
                    });
                    break;
            }
        }

        // Public facing getter/setter to preserve the plugin parameter mappings
        Object.defineProperties(this, {
            "dataType": {
                get: function () {
                    return _dataType;
                },
                set: function () {
                    throw ("Cannot set the dataType of PluginParameter");
                }
            },
            "name": {
                get: function () {
                    return _name;
                },
                set: function () {
                    throw ("Cannot set the name of PluginParameter");
                }
            },
            "actions": {
                get: function () {
                    return _actions;
                },
                set: function () {
                    throw ("Cannot set private variable 'actions'");
                }
            },
            "update": {
                get: function () {
                    return _update;
                },
                set: function (func) {
                    if (typeof func !== "function") {
                        throw ("Must pass in a valid function");
                    }
                    if (func(0) === undefined) {
                        throw ("Function must return a value");
                    }
                    _update = func;
                }
            },
            "translate": {
                get: function () {
                    return _translate;
                },
                set: function (func) {
                    if (typeof func !== "function") {
                        throw ("Must pass in a valid function");
                    }
                    if (func(0) === undefined) {
                        throw ("Function must return a value");
                    }
                    _translate = func;
                }
            },
            "trigger": {
                get: function () {
                    return _trigger;
                },
                set: function (func, arg_this) {
                    if (typeof func !== "function") {
                        throw ("Must pass in a valid function");
                    }
                    if (typeof arg_this === "object") {
                        _trigger = func.bind(arg_this);
                    } else {
                        _trigger = func.bind(owner);
                    }
                }
            },
            "destroy": {
                'value': function () {
                    _parentProcessor = _dataType = _minimum = _maximum = _value = _name = _actions = _update = _translate = _trigger = boundParam = undefined;
                }
            },
            "minimum": {
                get: function () {
                    if (_dataType === "Number") {
                        return _minimum;
                    }
                    return undefined;
                },
                set: function () {
                    throw ("Cannot set the minimum value of PluginParameter");
                }
            },
            "maximum": {
                get: function () {
                    if (_dataType === "Number") {
                        return maximum;
                    }
                    return undefined;
                },
                set: function () {
                    throw ("Cannot set the maximum value of PluginParameter");
                }
            },
            "default": {
                get: function () {
                    if (_dataType === "String" || _dataType === "Number") {
                        return _default;
                    }
                    return undefined;
                },
                set: function () {
                    throw ("Cannot set the default value of PluginParameter");
                }
            },
            "value": {
                get: function () {
                    if (_dataType === "String") {
                        if (boundParam) {
                            _value = _translate(boundParam.value);
                        }
                        return _value;
                    } else if (_dataType === "Number" || _dataType === "Switch") {
                        return _value;
                    }
                    return undefined;
                },
                set: function (newValue) {
                    if (_dataType !== "Switch" && _dataType !== "String" && _dataType !== "Number") {
                        throw ("Cannot read non-value PluginParameter");
                    }
                    if (_dataType === "Switch") {
                        _value++;
                        if (_value >= _maximum) {
                            _value = minimum;
                        }
                    } else {
                        switch (_dataType) {
                            case "String":
                                if (typeof newValue !== "string") {
                                    newValue = String(newValue);
                                }
                                break;
                            case "Number":
                                if (typeof newValue !== "number") {
                                    newValue = Number(newValue);
                                }
                                if (_maximum !== undefined) {
                                    newValue = Math.min(newValue, _maximum);
                                }
                                if (_minimum !== undefined) {
                                    newValue = Math.max(newValue, _minimum);
                                }
                                break;
                        }
                        _value = newValue;
                        if (boundParam) {
                            boundParam.value = _update(_value);
                        }
                    }
                    addAction(_value);
                    _trigger();
                    return _value;
                }
            },
            "onclick": {
                "value": function (event) {
                    if (_dataType === "Switch") {
                        _value++;
                        if (_value >= maximum) {
                            _value = minimum;
                        }
                        addAction(event);
                        _trigger();
                        return _value;
                    } else if (_dataType === "Button") {
                        _value = event;
                        addAction(event);
                        _trigger();
                        return event;
                    }
                    throw ("Cannot use onclick on PluginParameter");
                }
            }
        });
    }

    Object.defineProperties(this, {
        'createParameter': {
            'value': function (dataType, name, defaultValue, minimum, maximum) {
                return createParameter(dataType, name, defaultValue, minimum, maximum);
            }
        },
        'getParameterName': {
            'value': function () {
                var names = [],
                    i;
                for (i = 0; i < parameterList.length; i++) {
                    names.push(parameterList[i].name);
                }
                return names;
            }
        },
        'getParameterByName': {
            'value': function (name) {
                return findPlugin(name);
            }
        },
        'getParameterObject': {
            'value': function () {
                return buildParameterObject();
            }
        },
        'setParameterByName': {
            'value': function (n, v) {
                var parameter = findPlugin(n);
                if (!parameter) {
                    return;
                }
                parameter.value = v;
            }
        },
        'deleteParameter': {
            'value': function (o) {
                var index = parameterList.findIndex(function (e) {
                    return e === o;
                }, o);
                if (index >= 0) {
                    // Does exist
                    parameterList.splice(index, 1);
                    o.destroy();
                    return true;
                }
                return false;
            }
        },
        'deleteAllParameters': {
            'value': function (o) {
                parameterList.forEach(function (e) {
                    e.destroy();
                });
                parameterList = [];
                return true;
            }
        },
        'setParametersByObject': {
            'value': function (object) {
                var key;
                for (key in object) {
                    if (object.hasOwnProperty(key)) {
                        this.setParameterByName(key, object[key]);
                    }
                }
            }
        },
        'parameters': {
            'get': function () {
                return parameterList;
            },
            'set': function () {
                throw ("Cannot set read only array");
            }
        }
    });
};

var PluginFeatureInterface = function (BasePluginInstance) {
    this.plugin = BasePluginInstance;
    this.Receiver = new PluginFeatureInterfaceReceiver(this, BasePluginInstance.factory.FeatureMap);
    this.Sender = new PluginFeatureInterfaceSender(this, BasePluginInstance.factory.FeatureMap);

    Object.defineProperty(this, "onfeatures", {
        'get': function () {
            return this.Receiver.onfeatures;
        },
        'set': function (func) {
            this.Receiver.onfeatures = func;
            return func;
        }
    });
};
var PluginFeatureInterfaceReceiver = function (FeatureInterfaceInstance, FactoryFeatureMap) {
    var c_features = function () {};
    this.requestFeatures = function (featureList) {
        var i;
        for (i = 0; i < featureList.length; i++) {
            this.requestFeaturesFromPlugin(featureList[i].plugin, {
                'outputIndex': featureList[i].outputIndex,
                'frameSize': featureList[i].frameSize,
                'features': featureList[i].features
            });
        }
    };
    this.requestFeaturesFromPlugin = function (source, featureObject) {
        if (source === undefined) {
            throw ("Source plugin must be defined");
        }
        if (featureObject === undefined) {
            throw ("FeatureObject must be defined");
        }
        if (typeof featureObject.outputIndex !== "number" || typeof featureObject.frameSize !== "number" || typeof featureObject.features !== "object") {
            throw ("Malformed featureObject");
        }
        FactoryFeatureMap.requestFeatures(FeatureInterfaceInstance.plugin, source, featureObject);
    };
    this.cancelFeaturesFromPlugin = function (source, featureObject) {
        if (source === undefined) {
            throw ("Source plugin must be defined");
        }
        if (featureObject === undefined) {
            throw ("FeatureObject must be defined");
        }
        if (typeof featureObject.outputIndex !== "number" || typeof featureObject.frameSize !== "number" || typeof featureObject.features !== "object") {
            throw ("Malformed featureObject");
        }
        FactoryFeatureMap.deleteFeatures(FeatureInterfaceInstance.plugin, source, featureObject);
    };
    this.cancelAllFeaturesFromPlugin = function (source) {
        if (source === undefined) {
            throw ("Source plugin must be defined");
        }
        FactoryFeatureMap.deleteFeatures(FeatureInterfaceInstance.plugin, source);
    };
    this.cancelAllFeatures = function () {
        FactoryFeatureMap.deleteFeatures(FeatureInterfaceInstance.plugin);
    };

    this.postFeatures = function (Message) {
        /*
            Called by the Plugin Factory with the feature message
            message = {
                'plugin': sourcePluginInstance,
                'outputIndex': outputIndex,
                'frameSize': frameSize,
                'features': {} JS-Xtract feature results object
            }
        */
        if (typeof c_features === "function") {
            c_features(Message);
        }
    };

    Object.defineProperty(this, "onfeatures", {
        'get': function () {
            return c_features;
        },
        'set': function (func) {
            if (typeof func === "function") {
                c_features = func;
                return true;
            }
            return false;
        }
    });

};
var PluginFeatureInterfaceSender = function (FeatureInterfaceInstance, FactoryFeatureMap) {
    var OutputNode = function (parent, output, index) {
        var extractors = [];
        var Extractor = function (output, frameSize) {
            this.extractor = FeatureInterfaceInstance.plugin.factory.context.createAnalyser();
            this.extractor.fftSize = frameSize;
            output.connect(this.extractor);
            this.features = [];
            Object.defineProperty(this, "frameSize", {
                'value': frameSize
            });

            function recursiveProcessing(base, list) {
                var l = list.length,
                    i, entry;
                for (i = 0; i < l; i++) {
                    entry = list[i];
                    base[entry.name].apply(base, entry.parameters);
                    if (entry.features && entry.features.length > 0) {
                        recursiveProcessing(base.result[entry.name], entry.features);
                    }
                }
            }

            function onaudiocallback(data) {
                //this === Extractor
                var message = {
                    'numberOfChannels': 1,
                    'results': []
                };
                recursiveProcessing(data, this.features);
                message.results[0] = {
                    'channel': 0,
                    'results': JSON.parse(data.toJSON())
                };
                this.postFeatures(data.length, message);
            }

            this.setFeatures = function (featureList) {
                this.features = featureList;
                if (this.features.length === 0) {
                    this.extractor.clearCallback();
                } else {
                    this.extractor.frameCallback(onaudiocallback, this);
                }
            };
        };
        var WorkerExtractor = function (output, frameSize) {
            function onaudiocallback(e) {
                var c, frames = [];
                for (c = 0; c < e.inputBuffer.numberOfChannels; c++) {
                    frames[c] = e.inputBuffer.getChannelData(c);
                }
                worker.postMessage({
                    'state': 2,
                    'frames': frames
                });
            }

            function response(msg) {
                this.postFeatures(frameSize, msg.data.response);
            }

            var worker = new Worker("jsap/feature-worker.js");
            worker.onerror = function (e) {
                console.error(e);
            };

            this.setFeatures = function (featureList) {
                var self = this;
                var configMessage = {
                    'state': 1,
                    'sampleRate': FeatureInterfaceInstance.plugin.factory.context.sampleRate,
                    'featureList': featureList,
                    'numChannels': output.numberOfOutputs,
                    'frameSize': this.frameSize
                };
                this.features = featureList;
                if (featureList && featureList.length > 0) {
                    worker.onmessage = function (e) {
                        if (e.data.state === 1) {
                            worker.onmessage = response.bind(self);
                            self.extractor.onaudioprocess = onaudiocallback.bind(self);
                        } else {
                            worker.postMessage(configMessage);
                        }
                    };
                    worker.postMessage({
                        'state': 0
                    });
                } else {
                    this.extractor.onaudioprocess = undefined;
                }

            };

            this.extractor = FeatureInterfaceInstance.plugin.factory.context.createScriptProcessor(frameSize, output.numberOfOutputs, 1);
            output.connect(this.extractor);
            this.extractor.connect(FeatureInterfaceInstance.plugin.factory.context.destination);

            Object.defineProperty(this, "frameSize", {
                'value': frameSize
            });
        };
        this.addExtractor = function (frameSize) {
            var obj;
            if (window.Worker) {
                obj = new WorkerExtractor(output, frameSize);
            } else {
                obj = new Extractor(output, frameSize);
            }
            extractors.push(obj);
            Object.defineProperty(obj, "postFeatures", {
                'value': function (frameSize, resultsJSON) {
                    var obj = {
                        'outputIndex': index,
                        'frameSize': frameSize,
                        'results': resultsJSON
                    };
                    this.postFeatures(obj);
                }.bind(this)
            });
            return obj;
        };
        this.findExtractor = function (frameSize) {
            var check = frameSize;
            return extractors.find(function (e) {
                // This MUST be === NOT ===
                return e.frameSize === check;
            });
        };
        this.deleteExtractor = function (frameSize) {};
    };
    var outputNodes = [];
    this.updateFeatures = function (featureObject) {
        // [] Output -> {} 'framesize' -> {} 'features'
        var o;
        for (o = 0; o < featureObject.length; o++) {
            if (outputNodes[o] === undefined) {
                if (o > FeatureInterfaceInstance.plugin.numOutputs) {
                    throw ("Requested an output that does not exist");
                }
                outputNodes[o] = new OutputNode(FeatureInterfaceInstance.plugin, FeatureInterfaceInstance.plugin.outputs[o], o);
                Object.defineProperty(outputNodes[o], "postFeatures", {
                    'value': function (resultObject) {
                        this.postFeatures(resultObject);
                    }.bind(this)
                });
            }
            var si;
            for (si = 0; si < featureObject[o].length; si++) {
                var extractor = outputNodes[o].findExtractor(featureObject[o][si].frameSize);
                if (!extractor) {
                    extractor = outputNodes[o].addExtractor(featureObject[o][si].frameSize);
                }
                extractor.setFeatures(featureObject[o][si].featureList);
            }
        }
    };

    this.postFeatures = function (featureObject) {
        /*
            Called by the individual extractor instances:
            featureObject = {'frameSize': frameSize,
            'outputIndex': outputIndex,
            'results':[]}
        */
        FeatureInterfaceInstance.plugin.factory.FeatureMap.postFeatures({
            'plugin': FeatureInterfaceInstance.plugin.pluginInstance,
            'outputIndex': featureObject.outputIndex,
            'frameSize': featureObject.frameSize,
            'results': featureObject.results
        });
    };

    // Send to Factory
    FactoryFeatureMap.createSourceMap(this, FeatureInterfaceInstance.plugin.pluginInstance);
};

/*
    This is an optional module which will attempt to create a graphical implementation.
    As with other audio plugins for DAWs, the GUI is an optional element which can be accepted or rejected by the host.
    The same applies here as the underlying host will have to either accept or ignore the tools' GUI
*/

var PluginUserInterface = function (BasePluginInstance, width, height) {
    this.processor = BasePluginInstance;
    this.root = document.createElement("div");
    if (width > 0) {
        this.root.style.width = width + "px";
    }
    if (height > 0) {
        this.root.style.height = height + "px";
    }
    this.dim = {
        width: width,
        height: height
    };
    this.intervalFunction = null;
    this.updateInterval = null;
    this.PluginParameterInterfaces = [];

    var PluginParameterInterfaceNode = function (DOM, PluginParameterInstance, processor, gui) {
        this.input = DOM;
        this.processor = processor;
        this.GUI = gui;
        this.AudioParam = PluginParameterInstance;
        this.handleEvent = function (event) {
            this.AudioParam.value = this.input.value;
        };
        this.input.addEventListener("change", this);
        this.input.addEventListener("mousemove", this);
        this.input.addEventListener("click", this);
    };

    this.createPluginParameterInterfaceNode = function (DOM, PluginParameterInstance) {
        var node = new PluginParameterInterfaceNode(DOM, PluginParameterInstance, this.processor, this);
        this.PluginParameterInterfaces.push(node);
        return node;
    };

    this.update = function () {};

};

PluginUserInterface.prototype.getRoot = function () {
    return this.root;
};
PluginUserInterface.prototype.getDimensions = function () {
    return this.dim;
};
PluginUserInterface.prototype.getWidth = function () {
    return this.dim.width;
};
PluginUserInterface.prototype.getHeight = function () {
    return this.dim.height;
};
PluginUserInterface.prototype.beginCallbacks = function (ms) {
    // Any registered callbacks are started by the host
    if (ms === undefined) {
        ms = 250;
    } //Default of 250ms update period
    if (this.intervalFunction === null) {
        this.updateInterval = ms;
        this.intervalFunction = window.setInterval(function () {
            this.update();
        }.bind(this), 250);
    }
};
PluginUserInterface.prototype.stopCallbacks = function () {
    // Any registered callbacks are stopped by the host
    if (this.intervalFunction !== null) {
        window.clearInterval(this.intervalFunction);
        this.updateInterval = null;
        this.intervalFunction = null;
    }
};
PluginUserInterface.prototype.loadResource = function (url) {
    var p = new Promise(function (resolve, reject) {
        var req = new XMLHttpRequest();
        req.open('GET', url);
        req.onload = function () {
            if (req.status === 200) {
                resolve(req.response);
            } else {
                reject(Error(req.statusText));
            }
        };
        req.onerror = function () {
            reject(Error("Network Error"));
        };
        req.send();
    });
    return p;
};
PluginUserInterface.prototype.clearGUI = function () {
    this.stopCallbacks();
    this.root.innerHTML = "";
};

// This defines a master object for holding all the plugins and communicating
// This object will also handle creation and destruction of plugins
/*globals Promise, document, console, LinkedStore, Worker, window */
/*eslint-env browser */

var PluginFactory = function (context, dir) {

    var audio_context = context,
        subFactories = [],
        plugin_prototypes = [],
        pluginsList = [],
        currentPluginId = 0,
        audioStarted = false,
        script,
        self = this;

    /*
        this.loadResource. Load a resource into the global namespace
        
        @param resourceObject: a JS object holding the following parameters:
            .url: URL of the resource
            .test: function to call, returns true if resource already loaded, false if not
    */
    this.loadResource = function (resourceObject) {
        if (resourceObject) {
            if (typeof resourceObject.url !== "string") {
                throw ("resourceObject.url must be a string");
            }
            if (typeof resourceObject.test !== "function") {
                throw ("resourceObject.test must be a function");
            }
            var response = resourceObject.test();
            if (response !== false && response !== true) {
                throw ("resourceObject.test must return true or false");
            }
            switch (resourceObject.type) {
                case "CSS":
                case "css":
                    return new Promise(function (resolve, reject) {
                        var css = document.createElement("link");
                        css.setAttribute("rel", "stylesheet");
                        css.setAttribute("type", "text/css");
                        css.setAttribute("href", resourceObject.url);
                        document.getElementsByTagName("head")[0].appendChild(css);
                        resolve(resourceObject);
                    });
                case "javascript":
                case "JavaScript":
                case "Javascript":
                case undefined:
                    if (!response) {
                        return loadResource(resourceObject).then(function (resourceObject) {
                            if (typeof resourceObject.returnObject === "string") {
                                var returnObject;
                                if (window.hasOwnProperty(resourceObject.returnObject)) {
                                    return window[resourceObject.returnObject];
                                }
                                return false;
                            } else {
                                return true;
                            }
                        });
                    } else {
                        return new Promise(function (resolve, reject) {
                            if (typeof resourceObject.returnObject === "string") {
                                if (window.hasOwnProperty(resourceObject.returnObject)) {
                                    resolve(window[resourceObject.returnObject]);
                                } else {
                                    reject(false);
                                }
                            } else {
                                resolve(true);
                            }
                        });
                    }
                    break;
                default:
                    console.error(resourceObject.type);
                    break;
            }
        }
    };

    this.loadPluginScript = function (resourceObject) {
        if (resourceObject) {
            if (typeof resourceObject.returnObject !== "string") {
                throw ("resourceObject.returnObject must be the name of the prototype function");
            }
            return this.loadResource(resourceObject).then(function (plugin) {
                return self.addPrototype(plugin);
            });
        }
    };

    function loadResource(resourceObject) {
        return new Promise(function (resolve, reject) {
            var script = document.createElement("script");
            script.src = resourceObject.url;
            document.getElementsByTagName("head")[0].appendChild(script);
            script.onload = function () {
                resolve(resourceObject);
            };
        });
    }

    if (dir === undefined) {
        dir = "jsap/";
    }

    var PluginInstance = function (id, plugin_node) {
        this.next_node = undefined;

        this.reconnect = function (new_next) {
            if (new_next !== this.next_node) {
                if (this.next_node !== undefined && typeof this.next_node.getInputs === "function") {
                    plugin_node.disconnect(this.next_node.getInputs()[0]);
                }
                this.next_node = new_next;
                if (this.next_node !== undefined && typeof this.next_node.getInputs === "function") {
                    plugin_node.connect(this.next_node.getInputs()[0]);
                }
                return true;
            }
            return false;
        };

        this.disconnect = function () {
            this.reconnect(undefined);
        };

        this.destory = function () {
            plugin_node.destroy();
        };

        Object.defineProperties(this, {
            'id': {
                'value': id
            },
            'node': {
                'value': plugin_node
            },
            'getInputs': {
                'value': function () {
                    return plugin_node.getInputs();
                }
            },
            'getOutputs': {
                'value': function () {
                    return plugin_node.getOutputs();
                }
            }
        });
    };

    var PluginPrototype = function (proto) {
        Object.defineProperties(this, {
            'name': {
                value: proto.prototype.name
            },
            'proto': {
                value: proto
            },
            'version': {
                value: proto.prototype.version
            },
            'uniqueID': {
                value: proto.prototype.uniqueID
            }
        });

        this.createPluginInstance = function (owner) {
            if (!this.ready) {
                throw ("Plugin Not Read");
            }
            var plugin = new proto(this.factory, owner);
            var node = new PluginInstance(currentPluginId++, plugin);
            var basePluginInstance = plugin;
            Object.defineProperties(plugin, {
                'pluginInstance': {
                    'value': node
                },
                'prototypeObject': {
                    'value': this
                },
                'name': {
                    value: proto.prototype.name
                },
                'version': {
                    value: proto.prototype.version
                },
                'uniqueID': {
                    value: proto.prototype.uniqueID
                },
                'SesionData': {
                    value: this.factory.SessionData
                },
                'UserData': {
                    value: this.factory.UserData
                }
            });
            Object.defineProperty(node, "prototypeObject", {
                'value': this
            });
            this.factory.registerPluginInstance(node);
            return node;
        };

        function loadResourceChain(resourceObject, p) {
            if (!p) {
                var k = loadResource(resourceObject);
                k.then(function (resourceObject) {
                    if (resourceObject.resources !== undefined && resourceObject.resources.length > 0) {
                        for (var i = 0; i < resourceObject.resources.length; i++) {
                            k = loadResourceChain(resourceObject.resources[i], k);
                        }
                    }
                });
                return k;
            } else {
                return p.then(loadResource(resourceObject));
            }
        }

        function loadStylesheet(url) {
            var css = document.createElement("link");
            css.setAttribute("rel", "stylesheet");
            css.setAttribute("type", "text/css");
            css.setAttribute("href", url);
            document.getElementsByTagName("head")[0].appendChild(css);
        }

        function recursiveGetTest(resourceObject) {
            if (resourceObject.hasOwnProperty("length") && resourceObject.length > 0) {
                return recursiveGetTest(resourceObject[resourceObject.length - 1]);
            } else if (resourceObject.hasOwnProperty("resources")) {
                return recursiveGetTest(resourceObject.resources);
            } else {
                return resourceObject.test;
            }
        }

        var resourcePromises = [];
        if (proto.prototype.resources) {
            for (var i = 0; i < proto.prototype.resources.length; i++) {
                var resource = proto.prototype.resources[i];
                switch (resource.type) {
                    case "css":
                    case "CSS":
                        loadStylesheet(resource.url);
                        break;
                    case "javascript":
                    case "Javascript":
                    case "JavaScript":
                    case "JS":
                        var object = {
                            'promise': loadResourceChain(resource),
                            'state': 0,
                            'complete': function () {
                                this.state = 1;
                            },
                            'test': recursiveGetTest(resource)
                        };
                        object.promise.then(object.complete.bind(object));
                        resourcePromises.push(object);
                        break;
                    default:
                        console.error(resource.type);
                        break;
                }
            }
        }

        this.getResourcePromises = function () {
            return resourcePromises;
        };
        this.ready = function () {
            var state = true;
            for (var i = 0; i < resourcePromises.length; i++) {
                if (resourcePromises[i].state !== 1 || !resourcePromises[i].test()) {
                    state = false;
                    break;
                }
            }
            return state;
        };
    };

    this.addPrototype = function (plugin_proto) {
        var testObj = {
            'proto': plugin_proto,
            'name': plugin_proto.prototype.name,
            'version': plugin_proto.prototype.version,
            'uniqueID': plugin_proto.prototype.uniqueID
        };
        if (typeof plugin_proto !== "function") {
            throw ("The Prototype must be a function!");
        }
        if (typeof testObj.name !== "string" || testObj.name.length === 0) {
            throw ("Malformed plugin. Name not defined");
        }
        if (typeof testObj.version !== "string" || testObj.version.length === 0) {
            throw ("Malformed plugin. Version not defined");
        }
        if (typeof testObj.uniqueID !== "string" || testObj.uniqueID.length === 0) {
            throw ("Malformed plugin. uniqueID not defined");
        }
        var obj = plugin_prototypes.find(function (e) {
            var param;
            var match = 0;
            for (param in this) {
                if (e[param] === this[param]) {
                    match++;
                }
            }
            return match === 4;
        }, testObj);
        if (obj) {
            throw ("The plugin must be unique!");
        }
        obj = new PluginPrototype(plugin_proto);
        plugin_prototypes.push(obj);
        Object.defineProperties(obj, {
            'factory': {
                'value': this
            }
        });
        return obj;
    };

    this.getPrototypes = function () {
        return plugin_prototypes;
    };

    this.getAllPlugins = function () {
        return pluginsList;
    };

    this.getAllPluginsObject = function () {
        var obj = {
                'factory': this,
                'subFactories': []
            },
            i;
        for (i = 0; i < subFactories.length; i++) {
            obj.subFactories.push({
                'subFactory': subFactories[i],
                'plugins': subFactories[i].getPlugins()
            });
        }
        return obj;
    };

    this.createSubFactory = function (chainStart, chainStop) {
        var node = new PluginSubFactory(this, chainStart, chainStop);
        Object.defineProperties(node, {
            'SessionData': {
                value: this.SessionData
            },
            'UserData': {
                value: this.UserData
            }
        });
        subFactories.push(node);
        return node;
    };

    this.destroySubFactory = function (SubFactory) {
        var index = subFactories.findIndex(function (element) {
            if (element === this) {
                return true;
            }
            return false;
        }, SubFactory);
        if (index >= 0) {
            subFactories.splice(index, 1);
            SubFactory.destroy();
        }
    };

    this.registerPluginInstance = function (instance) {
        if (pluginsList.find(function (p) {
                return p === this;
            }, instance)) {
            throw ("Plugin Instance not unique");
        }
        pluginsList.push(instance);
        if (audioStarted) {
            instance.node.start.call(instance.node);
        }
        return true;
    };

    this.createPluginInstance = function (PluginPrototype) {
        throw ("DEPRECATED - Use PluginPrototype.createPluginInstance(owner);");
    };

    this.deletePlugin = function (id) {
        if (id >= 0 && id < pluginsList.length) {
            pluginsList.splice(id, 1);
        }
    };

    this.audioStart = function () {
        if (!audioStarted) {
            pluginsList.forEach(function (n) {
                n.node.start.call(n.node);
            });
            audioStarted = true;
        }
    };
    this.audioStop = function () {
        if (audioStarted) {
            pluginsList.forEach(function (n) {
                n.node.stop.call(n.node);
            });
            audioStarted = false;
        }
    };

    Object.defineProperty(this, "context", {
        'get': function () {
            return audio_context;
        },
        'set': function () {}
    });

    this.FeatureMap = function () {
        var Mappings = [];
        var SourceMap = function (Sender, pluginInstace) {
            var Mappings = [];
            this.getSourceInstance = function () {
                return pluginInstace;
            };
            this.getSender = function () {
                return Sender;
            };

            function updateSender() {
                function recursiveFind(featureList) {
                    var f, list = [];
                    for (f = 0; f < featureList.length; f++) {
                        var featureNode = list.find(function (e) {
                            return e.name === this.name;
                        }, featureList[f]);
                        if (!featureNode || (featureList[f].parameters && featureList[f].parameters.length !== 0)) {
                            featureNode = {
                                'name': featureList[f].name,
                                'parameters': featureList[f].parameters,
                                'features': []
                            };
                            list.push(featureNode);
                        }
                        if (featureList[f].features && featureList[f].features.length > 0) {
                            featureNode.features = recursiveFind(featureList[f].features);
                        }
                    }
                    return list;
                }
                var i, outputList = [];
                for (i = 0; i < Mappings.length; i++) {
                    if (outputList[Mappings[i].outputIndex] === undefined) {
                        outputList[Mappings[i].outputIndex] = [];
                    }
                    var frameList = outputList[Mappings[i].outputIndex].find(function (e) {
                        return e.frameSize === this.frameSize;
                    }, Mappings[i]);
                    if (!frameList) {
                        frameList = {
                            'frameSize': Mappings[i].frameSize,
                            'featureList': undefined
                        };
                        outputList[Mappings[i].outputIndex].push(frameList);
                    }
                    frameList.featureList = recursiveFind(Mappings[i].getFeatureList());
                }
                Sender.updateFeatures(outputList);
            }

            this.requestFeatures = function (requestorInstance, featureObject) {
                var map = Mappings.find(function (e) {
                    return (e.outputIndex === this.outputIndex && e.frameSize === this.frameSize);
                }, featureObject);
                if (!map) {
                    map = {
                        'outputIndex': featureObject.outputIndex,
                        'frameSize': featureObject.frameSize,
                        'requestors': [],
                        'getFeatureList': function () {
                            var F = [],
                                i;
                            for (i = 0; i < this.requestors.length; i++) {
                                F = F.concat(this.requestors[i].getFeatureList());
                            }
                            return F;
                        }
                    };
                    Mappings.push(map);
                }
                var requestor = map.requestors.find(function (e) {
                    return e.getRequestorInstance() === this;
                }, requestorInstance);
                if (!requestor) {
                    requestor = new RequestorMap(requestorInstance);
                    map.requestors.push(requestor);
                }
                requestor.addFeatures(featureObject);
                updateSender();
            };

            this.findFrameMap = function (outputIndex, frameSize) {
                return Mappings.find(function (e) {
                    return (e.outputIndex === outputIndex && e.frameSize === frameSize);
                });
            };

            this.cancelFeatures = function (requestorInstance, featureObject) {
                if (featureObject === undefined) {
                    Mappings.forEach(function (map) {
                        var requestorIndex = map.requestors.findIndex(function (e) {
                            return e.getRequestorInstance() === requestorInstance;
                        });
                        if (requestorIndex >= 0) {
                            map.requestors.splice(requestorIndex, 1);
                        }
                    });
                } else {
                    var map = Mappings.find(function (e) {
                        return (e.outputIndex === this.outputIndex && e.frameSize === this.frameSize);
                    }, featureObject);
                    if (!map) {
                        return;
                    }
                    var requestor = map.requestors.find(function (e) {
                        return e.getRequestorInstance() === this;
                    }, requestorInstance);
                    if (!requestor) {
                        return;
                    }
                    requestor.deleteFeatures(featureObject);
                }
                updateSender();
            };
        };
        var RequestorMap = function (pluginInstance) {
            var Features = [];
            var Receiver = pluginInstance.node.featureMap.Receiver;
            this.getRequestorInstance = function () {
                return pluginInstance;
            };

            function recursivelyAddFeatures(rootArray, featureObject) {
                var i;
                for (i = 0; i < featureObject.length; i++) {
                    // Check we have not already listed the feature
                    var featureNode = rootArray.find(function (e) {
                        return e.name === this.name;
                    }, featureObject[i]);
                    if (!featureNode) {
                        featureNode = {
                            'name': featureObject[i].name,
                            'parameters': featureObject[i].parameters,
                            'features': []
                        };
                        rootArray.push(featureNode);
                    }
                    if (featureObject[i].features !== undefined && featureObject[i].features.length > 0) {
                        recursivelyAddFeatures(featureNode.features, featureObject[i].features);
                    }
                }
            }

            function recursivelyDeleteFeatures(rootArray, featureObject) {
                var l = featureObject.length,
                    i;
                for (i = 0; i < l; i++) {
                    // Find the feature
                    var index = rootArray.find(function (e) {
                        return e.name === this.name;
                    }, featureObject[i]);
                    if (index >= 0) {
                        if (featureObject[index].features && featureObject[index].features.length > 0) {
                            recursivelyDeleteFeatures(rootArray[index].features, featureObject[index].features);
                        } else {
                            Features.splice(index, 0);
                        }
                    }

                }
            }

            this.addFeatures = function (featureObject) {
                recursivelyAddFeatures(Features, featureObject.features);
            };

            this.deleteFeatures = function (featureObject) {
                recursivelyDeleteFeatures(Features, featureObject.features);
            };

            this.getFeatureList = function () {
                return Features;
            };

            this.postFeatures = function (featureObject) {
                var message = {
                        'plugin': featureObject.plugin,
                        'outputIndex': featureObject.outputIndex,
                        'frameSize': featureObject.frameSize,
                        'features': {
                            'numberOfChannels': featureObject.results.numberOfChannels,
                            'results': []
                        }
                    },
                    i;

                function recursivePostFeatures(rootNode, resultsList, FeatureList) {
                    // Add the results tree where necessary
                    var i, param;

                    function ao(e) {
                        return e.name === param;
                    }
                    for (param in resultsList) {
                        if (resultsList.hasOwnProperty(param)) {
                            var node = FeatureList.find(ao);
                            if (node) {
                                if (resultsList[param].constructor === Object && node.results) {
                                    rootNode[param] = {};
                                    recursivePostFeatures(rootNode[param], resultsList[param], node.results);
                                } else {
                                    rootNode[param] = resultsList[param];
                                }
                            }
                        }
                    }
                }
                // Perform recursive map for each channel
                for (i = 0; i < featureObject.results.numberOfChannels; i++) {
                    message.features.results[i] = {};
                    recursivePostFeatures(message.features.results[i], featureObject.results.results[i].results, Features);
                }
                pluginInstance.node.featureMap.Receiver.postFeatures(message);
            };
        };

        function findSourceIndex(Sender) {
            return Mappings.findIndex(function (e) {
                return e.getSender() === this;
            }, Sender);
        }

        // GENERAL INTERFACE
        this.createSourceMap = function (Sender, pluginInstance) {
            var node = new SourceMap(Sender, pluginInstance);
            Mappings.push(node);
            return node;
        };
        this.deleteSourceMap = function (Sender) {
            var index = findSourceIndex(Sender);
            if (index === -1) {
                throw ("Could not find the source map for the plugin");
            }
            Mappings.splice(index, 1);
        };

        this.getPluginSender = function (plugin) {
            if (plugin.constructor === PluginInstance) {
                plugin = plugin.node;
            }
            return plugin.featureMap.Sender;
        };

        this.requestFeatures = function (requestor, source, featureObject) {
            if (requestor.constructor !== PluginInstance) {
                requestor = requestor.pluginInstance;
            }
            // Get the source map

            var sourceMap = Mappings[findSourceIndex(source)];
            if (!sourceMap) {
                sourceMap = Mappings[findSourceIndex(this.getPluginSender(source))];
                if (!sourceMap) {
                    throw ("Could not locate source map");
                }
            }
            sourceMap.requestFeatures(requestor, featureObject);
        };
        this.deleteFeatures = function (requestor, source, featureObject) {
            if (requestor.constructor !== PluginInstance) {
                requestor = requestor.pluginInstance;
            }
            if (source === undefined) {
                Mappings.forEach(function (sourceMap) {
                    sourceMap.cancelFeatures(requestor);
                });
            } else {
                // Get the source map
                var sourceMap = Mappings[findSourceIndex(source)];
                if (!sourceMap) {
                    sourceMap = Mappings[findSourceIndex(this.getPluginSender(source))];
                    if (!sourceMap) {
                        throw ("Could not locate source map");
                    }
                }
                sourceMap.cancelFeatures(requestor, featureObject);
            }
        };
        this.getFeatureList = function (requestor, source) {};
        this.postFeatures = function (featureObject) {
            // Receive from the Sender objects
            // Trigger distributed search for results transmission

            // First get the instance mapping for output/frame
            var source = Mappings[findSourceIndex(featureObject.plugin)];
            if (!source) {
                source = Mappings[findSourceIndex(this.getPluginSender(featureObject.plugin))];
                if (!source) {
                    throw ("Plugin Instance not loaded!");
                }
            }
            var frameMap = source.findFrameMap(featureObject.outputIndex, featureObject.frameSize);

            // Send the feature object to the RequestorMap object to handle comms
            frameMap.requestors.forEach(function (e) {
                e.postFeatures(this);
            }, featureObject);

        };
    };

    this.FeatureMap = new this.FeatureMap();
    Object.defineProperty(this.FeatureMap, "factory", {
        'value': this
    });

    var stores = [];

    this.createStore = function (storeName) {
        var node = new LinkedStore(storeName);
        stores.push(node);
        return node;
    };

    this.getStores = function () {
        return stores;
    };

    this.findStore = function (storeName) {
        return stores.find(function (a) {
            return a.name === storeName;
        });
    };

    // Build the default Stores
    this.SessionData = new LinkedStore("Session");
    this.UserData = new LinkedStore("User");

    // Created for the input of each SubFactory plugin chain
    var SubFactoryFeatureSender = function (owner, FactoryFeatureMap) {
        var OutputNode = function (parent, output) {
            var extractors = [];
            var Extractor = function (output, frameSize) {
                this.extractor = output.context.createAnalyser();
                this.extractor.fftSize = frameSize;
                output.connect(this.extractor);
                this.features = [];
                Object.defineProperty(this, "frameSize", {
                    'value': frameSize
                });

                function recursiveProcessing(base, list) {
                    var l = list.length,
                        i, entry;
                    for (i = 0; i < l; i++) {
                        entry = list[i];
                        base[entry.name].apply(base, entry.parameters);
                        if (entry.features && entry.features.length > 0) {
                            recursiveProcessing(base.result[entry.name], entry.features);
                        }
                    }
                }

                function onaudiocallback(data) {
                    //this === Extractor
                    var message = {
                        'numberOfChannels': 1,
                        'results': []
                    };
                    recursiveProcessing(data, this.features);
                    message.results[0] = {
                        'channel': 0,
                        'results': JSON.parse(data.toJSON())
                    };
                    this.postFeatures(data.length, message);
                }

                this.setFeatures = function (featureList) {
                    this.features = featureList;
                    if (this.features.length === 0) {
                        this.extractor.clearCallback();
                    } else {
                        this.extractor.frameCallback(onaudiocallback, this);
                    }
                };
                this.rejoinExtractor = function () {
                    output.connect(this.extractor);
                };
            };
            var WorkerExtractor = function (output, frameSize) {
                function onaudiocallback(e) {
                    var c, frames = [];
                    for (c = 0; c < e.inputBuffer.numberOfChannels; c++) {
                        frames[c] = e.inputBuffer.getChannelData(c);
                    }
                    worker.postMessage({
                        'state': 2,
                        'frames': frames
                    });
                }

                function response(msg) {
                    this.postFeatures(frameSize, msg.data.response);
                }

                var worker = new Worker("jsap/feature-worker.js");
                worker.onerror = function (e) {
                    console.error(e);
                };

                this.setFeatures = function (featureList) {
                    var self = this;
                    var configMessage = {
                        'state': 1,
                        'sampleRate': output.context.sampleRate,
                        'featureList': featureList,
                        'numChannels': output.numberOfOutputs,
                        'frameSize': this.frameSize
                    };
                    this.features = featureList;
                    if (featureList && featureList.length > 0) {
                        worker.onmessage = function (e) {
                            if (e.data.state === 1) {
                                worker.onmessage = response.bind(self);
                                self.extractor.onaudioprocess = onaudiocallback.bind(self);
                            } else {
                                worker.postMessage(configMessage);
                            }
                        };
                        worker.postMessage({
                            'state': 0
                        });
                    } else {
                        this.extractor.onaudioprocess = undefined;
                    }

                };

                this.rejoinExtractor = function () {
                    output.connect(this.extractor);
                };

                this.extractor = output.context.createScriptProcessor(frameSize, output.numberOfOutputs, 1);
                output.connect(this.extractor);
                this.extractor.connect(output.context.destination);

                Object.defineProperty(this, "frameSize", {
                    'value': frameSize
                });
            };
            this.addExtractor = function (frameSize) {
                var obj;
                if (window.Worker) {
                    obj = new WorkerExtractor(output, frameSize);
                } else {
                    obj = new Extractor(output, frameSize);
                }
                extractors.push(obj);
                Object.defineProperty(obj, "postFeatures", {
                    'value': function (frameSize, resultsJSON) {
                        var obj = {
                            'outputIndex': 0,
                            'frameSize': frameSize,
                            'results': resultsJSON
                        };
                        this.postFeatures(obj);
                    }.bind(this)
                });
                return obj;
            };
            this.findExtractor = function (frameSize) {
                var check = frameSize;
                return extractors.find(function (e) {
                    // This MUST be == NOT ===
                    return Number(e.frameSize) === Number(check);
                });
            };
            this.rejoinExtractors = function () {
                extractors.forEach(function (e) {
                    e.rejoinExtractor();
                });
            };
            this.deleteExtractor = function (frameSize) {};
        };
        var outputNodes;
        this.updateFeatures = function (featureObject) {
            var o;
            for (o = 0; o < featureObject.length; o++) {
                if (outputNodes === undefined) {
                    if (o > 1) {
                        throw ("Requested an output that does not exist");
                    }
                    outputNodes = new OutputNode(owner, owner.chainStart);
                    Object.defineProperty(outputNodes, "postFeatures", {
                        'value': function (resultObject) {
                            this.postFeatures(resultObject);
                        }.bind(this)
                    });
                }
                var si;
                for (si = 0; si < featureObject[o].length; si++) {
                    var extractor = outputNodes.findExtractor(featureObject[o][si].frameSize);
                    if (!extractor) {
                        extractor = outputNodes.addExtractor(featureObject[o][si].frameSize);
                    }
                    extractor.setFeatures(featureObject[o][si].featureList);
                }
            }
        };

        this.rejoinExtractors = function () {
            if (outputNodes) {
                outputNodes.rejoinExtractors();
            }
        };

        this.postFeatures = function (featureObject) {
            /*
                Called by the individual extractor instances:
                featureObject = {'frameSize': frameSize,
                'outputIndex': outputIndex,
                'results':[]}
            */
            FactoryFeatureMap.postFeatures({
                'plugin': this,
                'outputIndex': featureObject.outputIndex,
                'frameSize': featureObject.frameSize,
                'results': featureObject.results
            });
        };

        // Send to Factory
        FactoryFeatureMap.createSourceMap(this, undefined);
    };

    var PluginSubFactory = function (PluginFactory, chainStart, chainStop) {

        var plugin_list = [],
            pluginChainStart = chainStart,
            pluginChainStop = chainStop,
            factoryName = "",
            state = 1,
            chainStartFeature = new SubFactoryFeatureSender(this, PluginFactory.FeatureMap),
            semanticStores = [];
        this.parent = PluginFactory;
        pluginChainStart.disconnect();
        pluginChainStart.connect(chainStop);

        this.TrackData = new LinkedStore("Track");
        this.PluginData = new LinkedStore("Plugin");

        this.featureSender = chainStartFeature;

        this.getFeatureChain = function () {

        };

        function rebuild() {
            var i = 0,
                l = plugin_list.length - 1;
            while (i < l) {
                var currentNode = plugin_list[i++];
                var nextNode = plugin_list[i];
                currentNode.reconnect(nextNode);
            }
        }

        function isolate() {
            plugin_list.forEach(function (e) {
                e.disconnect();
            });
        }

        function cutChain() {
            if (plugin_list.length > 0) {
                pluginChainStart.disconnect(plugin_list[0].node.getInputs()[0]);
                plugin_list[plugin_list.length - 1].node.getOutputs()[0].disconnect(pluginChainStop);
            } else {
                pluginChainStart.disconnect(pluginChainStop);
            }
        }

        function joinChain() {
            if (plugin_list.length > 0) {
                pluginChainStart.connect(plugin_list[0].node.getInputs()[0]);
                plugin_list[plugin_list.length - 1].node.getOutputs()[0].connect(pluginChainStop);
            } else {
                pluginChainStart.connect(pluginChainStop);
            }
            chainStartFeature.rejoinExtractors();
        }

        this.getPrototypes = function () {
            return this.parent.getPrototypes();
        };

        this.getFactory = function () {
            return this.parent;
        };

        this.destroy = function () {
            var i;
            for (i = 0; i < plugin_list.length; i++) {
                this.destroyPlugin(plugin_list[i]);
            }
            pluginChainStart.disconnect();
            pluginChainStart.connect(pluginChainStop);
        };

        // Plugin creation / destruction

        this.createPlugin = function (prototypeObject) {
            var node, last_node;
            if (state === 0) {
                throw ("SubFactory has been destroyed! Cannot add new plugins");
            }
            cutChain();
            node = prototypeObject.createPluginInstance(this);
            Object.defineProperties(node, {
                'TrackData': {
                    value: this.TrackData
                }
            });
            plugin_list.push(node);
            isolate();
            rebuild();
            joinChain();
            node.node.onloaded.call(node.node);
            return node;
        };

        this.destroyPlugin = function (plugin_object) {
            if (state === 0) {
                return;
            }
            var index = this.getPluginIndex(plugin_object);
            if (index >= 0) {
                cutChain();
                plugin_object.node.stop.call(plugin_object.node);
                plugin_object.node.onloaded.call(plugin_object.node);
                plugin_object.node.deconstruct.call(plugin_object.node);
                plugin_list.splice(index, 1);
                this.parent.deletePlugin(plugin_object.id);
                isolate();
                rebuild();
                joinChain();
            }
        };

        this.getPlugins = function () {
            return plugin_list;
        };

        this.getAllPlugins = function () {
            return this.parent.getAllPluginsObject();
        };

        this.getPluginIndex = function (plugin_object) {
            if (state === 0) {
                return;
            }
            var index = plugin_list.findIndex(function (element, index, array) {
                if (element === this) {
                    return true;
                }
                return false;
            }, plugin_object);
            return index;
        };

        this.movePlugin = function (plugin_object, new_index) {
            if (state === 0) {
                return;
            }
            var obj, index = this.getPluginIndex(plugin_object),
                holdLow, holdHigh, i;
            if (index >= 0) {
                cutChain();
                isolate();
                obj = plugin_list.splice(index, 1);
                plugin_object.node.onunloaded.call(plugin_object.node);
                if (new_index === 0) {
                    plugin_list = obj.concat(plugin_list);
                } else if (new_index >= plugin_list.length) {
                    plugin_list = plugin_list.concat(obj);
                } else {
                    holdLow = plugin_list.slice(0, new_index);
                    holdHigh = plugin_list.slice(new_index);
                    plugin_list = holdLow.concat(obj.concat(holdHigh));
                }
                rebuild();
                joinChain();
                plugin_object.node.onloaded.call(plugin_object.node);
            }
        };

        Object.defineProperty(this, "name", {
            get: function () {
                return factoryName;
            },
            set: function (name) {
                if (typeof name === "string") {
                    factoryName = name;
                }
                return factoryName;
            }
        });
        Object.defineProperties(this, {
            'chainStart': {
                'value': chainStart
            },
            'chainStop': {
                'value': chainStop
            }
        });
    };
};

/*
 * Copyright (C) 2016 Nicholas Jillings
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */

//"use strict";

// This work is based upon LibXtract developed by Jamie Bullock
//https://github.com/jamiebullock/LibXtract

/*globals window, console, Float32Array, Float64Array, Int32Array */
/*globals inverseTransform, transform */

function xtract_is_denormal(num) {
    if (Math.abs(num) <= 2.2250738585072014e-308) {
        return true;
    }
    return false;
}

function xtract_array_sum(data) {
    var sum = 0;
    for (var n = 0; n < data.length; n++) {
        sum += data[n];
    }
    return sum;
}

function xtract_array_min(data) {
    var min = Infinity;
    for (var n = 0; n < data.length; n++) {
        if (data[n] < min) {
            min = data[n];
        }
    }
    return min;
}

function xtract_array_max(data) {
    var max = data[0];
    for (var n = 1; n < data.length; n++) {
        if (data[n] > max) {
            max = data[n];
        }
    }
    return max;
}

function xtract_array_normalise(data) {
    var max = xtract_array_max(data);
    if (max === 1.0) {
        return data;
    }
    for (var n = 0; n < data.length; n++) {
        data[n] /= max;
    }
    return data;
}

function xtract_array_bound(data, min, max) {
    if (typeof min !== "number" && typeof max !== "number") {
        return data;
    }
    if (min >= max) {
        console.error("Invalid boundaries! Minimum cannot be greater than maximum");
        return [];
    }
    var result = new data.constructor(data.length);
    for (var n = 0; n < data.length; n++) {
        result[n] = Math.min(Math.max(data[n], min), max);
    }
    return result;
}

function xtract_array_interlace(data) {
    var num_arrays = data.length;
    if (num_arrays === 0) {
        return [];
    }
    var length = data[0].length;
    for (var n = 0; n < num_arrays; n++) {
        if (data[n].length !== length) {
            throw ("All argument lengths must be the same");
        }
    }
    var result = new data.constructor(num_arrays * length);
    for (var k = 0; k < length; k++) {
        for (var j = 0; j < num_arrays; j++) {
            result[k * num_arrays + j] = data[j][k];
        }
    }
    return result;
}

function xtract_array_deinterlace(data, num_arrays) {
    if (typeof num_arrays !== "number" || num_arrays <= 0) {
        console.error("num_arrays must be a positive integer");
    }
    if (num_arrays === 1) {
        return data;
    }
    var result = [];
    var N = data.length / num_arrays;
    if (N !== Math.round(N)) {
        console.error("Cannot safely divide data into " + num_arrays + " sub arrays");
    }
    for (var n = 0; n < num_arrays; n++) {
        result[n] = new data.constructor(N);
    }
    for (var k = 0; k < N; k++) {
        for (var j = 0; j < num_arrays; j++) {
            result[j][k] = data[k * num_arrays + j];
        }
    }
    return result;
}

/* Array Manipulation */

function xtract_get_number_of_frames(data, hop_size) {
    if (typeof data !== "object" && data.length === undefined || data.length === 0) {
        throw ("Invalid data parameter. Must be item with iterable list");
    }
    if (typeof hop_size !== "number" && hop_size <= 0) {
        throw ("Invalid hop_size. Must be positive integer");
    }
    return Math.floor(data.length / hop_size);
}

function xtract_get_data_frames(data, frame_size, hop_size, copy) {
    if (typeof data !== "object" && data.length === undefined || data.length === 0) {
        throw ("Invalid data parameter. Must be item with iterable list");
    }
    if (typeof frame_size !== "number") {
        throw ("xtract_get_data_frames requires the frame_size to be defined");
    }
    if (frame_size <= 0 || frame_size !== Math.floor(frame_size)) {
        throw ("xtract_get_data_frames requires the frame_size to be a positive integer");
    }
    if (hop_size === undefined) {
        hop_size = frame_size;
    }
    if (hop_size <= 0 || hop_size !== Math.floor(hop_size)) {
        throw ("xtract_get_data_frames requires the hop_size to be a positive integer");
    }
    var frames = [];
    var N = data.length;
    var K = Math.ceil(N / hop_size);
    var sub_frame;
    for (var k = 0; k < K; k++) {
        var offset = k * hop_size;
        if (copy) {
            sub_frame = new Float64Array(frame_size);
            for (var n = 0; n < frame_size && n + offset < data.length; n++) {
                sub_frame[n] = data[n + offset];
            }
        } else {
            sub_frame = data.subarray(offset, offset + frame_size);
            if (sub_frame.length < frame_size) {
                // Must zero-pad up to the length
                var c_frame = new Float64Array(frame_size);
                for (var i = 0; i < sub_frame.length; i++) {
                    c_frame[i] = sub_frame[i];
                }
                sub_frame = c_frame;
            }
        }
        frames.push(sub_frame);
    }
    return frames;
}

function xtract_process_frame_data(array, func, sample_rate, frame_size, hop_size, arg_this) {
    if (typeof array !== "object" && array.length === undefined || array.length === 0) {
        throw ("Invalid data parameter. Must be item with iterable list");
    }
    if (typeof func !== "function") {
        throw ("xtract_process_frame_data requires func to be a defined function");
    }
    if (typeof sample_rate !== "number") {
        throw ("xtract_get_data_frames requires sample_rate to be defined");
    }
    if (typeof frame_size !== "number") {
        throw ("xtract_get_data_frames requires the frame_size to be defined");
    }
    if (frame_size <= 0 || frame_size !== Math.floor(frame_size)) {
        throw ("xtract_get_data_frames requires the frame_size to be a positive integer");
    }
    if (hop_size === undefined) {
        hop_size = frame_size;
    }
    if (hop_size <= 0 || hop_size !== Math.floor(hop_size)) {
        throw ("xtract_get_data_frames requires the hop_size to be a positive integer");
    }
    var frames = xtract_get_data_frames(array, frame_size, hop_size);
    var result = {
        num_frames: frames.length,
        results: []
    };
    var fft_size = frame_size >> 1;
    var frame_time = 0;
    var data = {
        frame_size: frame_size,
        hop_size: hop_size,
        sample_rate: sample_rate,
        TimeData: undefined,
        SpectrumData: undefined
    };
    var prev_data;
    var prev_result;
    for (var fn = 0; fn < frames.length; fn++) {
        var frame = frames[fn];
        data.TimeData = frame;
        data.SpectrumData = xtract_spectrum(frame, sample_rate, true, false);
        prev_result = func.call(arg_this || this, data, prev_data, prev_result);
        var frame_result = {
            time_start: frame_time,
            result: prev_result
        };
        frame_time += frame_size / sample_rate;
        prev_data = data;
        data = {
            frame_size: frame_size,
            hop_size: hop_size,
            sample_rate: sample_rate,
            TimeData: undefined,
            SpectrumData: undefined
        };
        result.results.push(frame_result);
    }
    return result;
}

function xtract_array_to_JSON(array) {
    if (array.join) {
        return '[' + array.join(', ') + ']';
    }
    var json = '[';
    var n = 0;
    while (n < this.length) {
        json = json + this[n];
        if (this[n + 1] !== undefined) {
            json = json + ',';
        }
        n++;
    }
    return json + ']';
}

function xtract_frame_from_array(src, dst, index, frame_size, hop_size) {
    if (typeof index !== "number" || index !== Math.floor(index)) {
        throw ("xtract_get_frame requires the index to be an integer value");
    }
    if (typeof frame_size !== "number") {
        throw ("xtract_get_frame requires the frame_size to be defined");
    }
    if (frame_size <= 0 || frame_size !== Math.floor(frame_size)) {
        throw ("xtract_get_frame requires the frame_size to be a positive integer");
    }
    if (hop_size === undefined) {
        hop_size = frame_size;
    }
    if (typeof src !== "object" && src.length === undefined || src.length === 0) {
        throw ("Invalid data parameter. Must be item with iterable list");
    }
    if (typeof dst !== "object" && dst.length === undefined || dst.length !== hop_size) {
        throw ("dst must be an Array-like object equal in length to hop_size");
    }
    if (hop_size <= 0 || hop_size !== Math.floor(hop_size)) {
        throw ("xtract_get_frame requires the hop_size to be a positive integer");
    }
    var K = this.xtract_get_number_of_frames(hop_size);
    if (index < 0 || index >= K) {
        throw ("index number " + index + " out of bounds");
    }
    var n = 0;
    while (n < dst.length && n < this.length && n < frame_size) {
        dst[n] = this[n];
        n++;
    }
    while (n < dst.length) {
        dst[n] = 0.0;
    }
}

/* Scalar.c */

function xtract_mean(array) {
    return xtract_array_sum(array) / array.length;
}

function xtract_temporal_centroid(energyArray, sample_rate, window_ms) {
    if (typeof sample_rate !== "number") {
        console.error("xtract_temporal_centroid requires sample_rate to be a number");
        return;
    }
    if (typeof window_ms !== "number") {
        console.log("xtract_temporal_centroid assuming window_ms = 100ms");
        window_ms = 100.0;
    }
    if (window_ms <= 0) {
        window_ms = 100.0;
    }
    var ts = 1.0 / sample_rate;
    var L = sample_rate * (window_ms / 1000.0);
    var den = xtract_array_sum(energyArray);
    var num = 0.0;
    for (var n = 0; n < energyArray.length; n++) {
        num += energyArray[n] * (n * L * ts);
    }
    var result = num / den;
    return result;
}

function xtract_variance(array, mean) {
    if (typeof mean !== "number") {
        mean = xtract_mean(array);
    }
    var result = 0.0;
    for (var n = 0; n < array.length; n++) {
        result += Math.pow(array[n] - mean, 2);
    }
    result = result /= (array.length - 1);
    return result;
}

function xtract_standard_deviation(array, variance) {
    if (typeof variance !== "number") {
        variance = xtract_variance(array);
    }
    return Math.sqrt(variance);
}

function xtract_average_deviation(array, mean) {
    if (typeof mean !== "number") {
        mean = xtract_mean(array);
    }
    var result = 0.0;
    for (var n = 0; n < array.length; n++) {
        result += Math.abs(array[n] - mean);
    }
    result /= array.length;
    return result;
}

function xtract_skewness(array, mean, standard_deviation) {
    if (typeof mean !== "number") {
        mean = xtract_mean(array);
    }
    if (typeof standard_deviation !== "number") {
        standard_deviation = xtract_standard_deviation(array, xtract_variance(array, mean));
    }
    var result = 0.0;
    for (var n = 0; n < array.length; n++) {
        result += Math.pow((array[n] - mean) / standard_deviation, 3);
    }
    result /= array.length;
    return result;
}

function xtract_kurtosis(array, mean, standard_deviation) {
    if (typeof mean !== "number") {
        mean = xtract_mean(array);
    }
    if (typeof standard_deviation !== "number") {
        standard_deviation = xtract_standard_deviation(array, xtract_variance(array, mean));
    }
    var result = 0.0;
    for (var n = 0; n < array.length; n++) {
        result += Math.pow((array[n] - mean) / standard_deviation, 4);
    }
    result /= array.length;
    return result;
}

function xtract_spectral_centroid(spectrum) {
    var N = spectrum.length;
    var n = N >> 1;
    var amps = spectrum.subarray(0, n);
    var freqs = spectrum.subarray(n);
    var Amps = new Float64Array(n);
    for (var i = 0; i < n; i++) {
        Amps[i] = amps[i];
    }
    amps = xtract_array_normalise(Amps);
    var A_d = xtract_array_sum(amps) / n;
    if (A_d === 0.0) {
        return 0.0;
    }
    var sum = 0.0;
    while (n--) {
        sum += freqs[n] * (amps[n] / A_d);
    }
    var result = sum / (N >> 1);
    return result;
}

function xtract_spectral_mean(spectrum) {
    var N = spectrum.length;
    var n = N >> 1;
    var amps = spectrum.subarray(0, n);
    var sum = xtract_array_sum(amps);
    var result = sum / n;
    return result;
}

function xtract_spectral_variance(spectrum, spectral_mean) {
    if (typeof spectral_mean !== "number") {
        spectral_mean = xtract_spectral_centroid(spectrum);
    }
    var A = 0,
        result = 0;
    var N = spectrum.length;
    var n = N >> 1;
    var amps = spectrum.subarray(0, n);
    var freqs = spectrum.subarray(n);
    if (amps.reduce) {
        A = amps.reduce(function (a, b) {
            return a + b;
        });
    } else {
        A = 0.0;
        for (var i = 0; i < n; i++) {
            A += amps[i];
        }
    }
    while (n--) {
        result += Math.pow(freqs[n] - spectral_mean, 2) * amps[n];
    }
    result /= A;
    return result;
}

function xtract_spectral_spread(spectrum, spectral_centroid) {
    if (typeof spectral_centroid !== "number") {
        spectral_centroid = xtract_spectral_centroid(spectrum);
    }
    return xtract_spectral_variance(spectrum, spectral_centroid);
}

function xtract_spectral_standard_deviation(spectrum, spectral_variance) {
    if (typeof spectral_variance !== "number") {
        spectral_variance = xtract_spectral_variance(spectrum);
    }
    return Math.sqrt(spectral_variance);
}

function xtract_spectral_skewness(spectrum, spectral_mean, spectral_standard_deviation) {
    if (typeof spectral_mean !== "number") {
        spectral_mean = xtract_spectral_mean(spectrum);
    }
    if (typeof spectral_standard_deviation !== "number") {
        spectral_standard_deviation = xtract_spectral_standard_deviation(spectrum, xtract_spectral_variance(spectrum, spectral_mean));
    }
    var result = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);
    for (var n = 0; n < K; n++) {
        result += Math.pow(freqs[n] - spectral_mean, 3) * amps[n];
    }
    result /= Math.pow(spectral_standard_deviation, 3);
    return result;
}

function xtract_spectral_kurtosis(spectrum, spectral_mean, spectral_standard_deviation) {
    if (typeof spectral_mean !== "number") {
        spectral_mean = xtract_spectral_mean(spectrum);
    }
    if (typeof spectral_standard_deviation !== "number") {
        spectral_standard_deviation = xtract_spectral_standard_deviation(spectrum, xtract_spectral_variance(spectrum, spectral_mean));
    }
    var result = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);
    for (var n = 0; n < K; n++) {
        result += Math.pow(freqs[n] - spectral_mean, 4) * amps[n];
    }
    return result / Math.pow(spectral_standard_deviation, 4);
}

function xtract_irregularity_k(spectrum) {
    var result = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    for (var n = 1; n < K - 1; n++) {
        result += Math.abs(amps[n] - (amps[n - 1] + amps[n] + amps[n + 1]) / 3);
    }
    return result;
}

function xtract_irregularity_j(spectrum) {
    var num = 0,
        den = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    for (var n = 0; n < K - 1; n++) {
        num += Math.pow(amps[n] - amps[n + 1], 2);
        den += Math.pow(amps[n], 2);
    }
    return num / den;
}

function xtract_tristimulus_1(spectrum, f0) {
    if (typeof f0 !== "number") {
        console.error("xtract_tristimulus_1 requires f0 to be defined and a number");
        return null;
    }
    var h = 0,
        den = 0.0,
        p1 = 0.0,
        temp = 0.0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);

    for (var i = 0; i < K; i++) {
        temp = amps[i];
        if (temp !== 0) {
            den += temp;
            h = Math.floor(freqs[i] / f0 + 0.5);
            if (h === 1) {
                p1 += temp;
            }
        }
    }

    if (den === 0.0 || p1 === 0.0) {
        return 0.0;
    } else {
        return p1 / den;
    }
}

function xtract_tristimulus_2(spectrum, f0) {
    if (typeof f0 !== "number") {
        console.error("xtract_tristimulus_1 requires f0 to be defined and a number");
        return null;
    }
    var den, p2, p3, p4, ps, temp, h = 0;
    den = p2 = p3 = p4 = ps = temp = 0.0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);

    for (var i = 0; i < K; i++) {
        temp = amps[i];
        if (temp !== 0) {
            den += temp;
            h = Math.floor(freqs[i] / f0 + 0.5);
            switch (h) {
                case 2:
                    p2 += temp;
                    break;
                case 3:
                    p3 += temp;
                    break;
                case 4:
                    p4 += temp;
                    break;
                default:
                    break;
            }
        }
    }
    ps = p2 + p3 + p4;
    if (den === 0.0 || ps === 0.0) {
        return 0.0;
    } else {
        return ps / den;
    }
}

function xtract_tristimulus_3(spectrum, f0) {
    if (typeof f0 !== "number") {
        console.error("xtract_tristimulus_1 requires f0 to be defined and a number");
        return null;
    }
    var den = 0.0,
        num = 0.0,
        temp = 0.0,
        h = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);

    for (var i = 0; i < K; i++) {
        temp = amps[i];
        if (temp !== 0.0) {
            den += temp;
            h = Math.floor(freqs[i] / f0 + 0.5);
            if (h >= 5) {
                num += temp;
            }
        }
    }
    if (den === 0.0 || num === 0.0) {
        return 0.0;
    } else {
        return num / den;
    }
}

function xtract_smoothness(spectrum) {
    var prev = 0,
        current = 0,
        next = 0,
        temp = 0;
    var N = spectrum.length;
    var K = N >> 1;
    prev = spectrum[0] <= 0 ? 1e-5 : spectrum[0];
    current = spectrum[1] <= 0 ? 1e-5 : spectrum[1];
    for (var n = 1; n < K - 1; n++) {
        if (n > 1) {
            prev = current;
            current = next;
        }
        next = spectrum[n + 1] <= 0 ? 1e-5 : spectrum[n + 1];
        temp += Math.abs(20.0 * Math.log(current) - (20.0 * Math.log(prev) + 20.0 * Math.log(current) + 20.0 * Math.log(next)) / 3.0);
    }
    return temp;
}

function xtract_zcr(timeArray) {
    var result = 0;
    for (var n = 1; n < timeArray.length; n++) {
        if (timeArray[n] * timeArray[n - 1] < 0) {
            result++;
        }
    }
    return result / timeArray.length;
}

function xtract_rolloff(spectrum, sampleRate, threshold) {
    if (typeof sampleRate !== "number" || typeof threshold !== "number") {
        console.log("xtract_rolloff requires sampleRate and threshold to be defined");
        return null;
    }
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);

    var pivot = 0,
        temp = 0;

    pivot = xtract_array_sum(amps);

    pivot *= threshold / 100.0;
    var n = 0;
    while (temp < pivot) {
        temp += amps[n];
        n++;
    }
    return n * (sampleRate / (spectrum.length));
}

function xtract_loudness(barkBandsArray) {
    var result = 0;
    for (var n = 0; n < barkBandsArray.length; n++) {
        result += Math.pow(barkBandsArray[n], 0.23);
    }
    return result;
}

function xtract_flatness(spectrum) {
    var count = 0,
        denormal_found = false,
        num = 1.0,
        den = 0.0,
        temp = 0.0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);

    for (var n = 0; n < K; n++) {
        if (amps[n] !== 0.0) {
            if (xtract_is_denormal(num)) {
                denormal_found = true;
                break;
            }
            num *= amps[n];
            den += amps[n];
            count++;
        }
    }
    if (count === 0) {
        return 0;
    }
    num = Math.pow(num, 1.0 / K);
    den /= K;

    return num / den;
}

function xtract_flatness_db(spectrum, flatness) {
    if (typeof flatness !== "number") {
        flatness = xtract_flatness(spectrum);
    }
    return 10.0 * Math.log10(flatness);
}

function xtract_tonality(spectrum, flatness_db) {
    if (typeof flatness_db !== "number") {
        flatness_db = xtract_flatness_db(spectrum);
    }
    return Math.min(flatness_db / -60.0, 1);
}

function xtract_crest(data, max, mean) {
    if (typeof max !== "number") {
        max = xtract_array_max(data);
    }
    if (typeof mean !== "number") {
        mean = xtract_mean(data);
    }
    return max / mean;
}

function xtract_noisiness(h, p) {
    var i = 0.0;
    if (typeof h !== "number" && typeof p !== "number") {
        return 0;
    }
    i = p - h;
    return i / p;
}

function xtract_rms_amplitude(timeArray) {
    var result = 0;
    for (var n = 0; n < timeArray.length; n++) {
        result += timeArray[n] * timeArray[n];
    }
    return Math.sqrt(result / timeArray.length);
}

function xtract_spectral_inharmonicity(peakSpectrum, f0) {
    if (typeof f0 !== "number") {
        console.error("spectral_inharmonicity requires f0 to be defined.");
        return null;
    }
    var h = 0,
        num = 0.0,
        den = 0.0;
    var N = peakSpectrum.length;
    var K = N >> 1;
    var amps = peakSpectrum.subarray(0, n);
    var freqs = peakSpectrum.subarray(n);
    for (var n = 0; n < K; n++) {
        if (amps[n] !== 0.0) {
            h = Math.floor(freqs[n] / f0 + 0.5);
            var mag_sq = Math.pow(amps[n], 2);
            num += Math.abs(freqs[n] - h * f0) * mag_sq;
            den += mag_sq;
        }
    }
    return (2 * num) / (f0 * den);
}

function xtract_power(magnitudeArray) {
    return null;
}

function xtract_odd_even_ratio(harmonicSpectrum, f0) {
    if (typeof f0 !== "number") {
        console.error("spectral_inharmonicity requires f0 to be defined.");
        return null;
    }
    var h = 0,
        odd = 0.0,
        even = 0.0,
        temp;
    var N = harmonicSpectrum.length;
    var K = N >> 1;
    var amps = harmonicSpectrum.subarray(0, n);
    var freqs = harmonicSpectrum.subarray(n);
    for (var n = 0; n < K; n++) {
        temp = amps[n];
        if (temp !== 0.0) {
            h = Math.floor(freqs[n] / f0 + 0.5);
            if (h % 2 !== 0) {
                odd += temp;
            } else {
                even += temp;
            }
        }
    }

    if (odd === 0.0 || even === 0.0) {
        return 0.0;
    } else {
        return odd / even;
    }
}

function xtract_sharpness(barkBandsArray) {
    var N = barkBandsArray.length;

    var rv, sl = 0.0,
        g = 0.0,
        temp = 0.0;
    for (var n = 0; n < N; n++) {
        sl = Math.pow(barkBandsArray[n], 0.23);
        g = (n < 15 ? 1.0 : 0.066 * Math.exp(0.171 * n));
        temp += n * g * sl;
    }
    temp = 0.11 * temp / N;
    return temp;
}

function xtract_spectral_slope(spectrum) {
    var F = 0.0,
        FA = 0.0,
        A = 0.0,
        FXTRACT_SQ = 0.0;
    var N = spectrum.length;
    var M = N >> 1;
    var amps = spectrum.subarray(0, M);
    var freqs = spectrum.subarray(M);
    F = xtract_array_sum(freqs);
    A = xtract_array_sum(amps);
    for (var n = 0; n < M; n++) {
        FA += freqs[n] * amps[n];
        FXTRACT_SQ += freqs[n] * freqs[n];
    }
    return (1.0 / A) * (M * FA - F * A) / (M * FXTRACT_SQ - F * F);
}

function xtract_lowest_value(data, threshold) {
    if (typeof threshold !== "number") {
        threshold = -Infinity;
    }
    var result = +Infinity;
    for (var n = 0; n < data.length; n++) {
        if (data[n] > threshold) {
            result = Math.min(result, data[n]);
        }
    }
    return result;
}

function xtract_highest_value(data, threshold) {
    if (typeof threshold !== "number") {
        threshold = +Infinity;
    }
    var result = -Infinity;
    for (var n = 0; n < data.length; n++) {
        if (data[n] >= threshold) {
            result = Math.max(result, data[n]);
        }
    }
    return result;
}

function xtract_sum(data) {
    return xtract_array_sum(data);
}

function xtract_nonzero_count(data) {
    var count = 0;
    for (var n = 0; n < data.length; n++) {
        if (data[n] !== 0) {
            count++;
        }
    }
    return count;
}

function xtract_hps(spectrum) {
    var peak_index = 0,
        position1_lwr = 0,
        largest1_lwr = 0,
        tempProduct = 0,
        peak = 0,
        ratio1 = 0;
    var N = spectrum.length;
    var K = N >> 1;
    var amps = spectrum.subarray(0, K);
    var freqs = spectrum.subarray(K);
    var M = Math.ceil(K / 3.0);
    var i;
    if (M <= 1) {
        console.error("Input Data is too short for HPS");
        return null;
    }

    for (i = 0; i < M; ++i) {
        tempProduct = amps[i] * amps[i * 2] * amps[i * 3];
        if (tempProduct > peak) {
            peak = tempProduct;
            peak_index = i;
        }
    }

    for (i = 0; i < K; i++) {
        if (amps[i] > largest1_lwr && i !== peak_index) {
            largest1_lwr = amps[i];
            position1_lwr = i;
        }
    }

    ratio1 = amps[position1_lwr] / amps[peak_index];

    if (position1_lwr > peak_index * 0.4 && position1_lwr < peak_index * 0.6 && ratio1 > 0.1)
        peak_index = position1_lwr;

    return freqs[peak_index];
}

function xtract_f0(timeArray, sampleRate) {
    if (typeof sampleRate !== "number") {
        sampleRate = 44100.0;
    }
    var sub_arr = new Float64Array(timeArray.length);
    var N = sub_arr.length;
    var M = N / 2;
    var n;
    for (n = 0; n < N; n++) {
        sub_arr[n] = timeArray[n];
    }

    var threshold_peak = 0.8,
        threshold_centre = 0.3,
        err_tau_1 = 0,
        array_max = 0;

    array_max = xtract_array_max(sub_arr);
    threshold_peak *= array_max;
    threshold_centre *= array_max;

    for (n = 0; n < sub_arr.length; n++) {
        if (sub_arr[n] > threshold_peak) {
            sub_arr[n] = threshold_peak;
        } else if (sub_arr[n] < -threshold_peak) {
            sub_arr[n] = -threshold_peak;
        }

        if (sub_arr[n] < threshold_centre) {
            sub_arr[n] = 0;
        } else {
            sub_arr[n] -= threshold_centre;
        }
    }

    for (n = 1; n < M; n++) {
        err_tau_1 += Math.abs(sub_arr[n] - sub_arr[n + 1]);
    }
    for (var tau = 2; tau < M; tau++) {
        var err_tau_x = 0;
        for (n = 1; n < M; n++) {
            err_tau_x += Math.abs(sub_arr[n] - sub_arr[n + tau]);
        }
        if (err_tau_x < err_tau_1) {
            var f0 = sampleRate / (tau + (err_tau_x / err_tau_1));
            return f0;
        }
    }
    return -0;
}

function xtract_failsafe_f0(timeArray, sampleRate) {
    return xtract_f0(timeArray, sampleRate);
}

function xtract_wavelet_f0(timeArray, sampleRate, pitchtracker) {
    if (pitchtracker === undefined) {
        console.error("xtract_wavelet_f0 requires pitchtracker to be defined");
        return null;
    }
    if (xtract_array_sum(timeArray) === 0) {
        return;
    }

    function _power2p(value) {
        if (value === 0) {
            return 1;
        }
        if (value === 2) {
            return 1;
        }
        if (value & 0x1) {
            return 0;
        }
        return (_power2p(value >> 1));
    }

    function _bitcount(value) {
        if (value === 0) {
            return 0;
        }
        if (value === 1) {
            return 1;
        }
        if (value === 2) {
            return 2;
        }
        return _bitcount(value >> 1) + 1;
    }

    function _ceil_power2(value) {
        if (_power2p(value)) {
            return value;
        }

        if (value === 1) {
            return 2;
        }
        var j, i = _bitcount(value);
        var res = 1;
        for (j = 0; j < i; j++) {
            res <<= 1;
        }
        return res;
    }

    function _floor_power2(value) {
        if (_power2p(value)) {
            return value;
        }
        return _ceil_power2(value) / 2;
    }

    function _iabs(x) {
        if (x >= 0) return x;
        return -x;
    }

    function _2power(i) {
        var res = 1,
            j;
        for (j = 0; j < i; j++) {
            res <<= 1;
        }
        return res;
    }

    function dywapitch_neededsamplecount(minFreq) {
        var nbSam = 3 * 44100 / minFreq; // 1017. for 130 Hz
        nbSam = _ceil_power2(nbSam); // 1024
        return nbSam;
    }

    var _minmax = {
        index: undefined,
        next: undefined
    };
    //_dywapitch_computeWaveletPitch(samples, startsample, samplecount)
    var samples = timeArray,
        startsample = 0,
        samplecount = timeArray.length;
    var pitchF = 0.0;
    var i, j, si, si1;

    samplecount = _floor_power2(samplecount);
    var sam = new Float64Array(samplecount);
    for (i = 0; i < samplecount; i++) {
        sam[i] = samples[i];
    }

    var curSamNb = samplecount;

    var distances = new Int32Array(samplecount);
    var mins = new Int32Array(samplecount);
    var maxs = new Int32Array(samplecount);
    var nbMins, nbMaxs;

    var maxFLWTlevels = 6;
    var maxF = 3000;
    var differenceLevelsN = 3;
    var maximaThresholdRatio = 0.75;

    var ampltitudeThreshold;
    var theDC = 0.0;
    var maxValue = 0.0;
    var minValue = 0.0;
    for (i = 0; i < samplecount; i++) {
        si = sam[i];
        theDC = theDC + si;
        if (si > maxValue) {
            maxValue = si;
        }
        if (si < minValue) {
            minValue = si;
        }
    }
    theDC = theDC / samplecount;
    maxValue = maxValue - theDC;
    minValue = minValue - theDC;
    var amplitudeMax = (maxValue > -minValue ? maxValue : -minValue);

    ampltitudeThreshold = amplitudeMax * maximaThresholdRatio;

    var curLevel = 0;
    var curModeDistance = -1;
    var delta;

    var cont = true;

    while (cont) {
        delta = Math.floor(44100 / (_2power(curLevel) * maxF));
        if (curSamNb < 2) {
            cont = false;
            break;
        }

        var dv, previousDV = -1000;
        nbMins = nbMaxs = 0;
        var lastMinIndex = -1000000;
        var lastmaxIndex = -1000000;
        var findMax = 0;
        var findMin = 0;

        for (i = 2; i < curSamNb; i++) {
            si = sam[i] - theDC;
            si1 = sam[i - 1] - theDC;

            if (si1 <= 0 && si > 0) {
                findMax = 1;
            }
            if (si1 >= 0 && si < 0) {
                findMin = 1;
            }

            // min or max ?
            dv = si - si1;

            if (previousDV > -1000) {

                if (findMin && previousDV < 0 && dv >= 0) {
                    // minimum
                    if (Math.abs(si) >= ampltitudeThreshold) {
                        if (i > lastMinIndex + delta) {
                            mins[nbMins++] = i;
                            lastMinIndex = i;
                            findMin = 0;
                        }
                    }
                }

                if (findMax && previousDV > 0 && dv <= 0) {
                    // maximum
                    if (Math.abs(si) >= ampltitudeThreshold) {
                        if (i > lastmaxIndex + delta) {
                            maxs[nbMaxs++] = i;
                            lastmaxIndex = i;
                            findMax = 0;
                        }
                    }
                }
            }

            previousDV = dv;
        }

        if (nbMins === 0 && nbMaxs === 0) {
            cont = false;
            break;
        }

        var d;
        //memset(distances, 0, samplecount*sizeof(int));
        for (i = 0; i < samplecount; i++) {
            distances[i] = 0.0;
        }
        for (i = 0; i < nbMins; i++) {
            for (j = 1; j < differenceLevelsN; j++) {
                if (i + j < nbMins) {
                    d = _iabs(mins[i] - mins[i + j]);
                    distances[d] = distances[d] + 1;
                }
            }
        }
        for (i = 0; i < nbMaxs; i++) {
            for (j = 1; j < differenceLevelsN; j++) {
                if (i + j < nbMaxs) {
                    d = _iabs(maxs[i] - maxs[i + j]);
                    //asLog("dywapitch i=%ld j=%ld d=%ld\n", i, j, d);
                    distances[d] = distances[d] + 1;
                }
            }
        }

        var bestDistance = -1;
        var bestValue = -1;
        for (i = 0; i < curSamNb; i++) {
            var summed = 0;
            for (j = -delta; j <= delta; j++) {
                if (i + j >= 0 && i + j < curSamNb)
                    summed += distances[i + j];
            }
            //asLog("dywapitch i=%ld summed=%ld bestDistance=%ld\n", i, summed, bestDistance);
            if (summed === bestValue) {
                if (i === 2 * bestDistance)
                    bestDistance = i;

            } else if (summed > bestValue) {
                bestValue = summed;
                bestDistance = i;
            }
        }

        var distAvg = 0.0;
        var nbDists = 0;
        for (j = -delta; j <= delta; j++) {
            if (bestDistance + j >= 0 && bestDistance + j < samplecount) {
                var nbDist = distances[bestDistance + j];
                if (nbDist > 0) {
                    nbDists += nbDist;
                    distAvg += (bestDistance + j) * nbDist;
                }
            }
        }
        // this is our mode distance !
        distAvg /= nbDists;

        // continue the levels ?
        if (curModeDistance > -1.0) {
            var similarity = Math.abs(distAvg * 2 - curModeDistance);
            if (similarity <= 2 * delta) {
                //if DEBUGG then put "similarity="&similarity&&"delta="&delta&&"ok"
                //asLog("dywapitch similarity=%f OK !\n", similarity);
                // two consecutive similar mode distances : ok !
                pitchF = 44100 / (_2power(curLevel - 1) * curModeDistance);
                cont = false;
                break;
            }
            //if DEBUGG then put "similarity="&similarity&&"delta="&delta&&"not"
        }

        // not similar, continue next level
        curModeDistance = distAvg;

        curLevel = curLevel + 1;
        if (curLevel >= maxFLWTlevels) {
            // put "max levels reached, exiting"
            //asLog("dywapitch max levels reached, exiting\n");
            cont = false;
            break;
        }

        // downsample
        if (curSamNb < 2) {
            //asLog("dywapitch not enough samples, exiting\n");
            cont = false;
            break;
        }
        for (i = 0; i < curSamNb / 2; i++) {
            sam[i] = (sam[2 * i] + sam[2 * i + 1]) / 2.0;
        }
        curSamNb /= 2;
    }

    //_dywapitch_dynamicprocess(pitchtracker, pitch)
    return (function (pitchtracker, pitch) {
        if (pitch === 0.0) {
            return -1.0;
        }

        var estimatedPitch = -1,
            acceptedError = 0.2,
            maxConfidence = 5;
        if (pitch !== -1) {
            // I have a pitch here

            if (pitchtracker._prevPitch === -1) {
                // no Previous
                estimatedPitch = pitch;
                pitchtracker._prevPitch = pitch;
                pitchtracker._pitchConfidence = 1;
            } else if (Math.abs(pitchtracker._prevPitch - pitch) / pitch < acceptedError) {
                // similar: remember and increment
                pitchtracker._prevPitch = pitch;
                estimatedPitch = pitch;
                pitchtracker._pitchConfidence = Math.min(maxConfidence, pitchtracker._pitchConfidence + 1);
            } else if ((pitchtracker._pitchConfidence >= maxConfidence - 2) && Math.abs(pitchtracker._pitchConfidence - 2 * pitch) / (2 * pitch) < acceptedError) {
                // close to half the last pitch, which is trusted
                estimatedPitch = 2 * pitch;
                pitchtracker._prevPitch = estimatedPitch;
            } else if ((pitchtracker._pitchConfidence >= maxConfidence - 2) && Math.abs(pitchtracker._pitchConfidence - 0.5 * pitch) / (0.5 * pitch) < acceptedError) {
                estimatedPitch = 0.5 * pitch;
                pitchtracker._prevPitch = estimatedPitch;
            } else {
                // Very different value
                if (pitchtracker._pitchConfidence >= 1) {
                    // previous trusted
                    estimatedPitch = pitchtracker._prevPitch;
                    pitchtracker._pitchConfidence = Math.max(0, pitchtracker._pitchConfidence - 1);
                } else {
                    estimatedPitch = pitch;
                    pitchtracker._prevPitch = pitch;
                    pitchtracker._pitchConfidence = 1;
                }
            }
        } else {
            // No pitch
            if (pitchtracker._prevPitch !== -1) {
                // was a pitch before
                if (pitchtracker._pitchConfidence >= 1) {
                    // previous trusted
                    estimatedPitch = pitchtracker._prevPitch;
                    pitchtracker._pitchConfidence = Math.max(0, pitchtracker._pitchConfidence - 1);
                } else {
                    pitchtracker._prevPitch = -1;
                    estimatedPitch = -1;
                    pitchtracker._pitchConfidence = 0;
                }
            }
        }

        if (pitchtracker._pitchConfidence >= 1) {
            pitch = estimatedPitch;
        } else {
            pitch = -1;
        }
        if (pitch === -1) {
            pitch = 0.0;
        }
        return pitch;
    })(pitchtracker, pitchF);
}

function xtract_midicent(f0) {
    var note = 0.0;
    note = 69 + Math.log(f0 / 440.0) * 17.31234;
    note *= 100;
    note = Math.round(0.5 + note);
    return note;
}

function xtract_spectral_fundamental(spectrum, sample_rate) {
    // Based on work by Motegi and Shimamura

    function peak_picking(E, window) {
        var o = [],
            N = E.length,
            n;
        if (window === undefined) {
            window = 5;
        }
        for (n = window; n < N - window - 1; n++) {
            var max = 1,
                m;
            for (m = -window; m < window - 1; m++) {
                if (E[n + m] > E[n]) {
                    max = 0;
                    break;
                }
            }
            if (max === 1) {
                o.push(n);
            }
        }
        return o;
    }

    var N = spectrum.length >> 1;
    var amps = spectrum.subarray(0, N);
    var freqs = spectrum.subarray(N);
    var K = N * 2;

    // Create the power spectrum
    var power = new Float64Array(K);
    var n;
    for (n = 0; n < N; n++) {
        power[n] = Math.pow(amps[n], 2);
        power[K - 1 - n] = power[n];
    }

    // Perform autocorrelation using IFFT
    var R = new Float64Array(K);
    inverseTransform(power, R);
    R = undefined;
    R = power;
    power = undefined;

    // Get the peaks
    var p = peak_picking(R, 5);
    if (p.length === 0) {
        return 0;
    }
    p = p[0];

    p = p / sample_rate;
    p = 1 / p;
    return p;
}

/* Vector.c */

function xtract_energy(array, sample_rate, window_ms) {
    if (typeof sample_rate !== "number") {
        console.error("xtract_energy requires sample_rate to be defined");
        return;
    }
    if (typeof window_ms !== "number") {
        window_ms = 100;
    }
    if (window_ms <= 0) {
        window_ms = 100;
    }
    var N = array.length;
    var L = Math.floor(sample_rate * (window_ms / 1000.0));
    var K = Math.ceil(N / L);
    var result = new Float64Array(K);
    for (var k = 0; k < K; k++) {
        var frame = array.subarray(k * L, k * L + L);
        var rms = xtract_rms_amplitude(frame);
        result[k] = rms;
    }
    return result;
}

function xtract_spectrum(array, sample_rate, withDC, normalise) {
    if (typeof sample_rate !== "number") {
        console.error("Sample Rate must be defined");
        return null;
    }
    if (withDC === undefined) {
        withDC = false;
    }
    if (normalise === undefined) {
        normalise = false;
    }
    var N = array.length;
    var result, align = 0;
    var amps;
    var freqs;
    if (withDC) {
        result = new Float64Array(N + 2);
    } else {
        align = 1;
        result = new Float64Array(N);
    }
    amps = result.subarray(0, result.length / 2);
    freqs = result.subarray(result.length / 2);
    var reals = new Float64Array(N);
    var imags = new Float64Array(N);
    for (var i = 0; i < N; i++) {
        reals[i] = array[i];
    }
    transform(reals, imags);
    for (var k = align; k < result.length / 2; k++) {
        amps[k - align] = Math.sqrt((reals[k] * reals[k]) + (imags[k] * imags[k])) / array.length;
        freqs[k - align] = (2 * k / N) * (sample_rate / 2);
    }
    if (normalise) {
        var max = xtract_array_max(amps);
        for (var n = 0; n < amps.length; n++) {
            amps[n] /= max;
        }
    }
    return result;
}

function xtract_complex_spectrum(array, sample_rate, withDC) {
    if (typeof sample_rate !== "number") {
        console.error("Sample Rate must be defined");
        return null;
    }
    if (withDC === undefined) {
        withDC = false;
    }
    var N = array.length;
    var result, align = 0,
        amps, freqs;
    if (withDC) {
        result = new Float64Array(3 * (N / 2 + 1));
    } else {
        align = 1;
        result = new Float64Array(3 * (N / 2));
    }
    amps = result.subarray(0, 2 * (result.length / 3));
    freqs = result.subarray(2 * (result.length / 3));
    var reals = new Float64Array(N);
    var imags = new Float64Array(N);
    for (var i = 0; i < N; i++) {
        reals[i] = array[i];
    }
    transform(reals, imags);
    for (var k = align; k < reals.length / 2 + 1; k++) {
        amps[(k - align) * 2] = reals[k];
        amps[(k - align) * 2 + 1] = imags[k];
        freqs[k - align] = (2 * k / N) * (sample_rate / 2);
    }
    return result;
}

function xtract_mfcc(spectrum, mfcc) {
    if (typeof mfcc !== "object") {
        console.error("Invalid MFCC, must be MFCC object built using xtract_init_mfcc");
        return null;
    }
    if (mfcc.n_filters === 0) {
        console.error("Invalid MFCC, object must be built using xtract_init_mfcc");
        return null;
    }
    var K = spectrum.length >> 1;
    if (mfcc.filters[0].length !== K) {
        console.error("Lengths do not match");
        return null;
    }
    var result = new Float64Array(mfcc.n_filters);
    for (var f = 0; f < mfcc.n_filters; f++) {
        result[f] = 0.0;
        var filter = mfcc.filters[f];
        for (var n = 0; n < filter.length; n++) {
            result[f] += spectrum[n] * filter[n];
        }
        if (result[f] < 2e-42) {
            result[f] = 2e-42;
        }
        result[f] = Math.log(result[f]);
    }
    return xtract_dct(result);
}

function xtract_dct(array) {
    var N = array.length;
    var result = new Float64Array(N);
    for (var n = 0; n < N; n++) {
        var nN = n / N;
        for (var m = 0; m < N; m++) {
            result[n] += array[m] * Math.cos(Math.PI * nN * (m + 0.5));
        }
    }
    return result;
}

function xtract_dct_2(array, dct) {
    var N = array.length;
    if (dct === undefined) {
        dct = xtract_init_dct(N);
    }
    var result = new Float64Array(N);
    result[0] = xtract_array_sum(array);
    for (var k = 1; k < N; k++) {
        for (var n = 0; n < N; n++) {
            result[k] += array[n] * dct.wt[k][n];
        }
    }
    return result;
}

function xtract_autocorrelation(array) {
    var n = array.length;
    var result = new Float64Array(n);
    while (n--) {
        var corr = 0;
        for (var i = 0; i < array.length - n; i++) {
            corr += array[i] * array[i + n];
        }
        result[n] = corr / array.length;
    }
    return result;
}

function xtract_amdf(array) {
    var n = array.length;
    var result = new Float64Array(n);
    while (n--) {
        var md = 0.0;
        for (var i = 0; i < array.length - n; i++) {
            md += Math.abs(array[i] - array[i + n]);
        }
        result[n] = md / array.length;
    }
    return result;
}

function xtract_asdf(array) {
    var n = array.length;
    var result = new Float64Array(n);
    while (n--) {
        var sd = 0.0;
        for (var i = 0; i < array.length - n; i++) {
            sd += Math.pow(array[i] - array[i + n], 2);
        }
        result[n] = sd / array.length;
    }
    return result;
}

function xtract_bark_coefficients(spectrum, bark_limits) {
    if (bark_limits === undefined) {
        console.error("xtract_bark_coefficients requires compute limits from xtract_init_bark");
        return null;
    }
    var N = spectrum.length >> 1;
    var bands = bark_limits.length;
    var results = new Float64Array(bands);
    for (var band = 0; band < bands - 1; band++) {
        results[band] = 0.0;
        for (var n = bark_limits[band]; n < bark_limits[band + 1]; n++) {
            results[band] += spectrum[n];
        }
    }
    return results;
}

function xtract_peak_spectrum(spectrum, q, threshold) {
    var N = spectrum.length;
    var K = N >> 1;
    var max = 0.0,
        y = 0.0,
        y2 = 0.0,
        y3 = 0.0,
        p = 0.0;
    if (typeof q !== "number") {
        console.error("xtract_peak_spectrum requires second argument to be sample_rate/N");
    }
    if (threshold < 0 || threshold > 100) {
        threshold = 0;
        console.log("peak_spectrum threshold must be between 0 and 100");
    }
    var result = new Float64Array(N);
    var ampsIn = spectrum.subarray(0, K);
    var freqsIn = spectrum.subarray(K);
    var ampsOut = result.subarray(0, K);
    var freqsOut = result.subarray(K);
    max = xtract_array_max(ampsIn);
    threshold *= 0.01 * max;
    for (var n = 1; n < N - 1; n++) {
        if (ampsIn[n] >= threshold) {
            if (ampsIn[n] > ampsIn[n - 1] && ampsIn[n] > ampsIn[n + 1]) {
                y = ampsIn[n - 1];
                y2 = ampsIn[n];
                y3 = ampsIn[n + 1];
                p = 0.5 * (y - y3) / (ampsIn[n - 1] - 2 * (y2 + ampsIn[n + 1]));
                freqsOut[n] = q * (n + 1 + p);
                ampsOut[n] = y2 - 0.25 * (y - y3) * p;
            } else {
                ampsOut[n] = 0;
                freqsOut[n] = 0;
            }
        } else {
            ampsOut[n] = 0;
            freqsOut[n] = 0;
        }
    }
    return result;
}

function xtract_harmonic_spectrum(peakSpectrum, f0, threshold) {
    var N = peakSpectrum.length;
    var K = N >> 1;
    var result = new Float64Array(N);
    var ampsIn = peakSpectrum.subarray(0, K);
    var freqsIn = peakSpectrum.subarray(K);
    var ampsOut = result.subarray(0, K);
    var freqsOut = result.subarray(K);
    var n = K;
    if (f0 === undefined || threshold === undefined) {
        console.error("harmonic_spectrum requires f0 and threshold to be numbers and defined");
        return null;
    }
    if (threshold > 1) {
        threshold /= 100.0;
        console.log("harmonic_spectrum assuming integer for threshold inserted, operating at t=" + threshold);
    }
    while (n--) {
        if (freqsIn[n] !== 0.0) {
            var ratio = freqsIn[n] / f0;
            var nearest = Math.round(ratio);
            var distance = Math.abs(nearest - ratio);
            if (distance > threshold) {
                ampsOut[n] = 0.0;
                freqsOut[n] = 0.0;
            } else {
                ampsOut[n] = ampsIn[n];
                freqsOut[n] = freqsIn[n];
            }
        } else {
            result[n] = 0.0;
            freqsOut[n] = 0.0;
        }
    }
    return result;
}

function xtract_lpc(autocorr) {
    var i, j, r, error = autocorr[0];
    var N = autocorr.length;
    var L = N - 1;
    var lpc = new Float64Array(L);
    var ref = new Float64Array(L);
    if (error === 0.0) {
        return lpc;
    }

    for (i = 0; i < L; i++) {
        r = -autocorr[i + 1];
        for (j = 0; j < i; j++) {
            r -= lpc[j] * autocorr[i - j];
        }
        r /= error;
        ref[i] = r;

        lpc[i] = r;
        for (j = 0; j < (i >> 1); j++) {
            var tmp = lpc[j];
            lpc[j] += r * lpc[i - 1 - j];
            lpc[i - 1 - j] += r * tmp;
        }
        if (i % 2) {
            lpc[j] += lpc[j] * r;
        }
        error *= 1.0 - r * r;
    }
    return lpc;
}

function xtract_lpcc(lpc, Q) {
    var N = lpc.length;
    var n, k, sum, order = N - 1,
        cep_length;
    if (typeof Q !== "number") {
        Q = N - 1;
    }
    cep_length = Q;

    var result = new Float64Array(cep_length);
    for (n = 1; n < Q && n < cep_length; n++) {
        sum = 0;
        for (k = 1; k < n; k++) {
            sum += k * result[k - 1] * lpc[n - k];
        }
        result[n - 1] = lpc[n] + sum / n;
    }

    for (n = order + 1; n <= cep_length; n++) {
        sum = 0.0;
        for (k = n - (order - 1); k < n; k++) {
            sum += k * result[k - 1] * lpc[n - k];
        }
        result[n - 1] = sum / n;
    }
    return result;
}

function xtract_pcp(spectrum, M, fs) {
    var N = spectrum.length >> 1;
    if (typeof M !== "object") {
        if (typeof fs !== "number" || fs <= 0.0) {
            console.error("Cannot dynamically compute M if fs is undefined / not a valid sample rate");
            return [];
        }
        M = xtract_init_pcp(N, fs);
    }
    var amps = spectrum.subarray(1, N);
    var PCP = new Float64Array(12);
    for (var l = 0; l < amps.length; l++) {
        var p = M[l];
        PCP[l] += Math.pow(Math.abs(amps[l]), 2);
    }
    return PCP;
}

function xtract_yin(array) {
    // Uses the YIN process
    var T = array.length;
    var d = new Float64Array(array.length);
    var r = new array.constructor(array.length);

    var d_sigma = 0;
    for (var tau = 1; tau < T; tau++) {
        var sigma = 0;
        for (var t = 1; t < T - tau; t++) {
            sigma += Math.pow(array[t] - array[t + tau], 2);
        }
        d[tau] = sigma;
        d_sigma += sigma;
        r[tau] = d[tau] / ((1 / tau) * d_sigma);
    }
    return r;
}

function xtract_onset(timeData, frameSize) {
    if (timeData === undefined || frameSize === undefined) {
        console.error("All arguments for xtract_onset must be defined: xtract_onset(timeData, frameSize)");
    }

    var frames = timeData.xtract_get_data_frames(frameSize, frameSize, false);
    var N = frames.length;
    var X = [];
    var real = new Float64Array(frameSize);
    var imag = new Float64Array(frameSize);
    var K = frameSize / 2 + 1;
    var n;
    for (var i = 0; i < N; i++) {
        for (n = 0; n < frameSize; n++) {
            real[n] = frames[i][n];
            imag[n] = 0.0;
        }
        transform(real, imag);
        X[i] = xtract_array_interlace([real.subarray(0, K), imag.subarray(0, K)]);
    }

    function angle(real, imag) {
        if (imag === undefined && real.length === 2) {
            return Math.atan2(real[1], real[0]);
        }
        return Math.atan2(imag, real);
    }

    function abs(real, imag) {
        if (imag === undefined && real.length === 2) {
            return Math.sqrt(Math.pow(real[0], 2) + Math.pow(real[1], 2));
        }
        return Math.sqrt(Math.pow(real, 2) + Math.pow(imag, 2));
    }

    function princarg(phaseIn) {
        //phase=mod(phasein+pi,-2*pi)+pi;
        return (phaseIn + Math.PI) % (-2 * Math.PI) + Math.PI;
    }

    function complex_mul(cplx_pair_A, cplx_pair_B) {
        if (cplx_pair_A.length !== 2 || cplx_pair_B.length !== 2) {
            console.error("Both arguments must be numeral arrays of length 2");
        }
        var result = new cplx_pair_A.constructor(2);
        result[0] = cplx_pair_A[0] * cplx_pair_B[0] - cplx_pair_A[1] * cplx_pair_B[1];
        result[1] = cplx_pair_A[0] * cplx_pair_B[1] + cplx_pair_A[1] * cplx_pair_B[0];
        return result;
    }

    var E = new timeData.constructor(N);
    for (var k = 0; k < K; k++) {
        var phase_prev = angle(X[0].subarray(2 * k, 2 * k + 2));
        var phase_delta = angle(X[0].subarray(2 * k, 2 * k + 2));
        for (n = 1; n < N; n++) {
            var phi = princarg(phase_prev + phase_delta);
            var exp = [Math.cos(phi), Math.sin(phi)];
            var XT = complex_mul(X[n].subarray(2 * k, 2 * k + 2), exp);
            XT[0] = X[n][2 * k] - XT[0];
            XT[1] = X[n][2 * k + 1] - XT[1];
            E[n] += abs(XT);
            var phase_now = angle(X[n].subarray(2 * k, 2 * k + 2));
            phase_delta = phase_now - phase_prev;
            phase_prev = phase_now;
        }
    }

    for (n = 0; n < N; n++) {
        E[n] /= frameSize;
    }
    return E;
}

function xtract_resample(data, p, q, n) {
    // Same function call as matlab:
    // data is the array
    // p is the target sample rate
    // q is the source sample rate
    // n is the desired filter order, n==1024 if undefined

    function filter(N, c) {
        var c_b, Re, Im, b;
        c_b = Math.floor(c * N);
        Re = new Float64Array(N);
        Im = new Float64Array(N);
        var i, j;
        for (i = 0; i < c_b; i++) {
            Re[i] = 1;
        }
        for (i = N - c_b + 1; i < N; i++) {
            Re[i] = 1;
        }
        inverseTransform(Re, Im);
        // Scale and shift into Im
        for (i = 0; i < N; i++) {
            j = (i + (N >> 1)) % N;
            Im[i] = Re[j] / N;
            // Apply compute blackman-harris to Im
            var rad = (Math.PI * i) / (N);
            Im[i] *= 0.35875 - 0.48829 * Math.cos(2 * rad) + 0.14128 * Math.cos(4 * rad) - 0.01168 * Math.cos(6 * rad);
        }
        return Im;
    }

    function polyn(data, K) {
        var N = data.length;
        var x = [0, data[0], data[1]];
        var dst = new Float64Array(K);
        var ratio = K / N;
        var tinc = 1 / ratio;
        var n = 0,
            t = 0,
            k;
        for (k = 0; k < K; k++) {
            if (t === n) {
                // Points lie on same time
                dst[k] = data[n];
            } else {
                var y = (t - n - 1) * (t - n) * x[0] - 2 * (t - n - 1) * (t - n + 1) * x[1] + (t - n) * (t - n + 1) * x[2];
                dst[k] = y / 2;
            }
            t += tinc;
            if (t >= n + 1) {
                n = Math.floor(t);
                x[0] = data[n - 1];
                x[1] = data[n];
                if (n + 1 < N) {
                    x[2] = data[n + 1];
                } else {
                    x[2] = 0.0;
                }
            }
        }
        return dst;
    }

    function zp(a) {
        var b = new Float64Array(a.length * 2);
        for (var n = 0; n < a.length; n++) {
            b[n] = a[n];
        }
        return b;
    }

    function overlap(X, b) {
        var i, f;
        var Y = new Float64Array(X.length);
        var N = b.length;
        var N2 = 2 * N;
        var B = {
            real: zp(b),
            imag: new Float64Array(N * 2)
        };
        transform(B.real, B.imag);
        var Xi = X.xtract_get_data_frames(N, N, false);
        var Yi = Y.xtract_get_data_frames(N, N, false);
        var x_last = new Float64Array(N);
        var y_last = new Float64Array(N);
        var w = new Float64Array(N2);
        for (i = 0; i < N2; i++) {
            var rad = (Math.PI * i) / (N2);
            w[i] = 0.35875 - 0.48829 * Math.cos(2 * rad) + 0.14128 * Math.cos(4 * rad) - 0.01168 * Math.cos(6 * rad);
        }
        var xF = {
            real: new Float64Array(N2),
            imag: new Float64Array(N2)
        };
        var yF = {
            real: new Float64Array(N2),
            imag: new Float64Array(N2)
        };
        for (f = 0; f < Xi.length; f++) {
            for (i = 0; i < N; i++) {
                xF.real[i] = x_last[i] * w[i];
                xF.real[i + N] = Xi[f][i] * w[i + N];
                x_last[i] = Xi[f][i];
                xF.imag[i] = 0;
                xF.imag[i + N] = 0;
            }
            transform(xF.real, xF.imag);
            for (i = 0; i < N2; i++) {
                yF.real[i] = xF.real[i] * B.real[i] - xF.imag[i] * B.imag[i];
                yF.imag[i] = xF.imag[i] * B.real[i] + xF.real[i] * B.imag[i];
            }
            transform(yF.imag, yF.real);
            // Perform fft_shift and scale
            for (i = 0; i < N; i++) {
                var h = yF.real[i + N] / N;
                yF.real[i + N] = yF.real[i] / N;
                yF.real[i] = h;
            }
            for (i = 0; i < N; i++) {
                Yi[f][i] = (yF.real[i] + y_last[i]);
                y_last[i] = yF.real[i + N];
            }
        }
        return Y;
    }

    // Determine which way to go
    var b, N = data.length;
    if (typeof n !== "number" || n <= 0) {
        n = 512;
    }
    if (p === q) {
        return data;
    }
    var ratio = (p / q);
    var K = Math.floor(N * ratio);
    var dst;
    if (p > q) {
        // Upsampling
        // 1. Expand Data range
        dst = polyn(data, K);
        // 2. Filter out spurious energy above q
        b = filter(n, 1 / ratio);
        overlap(data, b);
    } else {
        // Downsampling
        // 1. Filter out energy above p
        b = filter(n, ratio / 2);
        var ds1 = overlap(data, b);
        // 2. Decrease data range
        dst = polyn(ds1, K);
    }
    return dst;
}

function xtract_init_dft(N) {
    var dft = {
        N: N / 2 + 1,
        real: [],
        imag: []
    };
    var power_const = -2.0 * Math.PI / N;
    for (var k = 0; k < dft.N; k++) {
        var power_k = power_const * k;
        dft.real[k] = new Float64Array(N);
        dft.imag[k] = new Float64Array(N);
        for (var n = 0; n < N; n++) {
            var power = power_k * n;
            dft.real[k][n] = Math.cos(power);
            dft.imag[k][n] = Math.sin(power);
        }
    }
    return dft;
}

function xtract_init_dct(N) {
    var dct = {
        N: N,
        wt: []
    };
    for (var k = 0; k < N; k++) {
        dct.wt[k] = new Float64Array(N);
        for (var n = 0; n < N; n++) {
            dct.wt[k][n] = Math.cos(Math.PI * k * (n + 0.5) / N);
        }
    }
    return dct;
}

function xtract_init_mfcc(N, nyquist, style, freq_min, freq_max, freq_bands) {
    var mfcc = {
        n_filters: freq_bands,
        filters: []
    };
    var norm = 1,
        M = N / 2,
        height, norm_fact, n;

    if (freq_bands <= 1) {
        return null;
    }
    var mel_freq_max = 1127 * Math.log(1 + freq_max / 700);
    var mel_freq_min = 1127 * Math.log(1 + freq_min / 700);
    var freq_bw_mel = (mel_freq_max - mel_freq_min) / freq_bands;

    var mel_peak = new Float64Array(freq_bands + 2);
    var lin_peak = new Float64Array(freq_bands + 2);
    var fft_peak = new Float64Array(freq_bands + 2);
    var height_norm = new Float64Array(freq_bands);
    mel_peak[0] = mel_freq_min;
    lin_peak[0] = freq_min;
    fft_peak[0] = Math.floor(lin_peak[0] / nyquist * M);

    for (n = 1; n < (freq_bands + 2); ++n) {
        //roll out peak locations - mel, linear and linear on fft window scale
        mel_peak[n] = mel_peak[n - 1] + freq_bw_mel;
        lin_peak[n] = 700 * (Math.exp(mel_peak[n] / 1127) - 1);
        fft_peak[n] = Math.floor(lin_peak[n] / nyquist * M);
    }

    for (n = 0; n < freq_bands; n++) {
        //roll out normalised gain of each peak
        if (style === "XTRACT_EQUAL_GAIN") {
            height = 1;
            norm_fact = norm;
        } else {
            height = 2 / (lin_peak[n + 2] - lin_peak[n]);
            norm_fact = norm / (2 / (lin_peak[2] - lin_peak[0]));
        }
        height_norm[n] = height * norm_fact;
    }

    var i = 0,
        inc;
    var next_peak;
    for (n = 0; n < freq_bands; n++) {
        // calculate the rise increment
        if (n === 0) {
            inc = height_norm[n] / fft_peak[n];
        } else {
            inc = height_norm[n] / (fft_peak[n] - fft_peak[n - 1]);
        }
        var val = 0;
        // Create array
        mfcc.filters[n] = new Float64Array(N);
        // fill in the rise
        for (; i <= fft_peak[n]; i++) {
            mfcc.filters[n][i] = val;
            val += inc;
        }
        // calculate the fall increment
        inc = height_norm[n] / (fft_peak[n + 1] - fft_peak[n]);

        val = 0;
        next_peak = fft_peak[n + 1];

        // reverse fill the 'fall'
        for (i = Math.floor(next_peak); i > fft_peak[n]; i--) {
            mfcc.filters[n][i] = val;
            val += inc;
        }
    }
    return mfcc;
}

function xtract_init_wavelet() {
    return {
        _prevPitch: -1,
        _pitchConfidence: -1
    };
}

function xtract_init_pcp(N, fs, f_ref) {
    if (typeof fs !== "number" || typeof N !== "number") {
        console.error('The Sample Rate and sample count have to be defined: xtract_init_pcp(N, fs, f_ref)');
    }
    if (N <= 0 || N !== Math.floor(N)) {
        console.error("The sample count, N, must be a positive integer: xtract_init_pcp(N, fs, f_ref)");
    }
    if (fs <= 0.0) {
        console.error('The Sample Rate must be a positive number: xtract_init_pcp(N, fs, f_ref)');
    }
    if (typeof f_ref !== "number" || f_ref <= 0.0 || f_ref >= fs / 2) {
        console.log("Assuming f_ref to be 48.9994294977Hz");
        f_ref = 48.9994294977;
    }

    var M = new Float64Array(N - 1);
    var fs2 = fs / 2;
    for (var l = 1; l < N; l++) {
        var f = (2 * l / N) * fs2;
        M[l - 1] = Math.round(12 * Math.log2((f / N) * f_ref)) % 12;
    }
    return M;
}

function xtract_init_bark(N, sampleRate, bands) {
    if (typeof bands !== "number" || bands < 0 || bands > 26) {
        bands = 26;
    }
    var edges = [0, 100, 200, 300, 400, 510, 630, 770, 920, 1080, 1270, 1480, 1720, 2000, 2320, 2700, 3150, 3700, 4400, 5300, 6400, 7700, 9500, 12000, 15500, 20500, 27000];
    var band_limits = new Int32Array(bands);
    while (bands--) {
        band_limits[bands] = (edges[bands] / sampleRate) * N;
    }
    return band_limits;
}

/* 
 * Free FFT and convolution (JavaScript)
 * 
 * Copyright (c) 2014 Project Nayuki
 * https://www.nayuki.io/page/free-small-fft-in-multiple-languages
 * 
 * (MIT License)
 * Permission is hereby granted, free of charge, to any person obtaining a copy of
 * this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to
 * use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
 * the Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 * - The above copyright notice and this permission notice shall be included in
 *   all copies or substantial portions of the Software.
 * - The Software is provided "as is", without warranty of any kind, express or
 *   implied, including but not limited to the warranties of merchantability,
 *   fitness for a particular purpose and noninfringement. In no event shall the
 *   authors or copyright holders be liable for any claim, damages or other
 *   liability, whether in an action of contract, tort or otherwise, arising from,
 *   out of or in connection with the Software or the use or other dealings in the
 *   Software.
 */


/* 
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function.
 */
function transform(real, imag) {
    if (real.length !== imag.length)
        throw "Mismatched lengths";

    var n = real.length;
    if (n === 0)
        return;
    else if ((n & (n - 1)) === 0) // Is power of 2
        transformRadix2(real, imag);
    else // More complicated algorithm for arbitrary sizes
        transformBluestein(real, imag);
}


/* 
 * Computes the inverse discrete Fourier transform (IDFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This is a wrapper function. This transform does not perform scaling, so the inverse is not a true inverse.
 */
function inverseTransform(real, imag) {
    transform(imag, real);
}


/* 
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector's length must be a power of 2. Uses the Cooley-Tukey decimation-in-time radix-2 algorithm.
 */
function transformRadix2(real, imag) {
    // Initialization
    var i, j, k;
    if (real.length !== imag.length)
        throw "Mismatched lengths";
    var n = real.length;
    if (n === 1) // Trivial transform
        return;
    var levels = -1;
    for (i = 0; i < 32; i++) {
        if (1 << i === n)
            levels = i; // Equal to log2(n)
    }
    if (levels === -1)
        throw "Length is not a power of 2";
    var cosTable = new Array(n / 2);
    var sinTable = new Array(n / 2);
    for (i = 0; i < n / 2; i++) {
        cosTable[i] = Math.cos(2 * Math.PI * i / n);
        sinTable[i] = Math.sin(2 * Math.PI * i / n);
    }

    // Bit-reversed addressing permutation
    for (i = 0; i < n; i++) {
        j = reverseBits(i, levels);
        if (j > i) {
            var temp = real[i];
            real[i] = real[j];
            real[j] = temp;
            temp = imag[i];
            imag[i] = imag[j];
            imag[j] = temp;
        }
    }

    // Cooley-Tukey decimation-in-time radix-2 FFT
    for (var size = 2; size <= n; size *= 2) {
        var halfsize = size / 2;
        var tablestep = n / size;
        for (i = 0; i < n; i += size) {
            for (j = i, k = 0; j < i + halfsize; j++, k += tablestep) {
                var tpre = real[j + halfsize] * cosTable[k] + imag[j + halfsize] * sinTable[k];
                var tpim = -real[j + halfsize] * sinTable[k] + imag[j + halfsize] * cosTable[k];
                real[j + halfsize] = real[j] - tpre;
                imag[j + halfsize] = imag[j] - tpim;
                real[j] += tpre;
                imag[j] += tpim;
            }
        }
    }

    // Returns the integer whose value is the reverse of the lowest 'bits' bits of the integer 'x'.
    function reverseBits(x, bits) {
        var y = 0;
        for (var i = 0; i < bits; i++) {
            y = (y << 1) | (x & 1);
            x >>>= 1;
        }
        return y;
    }
}


/* 
 * Computes the discrete Fourier transform (DFT) of the given complex vector, storing the result back into the vector.
 * The vector can have any length. This requires the convolution function, which in turn requires the radix-2 FFT function.
 * Uses Bluestein's chirp z-transform algorithm.
 */
function transformBluestein(real, imag) {
    // Find a power-of-2 convolution length m such that m >= n * 2 + 1
    if (real.length !== imag.length)
        throw "Mismatched lengths";
    var i, j;
    var n = real.length;
    var m = 1;
    while (m < n * 2 + 1)
        m *= 2;

    // Trignometric tables
    var cosTable = new Array(n);
    var sinTable = new Array(n);
    for (i = 0; i < n; i++) {
        j = i * i % (n * 2); // This is more accurate than j = i * i
        cosTable[i] = Math.cos(Math.PI * j / n);
        sinTable[i] = Math.sin(Math.PI * j / n);
    }

    // Temporary vectors and preprocessing
    var areal = new Array(m);
    var aimag = new Array(m);
    for (i = 0; i < n; i++) {
        areal[i] = real[i] * cosTable[i] + imag[i] * sinTable[i];
        aimag[i] = -real[i] * sinTable[i] + imag[i] * cosTable[i];
    }
    for (i = n; i < m; i++)
        areal[i] = aimag[i] = 0;
    var breal = new Array(m);
    var bimag = new Array(m);
    breal[0] = cosTable[0];
    bimag[0] = sinTable[0];
    for (i = 1; i < n; i++) {
        breal[i] = breal[m - i] = cosTable[i];
        bimag[i] = bimag[m - i] = sinTable[i];
    }
    for (i = n; i <= m - n; i++)
        breal[i] = bimag[i] = 0;

    // Convolution
    var creal = new Array(m);
    var cimag = new Array(m);
    convolveComplex(areal, aimag, breal, bimag, creal, cimag);

    // Postprocessing
    for (i = 0; i < n; i++) {
        real[i] = creal[i] * cosTable[i] + cimag[i] * sinTable[i];
        imag[i] = -creal[i] * sinTable[i] + cimag[i] * cosTable[i];
    }
}


/* 
 * Computes the circular convolution of the given real vectors. Each vector's length must be the same.
 */
function convolveReal(x, y, out) {
    if (x.length !== y.length || x.length !== out.length)
        throw "Mismatched lengths";
    var zeros = new Array(x.length);
    for (var i = 0; i < zeros.length; i++)
        zeros[i] = 0;
    convolveComplex(x, zeros, y, zeros.slice(), out, zeros.slice());
}


/* 
 * Computes the circular convolution of the given complex vectors. Each vector's length must be the same.
 */
function convolveComplex(xreal, ximag, yreal, yimag, outreal, outimag) {
    if (xreal.length !== ximag.length || xreal.length !== yreal.length || yreal.length !== yimag.length || xreal.length !== outreal.length || outreal.length !== outimag.length)
        throw "Mismatched lengths";
    var i;
    var n = xreal.length;
    xreal = xreal.slice();
    ximag = ximag.slice();
    yreal = yreal.slice();
    yimag = yimag.slice();

    transform(xreal, ximag);
    transform(yreal, yimag);
    for (i = 0; i < n; i++) {
        var temp = xreal[i] * yreal[i] - ximag[i] * yimag[i];
        ximag[i] = ximag[i] * yreal[i] + xreal[i] * yimag[i];
        xreal[i] = temp;
    }
    inverseTransform(xreal, ximag);
    for (i = 0; i < n; i++) { // Scaling (because this FFT implementation omits it)
        outreal[i] = xreal[i] / n;
        outimag[i] = ximag[i] / n;
    }
}

/*globals Float32Array, Float64Array */
/*globals xtract_init_dct, xtract_init_mfcc, xtract_init_bark */

// Create the Singleton
var jsXtract = (function () {

    function searchMapProperties(map, properties) {
        var match = map.find(function (e) {
            for (var prop in properties) {
                if (e[prop] !== properties[prop]) {
                    return false;
                }
            }
            return true;
        });
        return match;
    }

    var dct_map = {
        parent: this,
        store: [],
        createCoefficients: function (N) {
            var match = searchMapProperties(this.store, {
                N: N
            });
            if (!match) {
                match = {
                    N: N,
                    data: xtract_init_dct(N)
                };
                this.store.push(match);
            }
            return match.data;
        }
    };

    var mfcc_map = {
        parent: this,
        store: [],
        createCoefficients: function (N, nyquist, style, freq_min, freq_max, freq_bands) {
            var search = {
                N: N,
                nyquist: nyquist,
                style: style,
                freq_min: freq_min,
                freq_max: freq_max,
                freq_bands: freq_bands
            };
            var match = searchMapProperties(this.store, search);
            if (!match) {
                match = search;
                match.data = xtract_init_mfcc(N, nyquist, style, freq_min, freq_max, freq_bands);
                this.store.push(match);
            }
            return match.data;
        }
    };

    var bark_map = {
        parent: this,
        store: [],
        createCoefficients: function (N, sampleRate, numBands) {
            var search = {
                N: N,
                sampleRate: sampleRate,
                numBands: numBands
            };
            var match = searchMapProperties(this.store, search);
            if (!match) {
                match = search;
                match.data = xtract_init_bark(N, sampleRate, numBands);
                this.store.push(match);
            }
            return match.data;
        }
    };
    var pub_obj = {};
    Object.defineProperties(pub_obj, {
        "createDctCoefficients": {
            "value": function (N) {
                return dct_map.createCoefficients(N);
            }
        },
        "createMfccCoefficients": {
            "value": function (N, nyquist, style, freq_min, freq_max, freq_bands) {
                return mfcc_map.createCoefficients(N, nyquist, style, freq_min, freq_max, freq_bands);
            }
        },
        "createBarkCoefficients": {
            "value": function (N, sampleRate, numBands) {
                if (typeof numBands !== "number" || numBands < 0 || numBands > 26) {
                    numBands = 26;
                }
                return bark_map.createCoefficients(N, sampleRate, numBands);
            }
        }
    });
    return pub_obj;
})();
var DataProto = function (N, sampleRate) {
    var _result = {},
        _data = new Float64Array(N);
    this.clearResult = function () {
        _result = {};
    };

    Object.defineProperties(this, {
        "result": {
            'get': function () {
                return _result;
            },
            'set': function () {}
        },
        "data": {
            'value': _data
        },
        "getData": {
            'value': function () {
                return _data;
            }
        }
    });

    this.zeroDataRange = function (start, end) {
        if (_data.fill) {
            _data.fill(0, start, end);
        } else {
            for (var n = start; n < end; n++) {
                _data[n] = 0;
            }
        }
        this.clearResult();
    };

    this.copyDataFrom = function (src, N, offset) {
        if (typeof src !== "object" || src.length === undefined) {
            throw ("copyDataFrom requires src to be an Array or TypedArray");
        }
        if (offset === undefined) {
            offset = 0;
        }
        if (N === undefined) {
            N = Math.min(src.length, _data.length);
        }
        N = Math.min(N + offset, _data.length);
        for (var n = 0; n < N; n++) {
            _data[n + offset] = src[n];
        }
        this.clearResult();
    };

    this.duplicate = function () {
        var copy = this.prototype.constructor(N, sampleRate);
        copy.copyDataFrom(_data);
    };

    this.toJSON = function () {
        var json = '{';
        for (var property in _result) {
            var lastchar = json[json.length - 1];
            if (lastchar !== '{' && lastchar !== ',') {
                json = json + ', ';
            }
            if (typeof _result[property] === "number" && isFinite(_result[property])) {
                json = json + '"' + property + '": ' + _result[property];
            } else if (typeof _result[property] === "object") {
                switch (_result[property].constructor) {
                    case Array:
                    case Float32Array:
                    case Float64Array:
                    case TimeData:
                    case SpectrumData:
                    case PeakSpectrumData:
                    case HarmonicSpectrumData:
                        // Array
                        json = json + '"' + property + '": ' + _result[property].toJSON(_result[property]);
                        break;
                    default:
                        json = json + '"' + property + '": ' + this.toJSON(_result[property]);
                        break;
                }
            } else {
                json = json + '"' + property + '": "' + _result[property].toString() + '"';
            }
        }
        return json + '}';
    };

    function recursiveDelta(a, b) {
        //a and b are objects of Time/Spectrum/PeakS/HarmonicS Data
        //a and b are the .result object
        var param, delta = {};
        for (param in a) {
            if (b[param]) {
                if (typeof a[param] === "number") {
                    delta[param] = a[param] - b[param];
                } else {
                    switch (a[param].constructor) {
                        case Array:
                        case Float32Array:
                        case Float64Array:
                            if (a[param].length === b[param].length) {
                                delta[param] = new Float64Array(a[param].length);
                            } else {
                                delta[param] = [];
                            }
                            var n = 0;
                            while (n < a[param].length && n < b[param].length) {
                                delta[param][n] = a[param][n] - b[param][n];
                                n++;
                            }
                            break;
                        case TimeData:
                        case SpectrumData:
                        case PeakSpectrumData:
                        case HarmonicSpectrumData:
                            delta[param] = recursiveDelta(a[param].result, b[param].result);
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        return delta;
    }

    this.computeDelta = function (compare) {
        this.result.delta = recursiveDelta(this.result, compare.result);
        return this.result.delta;
    };

    this.computeDeltaDelta = function (compare) {
        if (!compare.result.delta || !this.result.delta) {
            throw ("Cannot compute delta-delta without both objects having deltas");
        }
        this.result.delta.delta = recursiveDelta(this.result.delta, compare.result.delta);
        return this.result.delta.delta;
    };
};
DataProto.prototype.createDctCoefficients = function (N) {
    return jsXtract.createDctCoefficients(Number(N));
};
DataProto.prototype.createMfccCoefficients = function (N, nyquist, style, freq_min, freq_max, freq_bands) {
    N = Number(N);
    nyquist = Number(nyquist);
    freq_min = Number(freq_min);
    freq_max = Number(freq_max);
    freq_bands = Number(freq_bands);
    return jsXtract.createMfccCoefficients(N, nyquist, style, freq_min, freq_max, freq_bands);
};
DataProto.prototype.createBarkCoefficients = function (N, sampleRate, numBands) {
    N = Number(N);
    sampleRate = Number(sampleRate);
    numBands = Number(numBands);
    return jsXtract.createBarkCoefficients(N, sampleRate, numBands);
};

// Prototype for Time Domain based data
/*globals console, Float32Array, Float64Array */
var TimeData = function (N, sampleRate, parent) {
    if (sampleRate <= 0) {
        sampleRate = undefined;
        console.log("Invalid parameter for 'sampleRate' for TimeData");
    }

    var _length, _Fs, _wavelet, _dct;

    if (typeof N === "object") {
        var src, src_data;
        if (N.constructor === TimeData) {
            src = src.getData();
            _length = src.length;
            DataProto.call(this, _length);
            N = _length;
            this.copyDataFrom(src, N, 0);
        } else if (N.constructor === Float32Array || N.constructor === Float64Array) {
            src = N;
            N = _length = src.length;
            DataProto.call(this, _length);
            this.copyDataFrom(src, N, 0);
        } else {
            throw ("TimeData: Invalid object passed as first argument.");
        }

    } else if (typeof N === "number") {
        if (N <= 0 || N !== Math.floor(N)) {
            throw ("TimeData: Invalid number passed as first argument.");
        }
        _length = N;
        DataProto.call(this, N, sampleRate);
    } else {
        throw ("TimeData: Constructor has invalid operators!");
    }

    _Fs = sampleRate;
    _dct = this.createDctCoefficients(_length);
    _wavelet = xtract_init_wavelet();

    this.zeroData = function () {
        this.zeroDataRange(0, N);
    };

    Object.defineProperties(this, {
        "features": {
            'values': this.constructor.prototype.features
        },
        "sampleRate": {
            'get': function () {
                return _Fs;
            },
            'set': function (sampleRate) {
                if (_Fs === undefined) {
                    _Fs = sampleRate;
                } else {
                    throw ("Cannot set one-time variable");
                }
            }
        },
        "length": {
            'value': _length,
            'writable': false,
            'enumerable': true
        },
        "getFrames": {
            'value': function (frameSize, hopSize) {
                if (typeof frameSize !== "number" || frameSize <= 0 || frameSize !== Math.floor(frameSize)) {
                    throw ("frameSize must be a defined, positive integer");
                }
                if (typeof hopSize !== "number") {
                    hopSize = frameSize;
                }
                var num_frames = Math.ceil(_length / frameSize);
                var result_frames = [];
                for (var i = 0; i < num_frames; i++) {
                    var frame = new TimeData(hopSize, _Fs);
                    frame.copyDataFrom(this.data.subarray(frameSize * i, frameSize * i + hopSize));
                    result_frames.push(frame);
                }
                return result_frames;
            }
        },
        "minimum": {
            'value': function () {
                if (this.result.minimum === undefined) {
                    this.result.minimum = xtract_array_min(this.data);
                }
                return this.result.minimum;
            }
        },
        "maximum": {
            'value': function () {
                if (this.result.maximum === undefined) {
                    this.result.maximum = xtract_array_max(this.data);
                }
                return this.result.maximum;
            }
        },
        "sum": {
            'value': function () {
                if (this.result.sum === undefined) {
                    this.result.sum = xtract_array_sum(this.data);
                }
                return this.result.sum;
            }
        },
        "mean": {
            'value': function () {
                if (this.result.mean === undefined) {
                    this.result.mean = xtract_mean(this.data);
                }
                return this.result.mean;
            }
        },
        "temporal_centroid": {
            'value': function (window_ms) {
                if (this.result.temporal_centroid === undefined) {
                    this.energy(window_ms);
                    this.result.temporal_centroid = xtract_temporal_centroid(this.result.energy.data, _Fs, window_ms);
                }
                return this.result.temporal_centroid;
            }
        },
        "variance": {
            'value': function () {
                if (this.result.variance === undefined) {
                    this.result.variance = xtract_variance(this.data, this.mean());
                }
                return this.result.variance;
            }
        },
        "standard_deviation": {
            'value': function () {
                if (this.result.standard_deviation === undefined) {
                    this.result.standard_deviation = xtract_standard_deviation(this.data, this.variance());
                }
                return this.result.standard_deviation;
            }
        },
        "average_deviation": {
            'value': function () {
                if (this.result.average_deviation === undefined) {
                    this.result.average_deviation = xtract_average_deviation(this.data, this.mean());
                }
                return this.result.average_deviation;
            }
        },
        "skewness": {
            'value': function () {
                if (this.result.skewness === undefined) {
                    this.result.skewness = xtract_skewness(this.data, this.mean(), this.standard_deviation());
                }
                return this.result.skewness;
            }
        },
        "kurtosis": {
            'value': function () {
                if (this.result.kurtosis === undefined) {
                    this.result.kurtosis = xtract_kurtosis(this.data, this.mean(), this.standard_deviation());
                }
                return this.result.kurtosis;
            }
        },
        "zcr": {
            'value': function () {
                if (this.result.zcr === undefined) {
                    this.result.zcr = xtract_zcr(this.data);
                }
                return this.result.zcr;
            }
        },
        "crest_factor": {
            'value': function () {
                if (this.result.crest_factor === undefined) {
                    this.result.crest_factor = xtract_crest(this.data, this.maximum(), this.mean());
                }
                return this.result.crest_factor;
            }
        },
        "rms_amplitude": {
            'value': function () {
                if (this.result.rms_amplitude === undefined) {
                    this.result.rms_amplitude = xtract_rms_amplitude(this.data);
                }
                return this.result.rms_amplitude;
            }
        },
        "lowest_value": {
            'value': function (threshold) {
                if (this.result.lowest_value === undefined) {
                    this.result.lowest_value = xtract_lowest_value(this.data, threshold);
                }
                return this.result.lowest_value;
            }
        },
        "highest_value": {
            'value': function (threshold) {
                if (this.result.highest_value === undefined) {
                    this.result.highest_value = xtract_highest_value(this.data, threshold);
                }
                return this.result.highest_value;
            }
        },
        "nonzero_count": {
            'value': function () {
                if (this.result.nonzero_count === undefined) {
                    this.result.nonzero_count = xtract_nonzero_count(this.data);
                }
                return this.result.nonzero_count;
            }

        },
        "f0": {
            'value': function () {
                if (_wavelet === undefined) {
                    _wavelet = this.init_wavelet();
                }
                if (this.result.f0 === undefined) {
                    this.result.f0 = xtract_wavelet_f0(this.data, _Fs, _wavelet);
                }
                return this.result.f0;
            }
        },
        "energy": {
            'value': function (window_ms) {
                if (this.result.energy === undefined || this.result.energy.window_ms !== window_ms) {
                    this.result.energy = {
                        'data': xtract_energy(this.data, _Fs, window_ms),
                        'window_ms': window_ms
                    };
                }
                return this.result.energy;
            }
        },
        "spectrum": {
            'value': function () {
                if (this.result.spectrum === undefined) {
                    var _spec = xtract_spectrum(this.data, _Fs, true, false);
                    this.result.spectrum = new SpectrumData(_spec.length / 2, _Fs);
                    this.result.spectrum.copyDataFrom(_spec);
                    return this.result.spectrum;
                }
            }
        },
        "dct": {
            'value': function () {
                if (this.result.dct === undefined) {
                    this.result.dct = xtract_dct_2(this.data, _dct);
                }
                return this.result.dct;
            }
        },
        "autocorrelation": {
            'value': function () {
                if (this.result.autocorrelation === undefined) {
                    this.result.autocorrelation = xtract_autocorrelation(this.data);
                }
                return this.result.autocorrelation;
            }
        },
        "amdf": {
            'value': function () {
                if (this.result.amdf === undefined) {
                    this.result.amdf = xtract_amdf(this.data);
                }
                return this.result.amdf;
            }
        },
        "asdf": {
            'value': function () {
                if (this.result.asdf === undefined) {
                    this.result.asdf = xtract_asdf(this.data);
                }
                return this.result.asdf;
            }
        },
        "yin": {
            'value': function () {
                if (this.result.yin === undefined) {
                    this.result.yin = xtract_yin(this.data);
                }
                return this.result.yin;
            }
        },
        "onset": {
            'value': function (frameSize) {
                if (this.result.onset === undefined || this.result.onset.frameSize !== frameSize) {
                    this.result.onset = {
                        'data': xtract_onset(this.data, frameSize),
                        'frameSize': frameSize
                    };
                }
                return this.result.onset;
            }
        },
        "resample": {
            'value': function (targetSampleRate) {
                if (_Fs === undefined) {
                    throw ("Source sampleRate must be defined");
                }
                if (typeof targetSampleRate !== "number" || targetSampleRate <= 0) {
                    throw ("Target sampleRate must be a positive number");
                }
                var resampled = xtract_resample(this.data, targetSampleRate, _Fs);
                var reply = new TimeData(resampled.length, targetSampleRate);
                reply.copyDataFrom(resampled);
                this.result.resample = reply;
                return reply;
            }
        }
    });
    //TODO:
    /*
    Object.defineProperty(this, "pitch", {
        'value': function () {
            if (_Fs === undefined) {
                throw ("Sample rate must be defined");
            }
            if (this.result.pitch === undefined) {
                this.result.pitch = xtract_pitch_FB(this.data, _Fs);
            }
            return this.result.pitch;
        }
    });
    */
};
TimeData.prototype = Object.create(DataProto.prototype);
TimeData.prototype.constructor = TimeData;

// Prototpye for the Spectrum data type
/*globals Float64Array */
var SpectrumData = function (N, sampleRate, parent) {
    // N specifies the number of elements to create. Actually creates 2N to hold amplitudes and frequencies.
    // If sampleRate is null, calculate using radians per second [0, pi/2]
    if (N === undefined || N <= 0) {
        throw ("SpectrumData constructor requires N to be a defined, whole number");
    }
    if (sampleRate === undefined) {
        sampleRate = Math.PI;
    }
    DataProto.call(this, 2 * N, sampleRate);
    var _amps = this.data.subarray(0, N);
    var _freqs = this.data.subarray(N, 2 * N);
    var _length = N;
    var _Fs = sampleRate;
    var _f0;
    var _mfcc, _bark, _dct = this.createDctCoefficients(_length);

    function computeFrequencies() {
        for (var i = 0; i < N; i++) {
            _freqs[i] = (i / N) * (_Fs / 2);
        }
    }

    computeFrequencies();

    this.zeroData = function () {
        this.zeroDataRange(0, N);
    };

    Object.defineProperties(this, {
        "features": {
            'get': function () {
                return this.constructor.prototype.features;
            },
            'set': function () {}
        },
        "sampleRate": {
            'get': function () {
                return _Fs;
            },
            'set': function (sampleRate) {
                if (_Fs === Math.PI) {
                    _Fs = sampleRate;
                    computeFrequencies();
                    _bark = xtract_init_bark(N, _Fs);
                } else {
                    throw ("Cannot set one-time variable");
                }
            }
        },
        "f0": {
            'get': function () {
                return _f0;
            },
            'set': function (f0) {
                if (typeof f0 === "number") {
                    _f0 = f0;
                }
                return _f0;
            }
        },
        "init_mfcc": {
            "value": function (num_bands, freq_min, freq_max, style) {
                _mfcc = this.createMfccCoefficients(_length, _Fs * 0.5, style, freq_min, freq_max, num_bands);
                this.result.mfcc = undefined;
                return _mfcc;
            }
        },
        "init_bark": {
            "value": function (numBands) {
                if (typeof numBands !== "number" || numBands < 0 || numBands > 26) {
                    numBands = 26;
                }
                _bark = this.createBarkCoefficients(_length, _Fs, numBands);
                return _bark;
            }
        },
        "length": {
            'value': _length,
            'writable': false,
            'enumerable': true
        },
        "minimum": {
            'value': function () {
                if (this.result.minimum === undefined) {
                    this.result.minimum = xtract_array_min(_amps);
                }
                return this.result.minimum;
            }
        },
        "maximum": {
            'value': function () {
                if (this.result.maximum === undefined) {
                    this.result.maximum = xtract_array_max(_amps);
                }
                return this.result.maximum;
            }
        },
        "sum": {
            'value': function () {
                if (this.result.sum === undefined) {
                    this.result.sum = xtract_array_sum(_amps);
                }
                return this.result.sum;
            }
        },
        "spectral_centroid": {
            'value': function () {
                if (this.result.spectral_centroid === undefined) {
                    this.result.spectral_centroid = xtract_spectral_centroid(this.data);
                }
                return this.result.spectral_centroid;
            }
        },
        "spectral_mean": {
            'value': function () {
                if (this.result.spectral_mean === undefined) {
                    this.result.spectral_mean = xtract_spectral_mean(this.data);
                }
                return this.result.spectral_mean;
            }
        },
        "spectral_variance": {
            'value': function () {
                if (this.result.spectral_variance === undefined) {
                    this.result.spectral_variance = xtract_spectral_variance(this.data, this.spectral_mean());
                }
                return this.result.spectral_variance;
            }
        },
        "spectral_spread": {
            'value': function () {
                if (this.result.spectral_spread === undefined) {
                    this.result.spectral_spread = xtract_spectral_spread(this.data, this.spectral_centroid());
                }
                return this.result.spectral_spread;
            }
        },
        "spectral_standard_deviation": {
            'value': function () {
                if (this.result.spectral_standard_deviation === undefined) {
                    this.result.spectral_standard_deviation = xtract_spectral_standard_deviation(this.data, this.spectral_variance());
                }
                return this.result.spectral_standard_deviation;
            }
        },
        "spectral_skewness": {
            'value': function () {
                if (this.result.spectral_skewness === undefined) {
                    this.result.spectral_skewness = xtract_spectral_skewness(this.data, this.spectral_mean(), this.spectral_standard_deviation());
                }
                return this.result.spectral_skewness;
            }
        },
        "spectral_kurtosis": {
            'value': function () {
                if (this.result.spectral_kurtosis === undefined) {
                    this.result.spectral_kurtosis = xtract_spectral_kurtosis(this.data, this.spectral_mean(), this.spectral_standard_deviation());
                }
                return this.result.spectral_kurtosis;
            }
        },
        "irregularity_k": {
            'value': function () {
                if (this.result.irregularity_k === undefined) {
                    this.result.irregularity_k = xtract_irregularity_k(this.data);
                }
                return this.result.irregularity_k;
            }
        },
        "irregularity_j": {
            'value': function () {
                if (this.result.irregularity_j === undefined) {
                    this.result.irregularity_j = xtract_irregularity_j(this.data);
                }
                return this.result.irregularity_j;
            }
        },
        "tristimulus_1": {
            'value': function () {
                if (_f0 === undefined) {
                    this.spectral_fundamental();
                }
                if (this.result.tristimulus_1 === undefined) {
                    this.result.tristimulus_1 = xtract_tristimulus_1(this.data, _f0);
                }
                return this.result.tristimulus_1;
            }
        },
        "tristimulus_2": {
            'value': function () {
                if (_f0 === undefined) {
                    this.spectral_fundamental();
                }
                if (this.result.tristimulus_2 === undefined) {
                    this.result.tristimulus_2 = xtract_tristimulus_2(this.data, _f0);
                }
                return this.result.tristimulus_2;
            }
        },
        "tristimulus_3": {
            'value': function () {
                if (_f0 === undefined) {
                    this.spectral_fundamental();
                }
                if (this.result.tristimulus_3 === undefined) {
                    this.result.tristimulus_3 = xtract_tristimulus_3(this.data, _f0);
                }
                return this.result.tristimulus_3;
            }
        },
        "smoothness": {
            'value': function () {
                if (this.result.smoothness === undefined) {
                    this.result.smoothness = xtract_smoothness(this.data);
                }
                return this.result.smoothness;
            }
        },
        "rolloff": {
            'value': function (threshold) {
                if (this.result.rolloff === undefined) {
                    this.result.rolloff = xtract_rolloff(this.data, _Fs, threshold);
                }
                return this.result.rolloff;
            }
        },
        "loudness": {
            'value': function () {
                if (this.result.loudness === undefined) {
                    this.result.loudness = xtract_loudness(this.bark_coefficients());
                }
                return this.result.loudness;
            }
        },
        "sharpness": {
            'value': function () {
                if (this.result.sharpness === undefined) {
                    this.result.sharpness = xtract_sharpness(this.bark_coefficients());
                }
                return this.result.sharpness;
            }
        },
        "flatness": {
            'value': function () {
                if (this.result.flatness === undefined) {
                    this.result.flatness = xtract_flatness(this.data);
                }
                return this.result.flatness;
            }
        },
        "flatness_db": {
            'value': function () {
                if (this.result.flatness_db === undefined) {
                    this.result.flatness_db = xtract_flatness_db(this.data, this.flatness());
                }
                return this.result.flatness_db;
            }
        },
        "tonality": {
            'value': function () {
                if (this.result.tonality === undefined) {
                    this.result.tonality = xtract_tonality(this.data, this.flatness_db());
                }
                return this.result.tonality;
            }
        },
        "spectral_crest_factor": {
            'value': function () {
                if (this.result.spectral_crest_factor === undefined) {
                    this.result.spectral_crest_factor = xtract_crest(_amps, this.maximum(), this.spectral_mean());
                }
                return this.result.spectral_crest_factor;
            }
        },
        "spectral_slope": {
            'value': function () {
                if (this.result.spectral_slope === undefined) {
                    this.result.spectral_slope = xtract_spectral_slope(this.data);
                }
                return this.result.spectral_slope;
            }
        },
        "spectral_fundamental": {
            'value': function () {
                if (this.result.spectral_fundamental === undefined) {
                    this.result.spectral_fundamental = xtract_spectral_fundamental(this.data, _Fs);
                    this.f0 = this.result.spectral_fundamental;
                }
                return this.result.spectral_fundamental;
            }
        },
        "nonzero_count": {
            'value': function () {
                if (this.result.nonzero_count === undefined) {
                    this.result.nonzero_count = xtract_nonzero_count(_amps);
                }
                return this.result.nonzero_count;
            }
        },
        "hps": {
            'value': function () {
                if (this.result.hps === undefined) {
                    this.result.hps = xtract_hps(this.data);
                }
                return this.result.hps;
            }
        },
        "mfcc": {
            'value': function (num_bands, freq_min, freq_max) {
                if (_mfcc === undefined) {
                    if (freq_min === undefined) {
                        throw ("Run init_mfcc(num_bands, freq_min, freq_max, style) first");
                    } else {
                        _mfcc = this.init_mfcc(num_bands, freq_min, freq_max);
                    }
                }
                if (this.result.mfcc === undefined) {
                    this.result.mfcc = xtract_mfcc(this.data, _mfcc);
                }
                return this.result.mfcc;
            }
        },
        "dct": {
            'value': function () {
                if (this.result.dct === undefined) {
                    this.result.dct = xtract_dct_2(_amps, _dct);
                }
                return this.result.dct;
            }
        },
        "bark_coefficients": {
            'value': function (num_bands) {
                if (this.result.bark_coefficients === undefined) {
                    if (_bark === undefined) {
                        _bark = this.init_bark(num_bands);
                    }
                    this.result.bark_coefficients = xtract_bark_coefficients(this.data, _bark);
                }
                return this.result.bark_coefficients;
            }
        },
        "peak_spectrum": {
            'value': function (threshold) {
                if (this.result.peak_spectrum === undefined) {
                    this.result.peak_spectrum = new PeakSpectrumData(_length, _Fs, this);
                    var ps = xtract_peak_spectrum(this.data, _Fs / _length, threshold);
                    this.result.peak_spectrum.copyDataFrom(ps.subarray(0, _length));
                }
                return this.result.peak_spectrum;
            }
        }
    });

};
SpectrumData.prototype = Object.create(DataProto.prototype);
SpectrumData.prototype.constructor = SpectrumData;

var PeakSpectrumData = function (N, sampleRate, parent) {
    if (N === undefined || N <= 0) {
        throw ("SpectrumData constructor requires N to be a defined, whole number");
    }
    if (sampleRate === undefined) {
        sampleRate = Math.PI;
    }
    SpectrumData.call(this, N);

    Object.defineProperties(this, {
        "features": {
            'get': function () {
                return this.constructor.prototype.features;
            },
            'set': function () {}
        },
        "spectral_inharmonicity": {
            'value': function () {
                if (this.result.spectral_inharmonicity === undefined) {
                    this.result.spectral_inharmonicity = xtract_spectral_inharmonicity(this.data, this.sampleRate);
                }
                return this.result.spectral_inharmonicity;
            }
        },
        "harmonic_spectrum": {
            'value': function (threshold) {
                if (this.result.harmonic_spectrum === undefined) {
                    if (this.f0 === undefined) {
                        this.spectral_fundamental(this.data(), this.sampleRate);
                    }
                    this.result.harmonic_spectrum = new HarmonicSpectrumData(this.length, this.sampleRate, this);
                    var hs = xtract_harmonic_spectrum(this.data(), this.f0, threshold);
                    this.result.harmonic_spectrum.copyDataFrom(hs.subarray(0, this.length));
                }
                return this.result.harmonic_spectrum;
            }
        }
    });
};
PeakSpectrumData.prototype = Object.create(SpectrumData.prototype);
PeakSpectrumData.prototype.constructor = PeakSpectrumData;

/*globals Float32Array, Float64Array */
/*globals window, console */
var HarmonicSpectrumData = function (N, sampleRate, parent) {
    if (N === undefined || N <= 0) {
        console.error("SpectrumData constructor requires N to be a defined, whole number");
        return;
    }
    if (sampleRate === undefined) {
        sampleRate = Math.PI;
    }
    PeakSpectrumData.call(this, N);

    Object.defineProperties(this, {
        "features": {
            'get': function () {
                return this.constructor.prototype.features;
            },
            'set': function () {}
        },
        "odd_even_ratio": {
            'value': function () {
                if (this.result.odd_even_ratio === undefined) {
                    if (this.f0 === undefined) {
                        this.spectral_fundamental(this.data(), this.sampleRate);
                    }
                    this.result.odd_even_ratio = xtract_odd_even_ratio(this.data(), this.f0);
                }
                return this.result.odd_even_ratio;
            }
        },
        "noisiness": {
            'value': function () {
                if (parent.constructor !== PeakSpectrumData) {
                    this.result.noisiness = null;
                } else {
                    this.result.noisiness = xtract_noisiness(this.nonzero_count(), parent.nonzero_count());
                }
                return this.result.noisiness;
            }
        }
    });
};
HarmonicSpectrumData.prototype = Object.create(PeakSpectrumData.prototype);
HarmonicSpectrumData.prototype.constructor = HarmonicSpectrumData;

/*globals Float32Array, Float64Array */
TimeData.prototype.features = [
    {
        name: "Minimum",
        function: "minimum",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Maximum",
        function: "maximum",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Sum",
        function: "sum",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Mean",
        function: "mean",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Temporal Centroid",
        function: "temporal_centroid",
        sub_features: ["energy"],
        parameters: [{
            name: "Window Time",
            unit: "ms",
            type: "number",
            minimum: 1,
            maximum: undefined,
            default: 100
        }],
        returns: "number"
    }, {
        name: "Variance",
        function: "variance",
        sub_features: ["mean"],
        parameters: [],
        returns: "number"
    }, {
        name: "Standard Deviation",
        function: "standard_deviation",
        sub_features: ["variance"],
        parameters: [],
        returns: "number"
    }, {
        name: "Average Deviation",
        function: "average_deviation",
        sub_features: ["mean"],
        parameters: [],
        returns: "number"
    }, {
        name: "Skewness",
        function: "skewness",
        sub_features: ["mean", "standard_deviation"],
        parameters: [],
        returns: "number"
    }, {
        name: "Kurtosis",
        function: "kurtosis",
        sub_features: ["mean", "standard_deviation"],
        parameters: [],
        returns: "number"
    }, {
        name: "Zero Crossing Rate",
        function: "zcr",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Crest Factor",
        function: "crest_factor",
        sub_features: ["maximum", "mean"],
        parameters: [],
        returns: "number"
    }, {
        name: "RMS Amplitude",
        function: "rms_amplitude",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Lowest Value",
        function: "lowest_value",
        sub_features: [],
        parameters: [{
            name: "Threshold",
            unit: "",
            type: "number",
            minimum: undefined,
            maximum: undefined,
            default: undefined
        }],
        returns: "number"
    }, {
        name: "Highest Value",
        function: "highest_value",
        sub_features: [],
        parameters: [{
            name: "Threshold",
            unit: "",
            type: "number",
            minimum: undefined,
            maximum: undefined,
            default: undefined
        }],
        returns: "number"
    }, {
        name: "Non-Zero Count",
        function: "nonzero_count",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Fundamental Frequency",
        function: "f0",
        sub_features: [],
        parameters: [],
        returns: "number"
    }, {
        name: "Energy",
        function: "energy",
        sub_features: [],
        parameters: [{
            name: "Window",
            unit: "ms",
            type: "number",
            minimum: 1,
            maximum: undefined,
            default: 100
        }],
        returns: "object"
    }, {
        name: "Spectrum",
        function: "spectrum",
        sub_features: [],
        parameters: [],
        returns: "SpectrumData"
    }, {
        name: "DCT",
        function: "dct",
        sub_features: [],
        parameters: [],
        returns: "array"
    }, {
        name: "Autocorrelation",
        function: "autocorrelation",
        sub_features: [],
        parameters: [],
        returns: "array"
    }, {
        name: "AMDF",
        function: "amdf",
        sub_features: [],
        parameters: [],
        returns: "array"
    }, {
        name: "ASDF",
        function: "asdf",
        sub_features: [],
        parameters: [],
        returns: "array"
    }, {
        name: "YIN Pitch",
        function: "yin",
        sub_features: [],
        parameters: [],
        returns: "array"
    }, {
        name: "Onset Detection",
        function: "onset",
        sub_features: [],
        parameters: [{
            name: "Frame Size",
            unit: "samples",
            type: "number",
            minimum: 1,
            maximum: undefined,
            default: 1024
        }],
        returns: "array"
    }, {
        name: "Resample",
        function: "resample",
        sub_features: [],
        parameters: [{
            name: "Target Sample Rate",
            unit: "Hz",
            type: "number",
            minimum: 0,
            maximum: undefined,
            default: 8000
        }],
        returns: "TimeData"
    }];


SpectrumData.prototype.features = [
    {
        name: "Minimum",
        function: "minimum",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Maximum",
        function: "maximum",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Sum",
        function: "sum",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Centroid",
        function: "spectral_centroid",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Mean",
        function: "spectral_mean",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Variance",
        function: "spectral_variance",
        sub_features: ["spectral_mean"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Spread",
        function: "spectral_spread",
        sub_features: ["spectral_centroid"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Standard Deviation",
        function: "spectral_standard_deviation",
        sub_features: ["spectral_variance"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Skewness",
        function: "spectral_skewness",
        sub_features: ["spectral_mean", "spectral_standard_deviation"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Kurtosis",
        function: "spectral_kurtosis",
        sub_features: ["spectral_mean", "spectral_standard_deviation"],
        parameters: [],
        returns: "number"
}, {
        name: "Irregularity K",
        function: "irregularity_k",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Irregularity J",
        function: "irregularity_j",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Tristimulus 1",
        function: "tristimulus_1",
        sub_features: ["spectral_fundamental"],
        parameters: [],
        returns: "number"
}, {
        name: "Tristimulus 2",
        function: "tristimulus_2",
        sub_features: ["spectral_fundamental"],
        parameters: [],
        returns: "number"
}, {
        name: "Tristimulus 3",
        function: "tristimulus_3",
        sub_features: ["spectral_fundamental"],
        parameters: [],
        returns: "number"
}, {
        name: "Smoothness",
        function: "smoothness",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Rolloff",
        function: "rolloff",
        sub_features: [],
        parameters: [{
            name: "Threshold",
            unit: "%",
            type: "number",
            minimum: 0,
            maximum: 100,
            default: 90
    }],
        returns: "number"
}, {
        name: "Loudness",
        function: "loudness",
        sub_features: ["bark_coefficients"],
        parameters: [],
        returns: "number"
}, {
        name: "Sharpness",
        function: "sharpness",
        sub_features: ["bark_coefficients"],
        parameters: [],
        returns: "number"
}, {
        name: "Flatness",
        function: "flatness",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Flatness DB",
        function: "flatness_db",
        sub_features: ["flatness"],
        parameters: [],
        returns: "number"
}, {
        name: "Tonality",
        function: "tonality",
        sub_features: ["flatness_db"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Crest Factor",
        function: "spectral_crest_factor",
        sub_features: ["maximum", "spectral_mean"],
        parameters: [],
        returns: "number"
}, {
        name: "Spectral Slope",
        function: "spectral_slope",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Fundamental Frequency",
        function: "spectral_fundamental",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "Non-Zero count",
        function: "nonzero_count",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "HPS",
        function: "hps",
        sub_features: [],
        parameters: [],
        returns: "number"
}, {
        name: "MFCC",
        function: "mfcc",
        sub_features: [],
        parameters: [{
            name: "Band Count",
            unit: "",
            type: "number",
            minimum: 0,
            maximum: undefined,
            default: 26
    }, {
            name: "Minimum Frequency",
            unit: "Hz",
            type: "number",
            minimum: 0,
            maximum: undefined,
            default: 400
    }, {
            name: "Maximum Frequency",
            unit: "Hz",
            minimum: 0,
            maximum: undefined,
            default: 20000
    }],
        returns: "array"
}, {
        name: "DCT",
        function: "dct",
        sub_features: [],
        parameters: [],
        returns: "array"
}, {
        name: "Bark Coefficients",
        function: "bark_coefficients",
        sub_features: [],
        parameters: [{
            name: "Band Count",
            unit: "",
            type: "number",
            minimum: 0,
            maximum: 26,
            default: 26
    }],
        returns: "array"
}, {
        name: "Peak Spectrum",
        function: "peak_spectrum",
        sub_features: [],
        parameters: [{
            name: "Threshold",
            unit: "",
            type: "number",
            minimum: 0,
            maximum: 100,
            default: 30
    }],
        returns: "PeakSpectrumData"
}];

PeakSpectrumData.prototype.features = SpectrumData.prototype.features.concat([
    {
        name: "Spectral Inharmonicity",
        function: "spectral_inharmonicity",
        sub_features: ["f0"],
        parameters: [],
        returns: "number"
}, {
        name: "Harmonic Spectrum",
        function: "harmonic_spectrum",
        sub_features: [],
        parameters: [{
            name: "Threshold",
            unit: "",
            type: "number",
            minimum: 0,
            maximum: 100,
            default: 30
    }],
        returns: "HarmonicSpectrumData"
}]);

HarmonicSpectrumData.prototype.features = PeakSpectrumData.prototype.features.concat([
    {
        name: "Odd Even Ration",
        function: "odd_even_ratio",
        sub_features: [],
        parameters: [],
        returns: "number"
    }
]);

/*
 * Copyright (C) 2016 Nicholas Jillings
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 *
 */

// This binds the js-xtract with the Web Audio API AudioBuffer and AnalyserNodes
/*globals AudioBuffer, AnalyserNode, Float32Array, Float64Array */
/*globals Uint8Array */

if (typeof AnalyserNode !== "undefined") {

    AnalyserNode.prototype.timeData = undefined;
    AnalyserNode.prototype.spectrumData = undefined;
    AnalyserNode.prototype.callbackObject = undefined;
    AnalyserNode.prototype.fooGain = undefined;
    AnalyserNode.prototype.getXtractData = function () {
        if (this.timeData === undefined || this.scpectrumData === undefined) {
            this.timeData = new TimeData(this.fftSize, this.context.sampleRate);
            this.spectrumData = new SpectrumData(this.frequencyBinCount, this.context.sampleRate);
        }
        var dst = new Float32Array(this.fftSize);
        var i;
        if (this.getFloatTimeDomainData) {
            this.getFloatTimeDomainData(dst);
        } else {
            var view = new Uint8Array(this.fftSize);
            this.getByteTimeDomainData(view);
            for (i = 0; i < this.fftSize; i++) {
                dst[i] = view[i];
                dst[i] = (dst[i] / 127.5) - 1;
            }
        }
        this.timeData.copyDataFrom(dst);
        this.timeData.result.spectrum = this.spectrumData;
        var LogStore = new Float32Array(this.frequencyBinCount);
        this.getFloatFrequencyData(LogStore);
        for (i = 0; i < this.frequencyBinCount; i++) {
            LogStore[i] = Math.pow(10.0, LogStore[i] / 20);
        }
        this.spectrumData.copyDataFrom(LogStore);
        return this.timeData;
    };
    AnalyserNode.prototype.previousFrame = undefined;
    AnalyserNode.prototype.previousResult = undefined;
    AnalyserNode.prototype.frameCallback = function (func, arg_this) {
        // Perform a callback on each frame
        // The function callback has the arguments (current_frame, previous_frame, previous_result)
        if (this.callbackObject === undefined) {
            this.callbackObject = this.context.createScriptProcessor(this.fftSize, 1, 1);
            this.connect(this.callbackObject);
        }
        var _func = func;
        var _arg_this = arg_this;
        var self = this;
        this.callbackObject.onaudioprocess = function (e) {
            var current_frame = self.getXtractData();
            this.previousResult = _func.call(_arg_this, current_frame, this.previousFrame, this.previousResult);
            this.previousFrame = current_frame;
            var N = e.outputBuffer.length;
            var output = new Float32Array(N);
            var result = this.previousResult;
            if (typeof this.previousResult !== "number") {
                result = 0.0;
            }
            for (var i = 0; i < N; i++) {
                output[i] = result;
            }
            e.outputBuffer.copyToChannel(output, 0, 0);
        };

        // For chrome and other efficiency browsers
        if (!this.fooGain) {
            this.fooGain = this.context.createGain();
            this.fooGain.gain.value = 0;
            this.callbackObject.connect(this.fooGain);
            this.fooGain.connect(this.context.destination);
        }
    };

    AnalyserNode.prototype.clearCallback = function () {
        this.disconnect(this.callbackObject);
        this.callbackObject.onaudioprocess = undefined;
    };

    AnalyserNode.prototype.xtractFrame = function (func, arg_this) {
        // Collect the current frame of data and perform the callback function
        func.call(arg_this, this.getXtractData());
    };
}

if (typeof AudioBuffer !== "undefined") {

    AudioBuffer.prototype.xtract_get_data_frames = function (frame_size, hop_size) {
        if (typeof frame_size !== "number") {
            throw ("xtract_get_data_frames requires the frame_size to be defined");
        }
        if (frame_size <= 0 || frame_size !== Math.floor(frame_size)) {
            throw ("xtract_get_data_frames requires the frame_size to be a positive integer");
        }
        if (hop_size === undefined) {
            hop_size = frame_size;
        }
        if (hop_size <= 0 || hop_size !== Math.floor(hop_size)) {
            throw ("xtract_get_data_frames requires the hop_size to be a positive integer");
        }
        this.frames = [];
        var N = this.length;
        var K = this.xtract_get_number_of_frames(hop_size);
        for (var c = 0; c < this.numberOfChannels; c++) {
            var data = this.getChannelData(c);
            this.frames[c] = [];
            for (var k = 0; k < K; k++) {
                var frame = new TimeData(frame_size, this.sampleRate);
                frame.copyDataFrom(data.subarray(hop_size * k, hop_size * k + frame_size));
                this.frames[c].push(frame);
                frame = undefined;
            }
            data = undefined;
        }
        return this.frames;
    };

    AudioBuffer.prototype.xtract_get_number_of_frames = function (hop_size) {
        return xtract_get_number_of_frames(this, hop_size);
    };

    AudioBuffer.prototype.xtract_get_frame = function (dst, channel, index, frame_size, hop_size) {
        if (typeof dst !== "object" || dst.constructor !== Float32Array) {
            throw ("dst must be a Float32Array object equal in length to hop_size");
        }
        if (typeof channel !== "number" || channel !== Math.floor(channel)) {
            throw ("xtract_get_frame requires the channel to be an integer value");
        }
        if (typeof index !== "number" || index !== Math.floor(index)) {
            throw ("xtract_get_frame requires the index to be an integer value");
        }
        if (typeof frame_size !== "number") {
            throw ("xtract_get_frame requires the frame_size to be defined");
        }
        if (frame_size <= 0 || frame_size !== Math.floor(frame_size)) {
            throw ("xtract_get_frame requires the frame_size to be a positive integer");
        }
        if (hop_size === undefined) {
            hop_size = frame_size;
        }
        if (dst.length !== hop_size) {
            throw ("dst must be a Float32Array object equal in length to hop_size");
        }
        if (hop_size <= 0 || hop_size !== Math.floor(hop_size)) {
            throw ("xtract_get_frame requires the hop_size to be a positive integer");
        }
        if (channel < 0 || channel > this.numberOfChannels) {
            throw ("channel number " + channel + " out of bounds");
        }
        var K = this.xtract_get_number_of_frames(hop_size);
        if (index < 0 || index >= K) {
            throw ("index number " + index + " out of bounds");
        }
        return this.copyFromChannel(dst, channel, hop_size * index);
    };

    AudioBuffer.prototype.xtract_process_frame_data = function () {
        throw ("AudioBuffer::xtract_process_frame_data has been deprecated");
    };
}

// Filterbanks:

var xtract_chroma_FB = {
    'normal': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": ["1", "-7.8397125566975365273947318200953304767608642578125", "27.0405109931504767928345245309174060821533203125", "-53.590470586269219666064600460231304168701171875", "66.7441291922558974647472496144473552703857421875", "-53.4913795620385172924216021783649921417236328125", "26.940605406679043909434767556376755237579345703125", "-7.796305092203539288675528950989246368408203125", "0.9926243356933699413247040865826420485973358154296875"],
            "b": ["0.0031517979535352958798954947639003876247443258762359619140625", "-0.024727352939516118734974980952756595797836780548095703125", "0.08535618856327385761684212184263742528855800628662109375", "-0.16930663297948822521021838838350959122180938720703125", "0.2110520055418441953687391787752858363091945648193359375", "-0.1693066329794881974546427727545960806310176849365234375", "0.085356188563273871494629929657094180583953857421875", "-0.02472735293951612567386888485998497344553470611572265625", "0.003151797953535298048299839734909255639649927616119384765625"]
        }, {
            "a": ["1", "-7.8206265083942678728590180980972945690155029296875", "26.9279856831950468176728463731706142425537109375", "-53.31132678516249967515250318683683872222900390625", "66.3708455626609747923794202506542205810546875", "-53.206896068828399393169092945754528045654296875", "26.82259144382586413257740787230432033538818359375", "-7.77475742515525514164664855343289673328399658203125", "0.9921874738904603585609720539650879800319671630859375"],
            "b": ["0.003151251710474980809173484175289559061639010906219482421875", "-0.0246636598779945044601635828485086676664650440216064453125", "0.0849922056636697453857465234250412322580814361572265625", "-0.1684149054951185886519482437506667338311672210693359375", "0.209870226673887050328204395555076189339160919189453125", "-0.168414905495118449874070165606099180877208709716796875", "0.08499220566366964824123186872384394519031047821044921875", "-0.02466365987799445935735320745152421295642852783203125", "0.003151251710474973870279580268061181413941085338592529296875"]
        }, {
            "a": ["1", "-7.79925010563665122020893250009976327419281005859375", "26.80230807683333438262707204557955265045166015625", "-53.00012398231900334621968795545399188995361328125", "65.955096209650918126499163918197154998779296875", "-52.8901357408634709145189845003187656402587890625", "26.69118084504642496312953880988061428070068359375", "-7.750794799031222481744407559745013713836669921875", "0.991724844773134162068117802846245467662811279296875"],
            "b": ["0.003150682367974755836159683752839555381797254085540771484375", "-0.0245925915500890650278176252641060273163020610809326171875", "0.0845863039165105357053420220836414955556392669677734375", "-0.1674213896339591389761380924028344452381134033203125", "0.2085540067124206642379391496433527208864688873291015625", "-0.1674213896339590557094112455160939134657382965087890625", "0.08458630391651043856082736738244420848786830902099609375", "-0.0245925915500890233944542018207357614301145076751708984375", "0.0031506823679747484635849108514094041311182081699371337890625"]
        }, {
            "a": ["1", "-7.77530937321187121114007823052816092967987060546875", "26.6619890340711407361595775000751018524169921875", "-52.6533572558195288593196892179548740386962890625", "65.4923046005149700476977159269154071807861328125", "-52.537598313070162703297683037817478179931640625", "26.544884653295472531908671953715384006500244140625", "-7.72413981620624401358554678154177963733673095703125", "0.99123494173030268772350837025442160665988922119140625"],
            "b": ["0.0031500896945190655362711851239509996958076953887939453125", "-0.024513283191092749557782326519372873008251190185546875", "0.0841337801200150170455316356310504488646984100341796875", "-0.1663150021905505926422819129584240727126598358154296875", "0.207088857922834213010077064609504304826259613037109375", "-0.1663150021905506481534331442162510938942432403564453125", "0.08413378012001503092331944344550720416009426116943359375", "-0.0245132831910927599661231823802154394797980785369873046875", "0.0031500896945190668373137921065563205047510564327239990234375"]
        }, {
            "a": ["1", "-7.74849811525877640860926476307213306427001953125", "26.5053855413745083069443353451788425445556640625", "-52.2671902915880508544432814233005046844482421875", "64.977476256240521479412564076483249664306640625", "-52.145455374325962338843964971601963043212890625", "26.382062609858810020568853360600769519805908203125", "-7.69448338390005037723540226579643785953521728515625", "0.99071617167774217449505158583633601665496826171875"],
            "b": ["0.0031494735834170493361805487353421995067037642002105712890625", "-0.0244247696186714290111918757020248449407517910003662109375", "0.083629448835788877669727980901370756328105926513671875", "-0.165083616495825313830181357843684963881969451904296875", "0.2054589698096231653590137966602924279868602752685546875", "-0.1650836164958254526080594359882525168359279632568359375", "0.08362944883578903032539386686039506457746028900146484375", "-0.0244247696186714984001309147743086214177310466766357421875", "0.003149473583417061912925749567193633993156254291534423828125"]
        }, {
            "a": ["1", "-7.71847428893364195801041205413639545440673828125", "26.330688881405311718708617263473570346832275390625", "-51.837438163362975274139898829162120819091796875", "64.405181103656531149681541137397289276123046875", "-51.709533791768109267650288529694080352783203125", "26.20091189442340606774450861848890781402587890625", "-7.6614812509870038326198482536710798740386962890625", "0.9901668502936369353761847378336824476718902587890625"],
            "b": ["0.0031488340769664419950546463411455988534726202487945556640625", "-0.02432597404671228702444096825274755246937274932861328125", "0.08306760582031029460647886253354954533278942108154296875", "-0.1637140089580291502091569100230117328464984893798828125", "0.2036471533650326681819109353455132804811000823974609375", "-0.1637140089580291502091569100230117328464984893798828125", "0.08306760582031029460647886253354954533278942108154296875", "-0.0243259740467122904938879202063617412932217121124267578125", "0.0031488340769664419950546463411455988534726202487945556640625"]
        }, {
            "a": ["1", "-7.6848560140847634869487592368386685848236083984375", "26.135913077783488489558294531889259815216064453125", "-51.35955343475202283798353164456784725189208984375", "63.76954130697384925952064804732799530029296875", "-51.2253025470962910503658349625766277313232421875", "25.9994562321023892081939266063272953033447265625", "-7.6247502137953144796256310655735433101654052734375", "0.9895851970166840150255893604480661451816558837890625"],
            "b": ["0.003148171394063147519870593527002711198292672634124755859375", "-0.024215695789316780961453190457177697680890560150146484375", "0.08244199244253762326462009468741598539054393768310546875", "-0.162191816262089061329021433266461826860904693603515625", "0.20163480269525668742147672674036584794521331787109375", "-0.1621918162620890890845970488953753374516963958740234375", "0.08244199244253765102019571031632949598133563995361328125", "-0.024215695789316794839240998271634452976286411285400390625", "0.0031481713940631496882749384980115792131982743740081787109375"]
        }, {
            "a": ["1", "-7.64721719457797366459317345288582146167755126953125", "25.91888406165383429424764472059905529022216796875", "-50.82861716415563790860687731765210628509521484375", "63.06422684602181760737948934547603130340576171875", "-50.68786457067830042433342896401882171630859375", "25.775535824063066314693060121499001979827880859375", "-7.58386397239359411059922422282397747039794921875", "0.98896932979766116744713144726119935512542724609375"],
            "b": ["0.003147485961700147681641137609176439582370221614837646484375", "-0.024092596782436741242872102475303108803927898406982421875", "0.08174576250813443689668957858884823508560657501220703125", "-0.1605015082390179037563626707196817733347415924072265625", "0.1994018812090694314775873863254673779010772705078125", "-0.160501508239017709467333361317287199199199676513671875", "0.08174576250813425648544807700091041624546051025390625", "-0.0240925967824366683844861114494051435030996799468994140625", "0.0031474859617001359722576747657285523018799722194671630859375"]
        }, {
            "a": ["1", "-7.6050827290031417504678756813518702983856201171875", "25.677230155494751073774750693701207637786865234375", "-50.23933680148233094087117933668196201324462890625", "62.28246165721833449424593709409236907958984375", "-50.09195556482099931372431456111371517181396484375", "25.52679870647158821839184383861720561981201171875", "-7.5383486218802406853001230047084391117095947265625", "0.98831725959591942842763501175795681774616241455078125"],
            "b": ["0.0031467784508537924824389531153201460256241261959075927734375", "-0.0239551868573306299403657959601332549937069416046142578125", "0.08097145337829635136639438997008255682885646820068359375", "-0.15862638270487483538317974307574331760406494140625", "0.196926941292211166167902547385892830789089202880859375", "-0.1586263827048748631387553587046568281948566436767578125", "0.08097145337829635136639438997008255682885646820068359375", "-0.0239551868573306299403657959601332549937069416046142578125", "0.003146778450853793783481560097925466834567487239837646484375"]
        }, {
            "a": ["1", "-7.5579232920865866418580480967648327350616455078125", "25.40837465563756580877452506683766841888427734375", "-49.58605344534255010557899367995560169219970703125", "61.4170437880925845774982008151710033416748046875", "-49.43195228334094082356386934407055377960205078125", "25.2506943270429502490515005774796009063720703125", "-7.48767776782850535965962990303523838520050048828125", "0.98762688461268766104694805108010768890380859375"],
            "b": ["0.0031460498173164143549673799071797475335188210010528564453125", "-0.023801807711288335001054150552590726874768733978271484375", "0.0801109638552685854318013980446266941726207733154296875", "-0.1565485900813401165532212644393439404666423797607421875", "0.194187188401759913691790870871045626699924468994140625", "-0.156548590081340199819948111326084472239017486572265625", "0.080110963855268668698528244931367225944995880126953125", "-0.0238018077112883662260767181351184262894093990325927734375", "0.0031460498173164212938612838144081251812167465686798095703125"]
        }, {
            "a": ["1", "-7.50514967371921226657605075160972774028778076171875", "25.109531525882555769157988834194839000701904296875", "-48.862761482787306022146367467939853668212890625", "60.460383735105011737687163986265659332275390625", "-48.701893282101849536047666333615779876708984375", "24.944470356704329105923534370958805084228515625", "-7.43126726177964513908591470681130886077880859375", "0.9868959842527604831019516495871357619762420654296875"],
            "b": ["0.0031453013481022962065380976781625577132217586040496826171875", "-0.0236306155383953671311747513072987203486263751983642578125", "0.0791555420306107870853651320430799387395381927490234375", "-0.154249197352898603785575915026129223406314849853515625", "0.1911586027921652608529967665162985213100910186767578125", "-0.154249197352898603785575915026129223406314849853515625", "0.07915554203061077320757732422862318344414234161376953125", "-0.0236306155383953532533869434928419650532305240631103515625", "0.0031453013481022936044528837129519160953350365161895751953125"]
        }, {
            "a": ["1", "-7.44610667069874399004447695915587246417999267578125", "24.7777054988402340995889971964061260223388671875", "-48.063144256977238910621963441371917724609375", "59.40456592723791118260123766958713531494140625", "-47.8955157703003209235248505137860774993896484375", "24.605174033719787729523886810056865215301513671875", "-7.36846956214117287942144685075618326663970947265625", "0.986122212807383657917625896516256034374237060546875"],
            "b": ["0.003144534714130216811189821868310900754295289516448974609375", "-0.0234395623083113631424101441780294408090412616729736328125", "0.0780957871820209537094825691383448429405689239501953125", "-0.151708302876379541590523558625136502087116241455078125", "0.187816134595386097227986965663149021565914154052734375", "-0.151708302876379652612826021140790544450283050537109375", "0.07809578718202103697620941602508537471294403076171875", "-0.0234395623083114047757735676213997066952288150787353515625", "0.003144534714130224617445463763942825607955455780029296875"]
        }, {
            "a": ["1", "-7.3800665378408414341038223938085138797760009765625", "24.409698228324696600566312554292380809783935546875", "-47.18063008842405992027124739252030849456787109375", "58.24143916108130980546775390394032001495361328125", "-47.00631286132039576841634698212146759033203125", "24.22965967752612215235785697586834430694580078125", "-7.29856773877112896542485032114200294017791748046875", "0.98530309285075379222007541102357208728790283203125"],
            "b": ["0.0031437520299709754457995192211683388450182974338531494140625", "-0.0232263757164230637275448287937251734547317028045654296875", "0.07692167088816291575792405410538776777684688568115234375", "-0.1489052156954319972026468121839570812880992889404296875", "0.1841339906481345989330833390340558253228664398193359375", "-0.14890521569543191393591996529721654951572418212890625", "0.07692167088816280473562159158973372541368007659912109375", "-0.023226375716423018624734453396740718744695186614990234375", "0.003143752029970967205863008331334640388377010822296142578125"]
        }, {
            "a": ["1", "-7.3062220209997104092281006160192191600799560546875", "24.00212255480317224964892375282943248748779296875", "-46.20847368563050849843421019613742828369140625", "56.962742645586814660418895073235034942626953125", "-46.027616217306359658323344774544239044189453125", "23.814604418230420179725115303881466388702392578125", "-7.2207691568700784756629218463785946369171142578125", "0.9844360083441097142298303879215382039546966552734375"],
            "b": ["0.0031429559215435730161469773946691930177621543407440185546875", "-0.0229885378771640704054224357832936220802366733551025390625", "0.07562258383742925804682499801856465637683868408203125", "-0.145818715238864304861721166162169538438320159912109375", "0.180086034158005892091836130930460058152675628662109375", "-0.1458187152388642771061455505332560278475284576416015625", "0.07562258383742921641346157457519439049065113067626953125", "-0.0229885378771640495887407240616084891371428966522216796875", "0.0031429559215435695467000254410550041939131915569305419921875"]
        }, {
            "a": ["1", "-7.2236790159409292044756512041203677654266357421875", "23.551427445716210939963275450281798839569091796875", "-45.13986867306346795203353394754230976104736328125", "55.56027510967205529368584393523633480072021484375", "-44.952709754493554328291793353855609893798828125", "23.356534673261393209031666629016399383544921875", "-7.1341988986855202625747551792301237583160400390625", "0.98351819744152713109741625885362736880779266357421875"],
            "b": ["0.0031421496027502098837003163822600981802679598331451416015625", "-0.0227232628973214854928297512515200651250779628753662109375", "0.074187416363632852078779933435725979506969451904296875", "-0.142427409445062436166296038209111429750919342041015625", "0.175646320816021883626234512121300213038921356201171875", "-0.1424274094450625749441741163536789827048778533935546875", "0.07418741636363297697887020376583677716553211212158203125", "-0.0227232628973215340650870786021187086589634418487548828125", "0.003142149602750218990998565260497343842871487140655517578125"]
        }, {
            "a": ["1", "-7.13144892539891639415827739867381751537322998046875", "23.053936761184512960198844666592776775360107421875", "-43.9680975607079602696103393100202083587646484375", "54.0261150638639406906804651953279972076416015625", "-43.7749806485168164726928807795047760009765625", "22.8518664715123804853647015988826751708984375", "-7.0378930113794435641239033429883420467376708984375", "0.9825467449931453156608540666638873517513275146484375"],
            "b": ["0.003141336962159332023281077539422767586074769496917724609375", "-0.022427473552159217506929422825123765505850315093994140625", "0.0726046825722580779771675452138879336416721343994140625", "-0.13871021120829174488875423776335082948207855224609375", "0.1707897969795849346663629830800346098840236663818359375", "-0.1387102112082917726443298533922643400728702545166015625", "0.0726046825722580779771675452138879336416721343994140625", "-0.0224274735521592209763763747787379543296992778778076171875", "0.0031413369621593333243236845220280883950181305408477783203125"]
        }, {
            "a": ["1", "-7.0284408238279834080231012194417417049407958984375", "22.50590567776132644439712748862802982330322265625", "-42.686725860669554322157637216150760650634765625", "52.3529006465582682494641630910336971282958984375", "-42.4881142307153965020916075445711612701416015625", "22.29696338033551938906384748406708240509033203125", "-6.9307917079029710549775700201280415058135986328125", "0.9815185747423320616888986478443257510662078857421875"],
            "b": ["0.003140522660979046427887073633655745652504265308380126953125", "-0.022097777399540934062383001901253010146319866180419921875", "0.07086270003781959536670598254204378463327884674072265625", "-0.13464695420901140465730350115336477756500244140625", "0.1654931866175293475595964309832197614014148712158203125", "-0.1346469542090116267019084261846728622913360595703125", "0.07086270003781980353352309975889511406421661376953125", "-0.02209777739954103814579156050967867486178874969482421875", "0.0031405226609790650761644403843320105806924402713775634765625"]
        }, {
            "a": ["1", "-6.913453587514137410607872880063951015472412109375", "21.9035993772565831250176415778696537017822265625", "-41.2898470471472052167882793582975864410400390625", "50.5341773345927691707402118481695652008056640625", "-41.0863393228051592132032965309917926788330078125", "21.688216528775004832141348742879927158355712890625", "-6.811732696919090557230447302572429180145263671875", "0.98043044121497391341080174242961220443248748779296875"],
            "b": ["0.0031397122437120008990596442544074307079426944255828857421875", "-0.021730442812469767666083697577050770632922649383544921875", "0.0689498394503678946332314581013633869588375091552734375", "-0.130219169115535160496932576279505155980587005615234375", "0.159736093219127794906597728186170570552349090576171875", "-0.1302191691155349662079032668771105818450450897216796875", "0.06894983945036770034420214869896881282329559326171875", "-0.0217304428124696739910159948294676723890006542205810546875", "0.0031397122437119835518248844863364865886978805065155029296875"]
        }, {
            "a": ["1", "-6.78516820950316823513048802851699292659759521484375", "21.24339946339173224032492726109921932220458984375", "-39.77238440775540340155203011818230152130126953125", "48.5648209090942373222787864506244659423828125", "-39.56472987044835321057689725421369075775146484375", "21.02215202828074325225315988063812255859375", "-6.67944488014777615347838946036063134670257568359375", "0.9792789213010824056482306332327425479888916015625"],
            "b": ["0.0031389122630491599237612110329109782469458878040313720703125", "-0.0213213755964651897889527987217661575414240360260009765625", "0.06685486123106980371755270198264042846858501434326171875", "-0.12541103904350892062069533494650386273860931396484375", "0.153502340035098494563925441980245523154735565185546875", "-0.1254110390435088095983928724308498203754425048828125", "0.06685486123106965106188681602361612021923065185546875", "-0.02132137559646511693056680769586819224059581756591796875", "0.0031389122630491460459734032184542229515500366687774658203125"]
        }, {
            "a": ["1", "-6.64214059738692608192422994761727750301361083984375", "20.52194448018834549429811886511743068695068359375", "-38.130454204712947330335737206041812896728515625", "46.4415411382231155812405631877481937408447265625", "-37.91956706690965717143626534380018711090087890625", "20.295571941275458272002651938237249851226806640625", "-6.53254273384548778125235912739299237728118896484375", "0.9780604055304114030633400034275837242603302001953125"],
            "b": ["0.0031381304207458693943111338597873327671550214290618896484375", "-0.0208660970944114752823050906727075926028192043304443359375", "0.064567358939395969041896705675753764808177947998046875", "-0.120210547955736102299084677724749781191349029541015625", "0.1467815658784974164330350276941317133605480194091796875", "-0.120210547955736213321387140240403823554515838623046875", "0.0645673589393960523086235525624942965805530548095703125", "-0.02086609709441152038511546606969204731285572052001953125", "0.003138130420745877634247644749621031223796308040618896484375"]
        }, {
            "a": ["1", "-6.4827952511242035171790121239610016345977783203125", "19.736311823896617312357193441130220890045166015625", "-36.3617914991143749148250208236277103424072265625", "44.163468323520561398254358209669589996337890625", "-36.14876305641513454247615300118923187255859375", "19.50573578699901844402120332233607769012451171875", "-6.36952178882683028859901241958141326904296875", "0.976771089046901241914611091488040983676910400390625"],
            "b": ["0.0031373757264315797928244666792352290940470993518829345703125", "-0.020359724979122618970794889037279062904417514801025390625", "0.0620783321029146628600159374400391243398189544677734375", "-0.11461082594777328991231257759864092804491519927978515625", "0.139571083169271137336409083218313753604888916015625", "-0.11461082594777340093461504011429497040808200836181640625", "0.0620783321029147738823183999556931667029857635498046875", "-0.0203597249791226710124991683414918952621519565582275390625", "0.0031373757264315910685270605284813427715562283992767333984375"]
        }, {
            "a": ["1", "-6.305420342124559596186372800730168819427490234375", "18.884249183152508777538969297893345355987548828125", "-34.4662349068265285723100532777607440948486328125", "41.7328198023136991423598374240100383758544921875", "-34.25234219793161827283256570808589458465576171875", "18.6505903186321830844462965615093708038330078125", "-6.18875574429358632499997838749550282955169677734375", "0.9754069622888057455867283351835794746875762939453125"],
            "b": ["0.0031366586765372490332171029336905121454037725925445556640625", "-0.019796958305944113709617937502116546966135501861572265625", "0.0593809136567152451302575855152099393308162689208984375", "-0.108611679262470062212742050178349018096923828125", "0.1318779888308736492064099365961737930774688720703125", "-0.10861167926247013160168108925063279457390308380126953125", "0.059380913656715307580302720680265338160097599029541015625", "-0.01979695830594414840408745703825843520462512969970703125", "0.0031366586765372559721110068409188897931016981601715087890625"]
        }, {
            "a": ["1", "-6.10816486880711106977059898781590163707733154296875", "17.964464281277660262503559351898729801177978515625", "-32.446258733565201737292227335274219512939453125", "39.1556364089547486173614743165671825408935546875", "-32.2329680503549269587892922572791576385498046875", "17.72905582525709888841447536833584308624267578125", "-5.98849589904813495166990833240561187267303466796875", "0.9739638013854932108159800918656401336193084716796875"],
            "b": ["0.003135991455784788682625841005346956080757081508636474609375", "-0.01917206885928990356404710837523452937602996826171875", "0.0564712790787069707221235148608684539794921875", "-0.1022212681628116015541962724455515854060649871826171875", "0.1237214960931218576956069910011137835681438446044921875", "-0.10222126816281172645428654277566238306462764739990234375", "0.05647127907870712337778940081989276222884654998779296875", "-0.019172068859289979891880051354746683500707149505615234375", "0.0031359914557848055961797317792161265970207750797271728515625"]
        }, {
            "a": ["1", "-5.88903875337367299636071038548834621906280517578125", "16.976981936806719630794759723357856273651123046875", "-30.3075295473897057263457099907100200653076171875", "36.442569646895520918405964039266109466552734375", "-30.096492897581700987075237208046019077301025390625", "16.74137731282308294566973927430808544158935546875", "-5.7668737640540523869958633440546691417694091796875", "0.97243715828463461736674844360095448791980743408203125"],
            "b": ["0.003135388163974455778826300189621179015375673770904541015625", "-0.0184789013950282555998061440050150849856436252593994140625", "0.05334976494396621859994667147475411184132099151611328125", "-0.09545785986718613447266079674591310322284698486328125", "0.11513542581163958844481243204427300952374935150146484375", "-0.095457859867186189983812028003740124404430389404296875", "0.053349764943966281049991806639809510670602321624755859375", "-0.018478901395028286824828711587542784400284290313720703125", "0.0031353881639744614166775971142442358541302382946014404296875"]
        }, {
            "a": ["1", "-5.64591697570833872532602981664240360260009765625", "15.9235770230890096854636794887483119964599609375", "-28.059448403373618674550016294233500957489013671875", "33.60968913215105402514382149092853069305419921875", "-27.85249090948116901245157350786030292510986328125", "15.6895483218989912899132832535542547702789306640625", "-5.52190793761739673328747812774963676929473876953125", "0.9708223506288489179638645509839989244937896728515625"],
            "b": ["0.0031348650711326667313294525030187287484295666217803955078125", "-0.017710886073630464909722803668046253733336925506591796875", "0.050022223120804697182872899929861887358129024505615234375", "-0.08835153385711136397873133319080807268619537353515625", "0.10617076026171336222692076489693135954439640045166015625", "-0.0883515338571112252008532550462405197322368621826171875", "0.050022223120804544527207013970837579108774662017822265625", "-0.017710886073630381642995956781305721960961818695068359375", "0.003134865071132646348328609775535369408316910266876220703125"]
        }, {
            "a": ["1", "-5.3765491194600851798668372794054448604583740234375", "14.808290401149587722784417564980685710906982421875", "-25.715618829875015904917745501734316349029541015625", "30.679267551124635104997651069425046443939208984375", "-25.5147151633934896608479903079569339752197265625", "14.57781345949903339942466118372976779937744140625", "-5.2515165833689199104128420003689825534820556640625", "0.969114451404781807042354557779617607593536376953125"],
            "b": ["0.0031344409044489602265970429328945101588033139705657958984375", "-0.0168610672164887752388917618873165338300168514251708984375", "0.046501631966893421099573657784276292659342288970947265625", "-0.08094565050972803155193702195902005769312381744384765625", "0.096898123062171437336331791811971925199031829833984375", "-0.08094565050972811481866386884576058946549892425537109375", "0.046501631966893518244088312485473579727113246917724609375", "-0.01686106721648882034170213728430098854005336761474609375", "0.0031344409044489715022996367821406238363124430179595947265625"]
        }, {
            "a": ["1", "-5.078576038595624453364507644437253475189208984375", "13.6380317844758707224173122085630893707275390625", "-23.29415383308076314960999297909438610076904296875", "27.68048865883597642323366017080843448638916015625", "-23.101392294269654570371130830608308315277099609375", "13.41325243472262940258588059805333614349365234375", "-4.95353715578908992966944424551911652088165283203125", "0.967308278393954612539573645335622131824493408203125"],
            "b": ["0.003134137170841845392021962624085062998346984386444091796875", "-0.0159221535190786182833999617969311657361686229705810546875", "0.042809975986880223486341634497875929810106754302978515625", "-0.07329780972514045311871910826084786094725131988525390625", "0.08741001137732518078138355122064240276813507080078125", "-0.07329780972514039760756787700302083976566791534423828125", "0.042809975986880154097402595425592153333127498626708984375", "-0.0159221535190785801194834903071750886738300323486328125", "0.003134137170841834983681106763242496526800096035003662109375"]
        }, {
            "a": ["1", "-4.7495557451744989663211526931263506412506103515625", "12.42326805899183028714105603285133838653564453125", "-20.81770282110029057776046101935207843780517578125", "24.650015715893147216775105334818363189697265625", "-20.63523680253862124800434685312211513519287109375", "12.2064428081932430103506703744642436504364013671875", "-4.625755370779753405940937227569520473480224609375", "0.9653983834603518943140443298034369945526123046875"],
            "b": ["0.0031339785194551103737758968037496742908842861652374267578125", "-0.01488659603674698239661466914185439236462116241455078125", "0.0389803882812689572734399234832380898296833038330078125", "-0.06547992487275484940756342666645650751888751983642578125", "0.0778225802725228954503933209707611240446567535400390625", "-0.065479924872754835529775618851999752223491668701171875", "0.03898038828126894339565211566878133453428745269775390625", "-0.01488659603674697719244424121143310912884771823883056640625", "0.003133978519455109072733289821144353481940925121307373046875"]
        }, {
            "a": ["1", "-4.38700107382986193016449760762043297290802001953125", "11.178786917327062866434062016196548938751220703125", "-18.313043102426124875137247727252542972564697265625", "21.632357756174794616299550398252904415130615234375", "-18.143031698338944579518283717334270477294921875", "10.97218992711123064509592950344085693359375", "-4.265945819627940949203548370860517024993896484375", "0.963379041717582484949389254325069487094879150390625"],
            "b": ["0.0031339931489058107071110637065203263773582875728607177734375", "-0.0137467016335376703006776466509109013713896274566650390625", "0.035059522941776992410733981841985951177775859832763671875", "-0.05757692415419761455819269713174435310065746307373046875", "0.06827677839567238005091809327495866455137729644775390625", "-0.057576924154197593741510985410059220157563686370849609375", "0.03505952294177695771626446230584406293928623199462890625", "-0.01374670163353764774927245895241867401637136936187744140625", "0.003133993148905805069259766781897269538603723049163818359375"]
        }, {
            "a": ["1", "-3.98843219459661479930900895851664245128631591796875", "9.924512659232600952918801340274512767791748046875", "-15.8100443819400258149698856868781149387359619140625", "18.6799852733962410411550081335008144378662109375", "-15.654587150448566745808420819230377674102783203125", "9.73029957290120961488355533219873905181884765625", "-3.8719270689965288312350821797735989093780517578125", "0.96124424062564173265599265505443327128887176513671875"],
            "b": ["0.003134213264690721874317080875016472418792545795440673828125", "-0.01249479115314476584952529947258881293237209320068359375", "0.0311100838973821965105504006032788311131298542022705078125", "-0.049683478786989039577282056825424660928547382354736328125", "0.058938678282737376468158885245429701171815395355224609375", "-0.049683478786989011821706441196511150337755680084228515625", "0.031110083897382158346633929113522754050791263580322265625", "-0.01249479115314473982867315982048239675350487232208251953125", "0.0031342132646907136343805699851827739621512591838836669921875"]
        }, {
            "a": ["1", "-3.551447616052665789965203657629899680614471435546875", "8.68633236728253876890448736958205699920654296875", "-13.3397859194967356444294637185521423816680908203125", "15.853182308750771056793382740579545497894287109375", "-13.200861599841839932878428953699767589569091796875", "8.506350502239957478423093562014400959014892578125", "-3.44163456569275094665272263227961957454681396484375", "0.95898766907719934504683578779804520308971405029296875"],
            "b": ["0.0031346755928190962910140360264676928636617958545684814453125", "-0.0111234133180979459509796214433663408271968364715576171875", "0.0272133786182668611919321932646198547445237636566162109375", "-0.041898068829751389241522474549128673970699310302734375", "0.04999895573431466233582654012934654019773006439208984375", "-0.041898068829751354547052955012986785732209682464599609375", "0.0272133786182668126196748659140212112106382846832275390625", "-0.0111234133180979181954040058144528302364051342010498046875", "0.0031346755928190858826731801656251263921149075031280517578125"]
        }, {
            "a": ["1", "-3.07381792789127228360257504391483962535858154296875", "7.49686500972950664589689040440134704113006591796875", "-10.931597299778989196283873752690851688385009765625", "13.2196845770852018375762781943194568157196044921875", "-10.8110228713804428224420917103998363018035888671875", "7.33239907327813700277374664437957108020782470703125", "-2.97321515072194575424191498314030468463897705078125", "0.956602706542816871859713501180522143840789794921875"],
            "b": ["0.003135421956487386037359943458113775704987347126007080078125", "-0.009625627245520858299432376270488020963966846466064453125", "0.0234716853243964566899659729415361653082072734832763671875", "-0.034313672582201804051038607212831266224384307861328125", "0.041671670205831894129300252416214789263904094696044921875", "-0.0343136725822017762954629915839177556335926055908203125", "0.0234716853243964289343903573126226547174155712127685546875", "-0.00962562724552083748275066454880288802087306976318359375", "0.003135421956487373894295611620464114821515977382659912109375"]
        }, {
            "a": ["1", "-2.553607143532631962301593375741504132747650146484375", "6.39607208305034280471090823994018137454986572265625", "-8.6088244333087278192806479637511074542999267578125", "10.854244495438734929848578758537769317626953125", "-8.5082592641345531347951691714115440845489501953125", "6.2475154346579717667964359861798584461212158203125", "-2.4651474450507091518147717579267919063568115234375", "0.954082412356116460472321705310605466365814208984375"],
            "b": ["0.0031364999234594803829978548748158573289401829242706298828125", "-0.00799536840045549611344366525145233026705682277679443359375", "0.020010117074622753297052923926457879133522510528564453125", "-0.027004465049991328851053395965209347195923328399658203125", "0.034192786399996961954617091805630479939281940460205078125", "-0.02700446504999132191215949205798096954822540283203125", "0.0200101170746227498276059719728436903096735477447509765625", "-0.00799536840045549611344366525145233026705682277679443359375", "0.003136499923459479081955247892210536519996821880340576171875"]
        }, {
            "a": ["1", "-1.9893270646373288901287423868780024349689483642578125", "5.43156539549209949058194979443214833736419677734375", "-6.38321989057308147863523117848671972751617431640625", "8.838373711516648967290166183374822139739990234375", "-6.3042493194665230049622550723142921924591064453125", "5.29800976033266834974710945971310138702392578125", "-1.9163927404269502918765510912635363638401031494140625", "0.951419515232623691503022200777195394039154052734375"],
            "b": ["0.0031379635327798863046744326510406608576886355876922607421875", "-0.006227914644648356590206361715900129638612270355224609375", "0.0169775329904475920372863839702404220588505268096923828125", "-0.0200082208220181585744956720418485929258167743682861328125", "0.0278192248505873575281643894641092629171907901763916015625", "-0.02000822082201818286062433571714791469275951385498046875", "0.016977532990447630201202855459996499121189117431640625", "-0.006227914644648378274249811425988809787668287754058837890625", "0.0031379635327799001824622404654974161530844867229461669921875"]
        }, {
            "a": ["1", "-1.380130514554096965440521671553142368793487548828125", "4.658415811671599016108302748762071132659912109375", "-4.2480564384068681960116009577177464962005615234375", "7.26061066603634941429845639504492282867431640625", "-4.192398505174114831106635392643511295318603515625", "4.53715831549694570412611938081681728363037109375", "-1.326581223545025611798564568744041025638580322265625", "0.9486064031298202525732676804182119667530059814453125"],
            "b": ["0.0031398741105461251688080182020712527446448802947998046875", "-0.004320470545878750921742206259068552753888070583343505859375", "0.01454588695948037975480549022222476196475327014923095703125", "-0.01330474753991931109731172711008184705860912799835205078125", "0.022829537900090006441455869889978202991187572479248046875", "-0.0133047475399192816070126355043612420558929443359375", "0.01454588695948032424365425896439774078316986560821533203125", "-0.00432047054587872229880485264175149495713412761688232421875", "0.0031398741105461043521263064803861198015511035919189453125"]
        }, {
            "a": ["1", "-0.7260494478026007225679450129973702132701873779296875", "4.1382085781883990449614429962821304798126220703125", "-2.17040519529577746737913912511430680751800537109375", "6.21768004514421335215956787578761577606201171875", "-2.140290454252888441288860121858306229114532470703125", "4.02418537477497562093731175991706550121307373046875", "-0.69623825172982456432890785436029545962810516357421875", "0.94563511357162355341898773986031301319599151611328125"],
            "b": ["0.0031423011857232598098566000999198877252638339996337890625", "-0.0022728889338777999960805598078650291427038609981536865234375", "0.01290722488638011179740150424777311854995787143707275390625", "-0.00679175365156628636775781870937862549908459186553955078125", "0.01952737306598380240263423957003396935760974884033203125", "-0.00679175365156628636775781870937862549908459186553955078125", "0.01290722488638011179740150424777311854995787143707275390625", "-0.0022728889338777999960805598078650291427038609981536865234375", "0.0031423011857232598098566000999198877252638339996337890625"]
        }, {
            "a": ["1", "-0.02828365062951969377547101203163038007915019989013671875", "3.93703202979411770456863450817763805389404296875", "-0.0835420338110393900787897791815339587628841400146484375", "5.8167434589456643578841976705007255077362060546875", "-0.0823144917851033330880028415776905603706836700439453125", "3.82220420880053080026073075714521110057830810546875", "-0.0270548016946264326121340815234361798502504825592041015625", "0.94249732457769208604503319293144159018993377685546875"],
            "b": ["0.0031453235184254794108704711419477462186478078365325927734375", "-8.854830037687463884475691511255490695475600659847259521484375e-05", "0.01226736098752331978467555728684601490385830402374267578125", "-0.000261191668231922839542302750004409972461871802806854248046875", "0.0182483641949063961351651386166849988512694835662841796875", "-0.000261191668231925441627516715215051590348593890666961669921875", "0.01226736098752325733463042212179061607457697391510009765625", "-8.8548300376877281587552348529612800120958127081394195556640625e-05", "0.0031453235184254490532096415478235940099693834781646728515625"]
        }, {
            "a": ["1", "0.710455259299239916259693927713669836521148681640625", "4.122038181222944075443592737428843975067138671875", "2.118836758087095262226284830830991268157958984375", "6.17843223919996287207823115750215947628021240234375", "2.085867043542605880901419368456117808818817138671875", "3.99477969641708607895225213724188506603240966796875", "0.6777951179509276169454778937506489455699920654296875", "0.93918434635691927514500321194645948708057403564453125"],
            "b": ["0.003149030254750414918596401747663549031130969524383544921875", "0.002224597701667421247029299280484337941743433475494384765625", "0.0128351163207806630295326755231144488789141178131103515625", "0.006618639325427457496819894089412628090940415859222412109375", "0.0193694962772938787665122362113834242336452007293701171875", "0.00661863932542746703779901196185164735652506351470947265625", "0.01283511632078071333651347885052018682472407817840576171875", "0.002224597701667431655370155141326904413290321826934814453125", "0.0031490302547504387710441964287610971950925886631011962890625"]
        }, {
            "a": ["1", "1.4855419063069070784166569865192286670207977294921875", "4.756194795318943846496040350757539272308349609375", "4.5840326566645419603673872188664972782135009765625", "7.4393319031068383395677301450632512569427490234375", "4.5084978735564344987096774275414645671844482421875", "4.60076509963202884279098725528456270694732666015625", "1.41328969336724430405638486263342201709747314453125", "0.935687113945204540499389622709713876247406005859375"],
            "b": ["0.003153522224171942910098120904649476869963109493255615234375", "0.004652787730474855325268901395929788122884929180145263671875", "0.0148059469814993578673512075738472049124538898468017578125", "0.0143072205586738006310998372327958350069820880889892578125", "0.0233167800327377210123369621896927128545939922332763671875", "0.01430722055867380583527026516321711824275553226470947265625", "0.01480594698149936307152163550426848814822733402252197265625", "0.0046527877304748561926306393843333353288471698760986328125", "0.0031535222241719450785024658756583448848687112331390380859375"]
        }, {
            "a": ["1", "-7.43749872761397767817470594309270381927490234375", "24.72954997428707457629570853896439075469970703125", "-47.94740681004875426651778980158269405364990234375", "59.25189976454220186496968381106853485107421875", "-47.778857067079798071063123643398284912109375", "24.55599192986218071155235520564019680023193359375", "-7.35933913229470260120024249772541224956512451171875", "0.986012841327085443055011637625284492969512939453125"],
            "b": ["0.00314442848862849823332599186187508166767656803131103515625", "-0.023411746004326029757525162722231470979750156402587890625", "0.07794208079916621623173256239169859327375888824462890625", "-0.1513406217731783354185637335831415839493274688720703125", "0.1873328325455373144503568028085283003747463226318359375", "-0.151340621773178474196441811727709136903285980224609375", "0.07794208079916631337624721709289588034152984619140625", "-0.0234117460043260748603355381192159256897866725921630859375", "0.0031444284886285064732625027517087801243178546428680419921875"]
        }, {
            "a": ["1", "-7.370440011388691203819689690135419368743896484375", "24.3563313062183368629121105186641216278076171875", "-47.0530250575785515820825821720063686370849609375", "58.0734443623396856537510757334530353546142578125", "-46.877802066187967966470750980079174041748046875", "24.17526586419163692198708304204046726226806640625", "-7.28840512567108600450183075736276805400848388671875", "0.98518731451036944957166952008265070617198944091796875"],
            "b": ["0.0031436437997640581491765043864461404155008494853973388671875", "-0.023195340053373307565021121945392224006354808807373046875", "0.0767514995070042449487601743385312147438526153564453125", "-0.1485000073040695089954255081465817056596279144287109375", "0.183602168182194380730010152547038160264492034912109375", "-0.148500007304069592262152355033322237432003021240234375", "0.0767514995070043559710626368541852571070194244384765625", "-0.0231953400533733596067254012496050563640892505645751953125", "0.003143643799764068123836491253086933284066617488861083984375"]
        }, {
            "a": ["1", "-7.295459839704793836290264152921736240386962890625", "23.943067201919159714407214778475463390350341796875", "-46.06807020171044797507420298643410205841064453125", "56.778288886150193093271809630095958709716796875", "-45.88633400576598120323978946544229984283447265625", "23.75453164996476829173843725584447383880615234375", "-7.2094596266664030537185681168921291828155517578125", "0.98431345392631841573205520035116933286190032958984375"],
            "b": ["0.00314284608993541624000211953671168885193765163421630859375", "-0.0229539179137308209377454915056659956462681293487548828125", "0.07543445423578776232176323901512660086154937744140625", "-0.1453730525712303156549154437016113661229610443115234375", "0.1795021152744003811729811559416702948510646820068359375", "-0.1453730525712301491214617499281303025782108306884765625", "0.07543445423578758191052173742718878202140331268310546875", "-0.022953917913730741140465596572539652697741985321044921875", "0.0031428460899354006274908357454478391446173191070556640625"]
        }, {
            "a": ["1", "-7.2116516328121793577565767918713390827178955078125", "23.486186864534513318858444108627736568450927734375", "-44.98573825672605153158656321465969085693359375", "55.3582561014741685312401386909186840057373046875", "-44.79774110233203288089498528279364109039306640625", "23.290297863009353562802061787806451320648193359375", "-7.121615933319983327010049833916127681732177734375", "0.983388477197058019640962811536155641078948974609375"],
            "b": ["0.0031420386600223941531151439221503096632659435272216796875", "-0.022684655214005498835572183224940090440213680267333984375", "0.07397977538718970846876032965155900456011295318603515625", "-0.1419383762112065294758167510735802352428436279296875", "0.1750068062286325443199785922843148000538349151611328125", "-0.14193837621120641845351428855792619287967681884765625", "0.0739797753871896113242456749503617174923419952392578125", "-0.022684655214005457202208759781569824554026126861572265625", "0.0031420386600223867805403710207201584125868976116180419921875"]
        }, {
            "a": ["1", "-7.11801325396125417199755247565917670726776123046875", "22.982000974570706119948226842097938060760498046875", "-43.7993379299805241089416085742413997650146484375", "53.8054831469655567843801691196858882904052734375", "-43.60543876414757136217303923331201076507568359375", "22.778969486414677447783105890266597270965576171875", "-7.023897377438604650023989961482584476470947265625", "0.98240944759092829752233910767245106399059295654296875"],
            "b": ["0.003141225498283598503712621408112681820057332515716552734375", "-0.022384433006310773539571101764522609300911426544189453125", "0.0723759381504724685907348202817956916987895965576171875", "-0.1381749773902509748069178385776467621326446533203125", "0.170091373758028907570150067840586416423320770263671875", "-0.1381749773902508360290397604330792091786861419677734375", "0.0723759381504722743017055108794011175632476806640625", "-0.0223844330063106833339503509705536998808383941650390625", "0.0031412254982835833248822066110506057157181203365325927734375"]
        }, {
            "a": ["1", "-7.0134391588725772948009762330912053585052490234375", "22.4267608704094385529970168136060237884521484375", "-42.50249130809469733094374532811343669891357421875", "52.1127101907157310733964550308883190155029296875", "-42.30317101130889767546250368468463420867919921875", "22.216908578834111409605611697770655155181884765625", "-6.9152305314892128507153756800107657909393310546875", "0.98137326617766162950573516354779712855815887451171875"],
            "b": ["0.003140411379979754329105912091790742124430835247039794921875", "-0.022049813837148123096820739874601713381707668304443359375", "0.070611250867200714420590657027787528932094573974609375", "-0.1340628723656745735492989979320554994046688079833984375", "0.1647328657354578951288459620627691037952899932861328125", "-0.134062872365674434771420919787487946450710296630859375", "0.0706112508672005478871369632543064653873443603515625", "-0.022049813837148039830093892987861181609332561492919921875", "0.0031404113799797391502754972947286660200916230678558349609375"]
        }, {
            "a": ["1", "-6.89671253661237670939954114146530628204345703125", "21.816740689403726349837597808800637722015380859375", "-41.0893862704877932401359430514276027679443359375", "50.27363803479396864304362679831683635711669921875", "-40.88526319486080495835267356596887111663818359375", "21.600517715546146746419253759086132049560546875", "-6.79443857315565136190116390935145318508148193359375", "0.980276663675516690688027665601111948490142822265625"],
            "b": ["0.003139601979881427411267491578428234788589179515838623046875", "-0.02167701781590890275364102990351966582238674163818359375", "0.06867411551372105960044933681274414993822574615478515625", "-0.12958389418426474737344733512145467102527618408203125", "0.158911378439372696913522986505995504558086395263671875", "-0.129583894184264802884598566379281692206859588623046875", "0.068674115513721101233812760256114415824413299560546875", "-0.02167701781590893050921664553243317641317844390869140625", "0.0031396019798814330491187885030512916273437440395355224609375"]
        }, {
            "a": ["1", "-6.7664976710153030836636389722116291522979736328125", "21.148348054556674213699807296507060527801513671875", "-39.555086522087179901063791476190090179443359375", "48.28336186379483052633077022619545459747314453125", "-39.3469317138619913976071984507143497467041015625", "20.9263516181662936332941171713173389434814453125", "-6.66023505564044260296441279933787882328033447265625", "0.97911619199082189357596917034243233501911163330078125"],
            "b": ["0.003138803999242789112555929165182533324696123600006103515625", "-0.021261899376548661078079049957523238845169544219970703125", "0.066553377698017668340213504052371717989444732666015625", "-0.1247226739033725773087013521944754756987094879150390625", "0.1526114309388862666505559673169045709073543548583984375", "-0.12472267390337253567533792875110520981252193450927734375", "0.0665533776980176405846378884234582073986530303955078125", "-0.021261899376548647200291242143066483549773693084716796875", "0.003138803999242785643108977211568344500847160816192626953125"]
        }, {
            "a": ["1", "-6.621332832959350156443179002963006496429443359375", "20.41826980734567342778973397798836231231689453125", "-37.8959033406807037636099266819655895233154296875", "46.1388862352076642991960397921502590179443359375", "-37.6846545932154555202941992320120334625244140625", "20.191263240306600579287987784482538700103759765625", "-6.5112184125711252136170514859259128570556640625", "0.97788821545204296370457086595706641674041748046875"],
            "b": ["0.003138025309011939316394812493626886862330138683319091796875", "-0.0207999256719020551853471800995976082049310207366943359375", "0.06423878638204515156839846667935489676892757415771484375", "-0.1194678159889705215679356342661776579916477203369140625", "0.145823596688593848380577355783316306769847869873046875", "-0.1194678159889706048346624811529181897640228271484375", "0.06423878638204526259070092919500893913209438323974609375", "-0.02079992567190210028815755549658206291496753692626953125", "0.0031380253090119475563313233834605853189714252948760986328125"]
        }, {
            "a": ["1", "-6.45962411607007158664828239125199615955352783203125", "19.62366020060867555230288417078554630279541015625", "-36.1098298301744335958574083633720874786376953125", "43.839722876925833361383411101996898651123046875", "-35.89660344565845662145875394344329833984375", "19.392591408464493696328645455650985240936279296875", "-6.34586762700013107263430356397293508052825927734375", "0.97658890174346069112942814172129146754741668701171875"],
            "b": ["0.0031372751112594653155607460348619497381150722503662109375", "-0.0202861578470911914362506678344288957305252552032470703125", "0.06172158633257797399895849821405136026442050933837890625", "-0.1138132700542775210816870412600110284984111785888671875", "0.1385463971677854677633234814493334852159023284912109375", "-0.11381327005427747944832361781664076261222362518310546875", "0.061721586332577925426701170863452716730535030364990234375", "-0.0202861578470911706195689561127437627874314785003662109375", "0.003137275111259461846113794081247760914266109466552734375"]
        }, {
            "a": ["1", "-6.279640756269532886335582588799297809600830078125", "18.762379789261306228809189633466303348541259765625", "-34.19703305710198293354551424272358417510986328125", "41.388567539488093416366609744727611541748046875", "-33.9831319057288823159979074262082576751708984375", "18.528397840138037366841672337613999843597412109375", "-6.1625396183401424110570587799884378910064697265625", "0.9752142125458436172635856564738787710666656494140625"],
            "b": ["0.003136564121043189899695757816289187758229672908782958984375", "-0.019715236821875294082051510713426978327333927154541015625", "0.058995268797513343572713750972980051301419734954833984375", "-0.10775988396341172614878445301656029187142848968505859375", "0.130788445485122750699957805409212596714496612548828125", "-0.10775988396341175390436006864547380246222019195556640625", "0.058995268797513385206077174416350317187607288360595703125", "-0.0197152368218753183681801743887263000942766666412353515625", "0.0031365641210431942365044477583069237880408763885498046875"]
        }, {
            "a": ["1", "-6.079512634089411449167528189718723297119140625", "17.83329385461291138881279039196670055389404296875", "-32.1603911895998635372961871325969696044921875", "38.7920447670014283403361332602798938751220703125", "-31.94730737152594457484156009741127490997314453125", "17.5977618364808421347333933226764202117919921875", "-5.95946905349706934629239185596816241741180419921875", "0.97375989389534922668900662756641395390033721923828125"],
            "b": ["0.0031359047711914437260583010669279246940277516841888427734375", "-0.0190813756868920582354665071989074931479990482330322265625", "0.05605650767203786133396903323955484665930271148681640625", "-0.1013170972361653043858353839823394082486629486083984375", "0.12257080437923760507512582762501551769673824310302734375", "-0.10131709723616537377477442305462318472564220428466796875", "0.056056507672037937661801976219067000783979892730712890625", "-0.01908137568689209639938297868866357021033763885498046875", "0.003135904771191451965994811956761623150669038295745849609375"]
        }, {
            "a": ["1", "-5.857230853526335323522289399988949298858642578125", "16.836639366318564725588657893240451812744140625", "-30.006050811494620944586131372489035129547119140625", "36.06149991093525386531837284564971923828125", "-29.795460998574522903936667717061936855316162109375", "16.60114097062646720814882428385317325592041015625", "-5.7347714736181529815439716912806034088134765625", "0.9722214662753128067151919822208583354949951171875"],
            "b": ["0.0031353114427832931045136977132870015338994562625885009765625", "-0.018378361402738650764998595832366845570504665374755859375", "0.05290630882211959373773169090782175771892070770263671875", "-0.0945046960155996040864323504138155840337276458740234375", "0.11392949267920456091207626059258473105728626251220703125", "-0.09450469601559956245306892697044531814754009246826171875", "0.052906308822119559043262171371679869480431079864501953125", "-0.018378361402738629948316884110681712627410888671875", "0.0031353114427832887677050077712692655040882527828216552734375"]
        }, {
            "a": ["1", "-5.61065252858051710660447497502900660037994384765625", "15.77446893028631080824197852052748203277587890625", "-27.743963064151326847195377922616899013519287109375", "33.213806300435720686436980031430721282958984375", "-27.537714504049287000952972448430955410003662109375", "15.5408053736596389882151925121434032917022705078125", "-5.486450850603755924339566263370215892791748046875", "0.9705942144601722443297830977826379239559173583984375"],
            "b": ["0.003134800724435882028628963524852224509231746196746826171875", "-0.017599569202451266491937786895505269058048725128173828125", "0.049551398353253693629394405206767260096967220306396484375", "-0.0873544988469493743910021521514863707125186920166015625", "0.10491803793238115016794864686744404025375843048095703125", "-0.08735449884694941602436557559485663659870624542236328125", "0.04955139835325374220165173255736590363085269927978515625", "-0.017599569202451294247513402524418779648840427398681640625", "0.00313480072443588810016112944367705495096743106842041015625"]
        }, {
            "a": ["1", "-5.3375111948174893683471964322961866855621337890625", "14.651178479333566428977064788341522216796875", "-25.38833539426701690899790264666080474853515625", "30.272143120850440567437544814310967922210693359375", "-25.18842071816953875895706005394458770751953125", "14.421351354042901249385977280326187610626220703125", "-5.21241295247478664265372572117485105991363525390625", "0.96887317713564080623456220564548857510089874267578125"],
            "b": ["0.0031343917038810912602253555547804353409446775913238525390625", "-0.0167379939567373348108247910204227082431316375732421875", "0.046005870168878963688552374833307112567126750946044921875", "-0.0799117737559109364564591260204906575381755828857421875", "0.09560993345109071450682591830627643503248691558837890625", "-0.0799117737559109364564591260204906575381755828857421875", "0.046005870168878963688552374833307112567126750946044921875", "-0.0167379939567373348108247910204227082431316375732421875", "0.00313439170388109082654448656057866173796355724334716796875"]
        }, {
            "a": ["1", "-5.0354346043586506453948459238745272159576416015625", "13.4741220765752274246551678515970706939697265625", "-22.957908042679076032754892366938292980194091796875", "27.26668811764141509002001839689910411834716796875", "-22.766427599266602754823907162062823772430419921875", "13.250296529408547741013535414822399616241455078125", "-4.9104862077368398587395859067328274250030517578125", "0.9670531363248795475584529413026757538318634033203125"],
            "b": ["0.003134106295731309450858237397596894879825413227081298828125", "-0.0157863037864054041314876286605795030482113361358642578125", "0.042293102418836818479075390087018604390323162078857421875", "-0.0722361003736879947467741658329032361507415771484375", "0.086100821399841265257890654538641683757305145263671875", "-0.07223610037368810576907662834855727851390838623046875", "0.042293102418836957256953468231586157344281673431396484375", "-0.0157863037864054804593205716400916571728885173797607421875", "0.0031341062957313298338590801250802542199380695819854736328125"]
        }, {
            "a": ["1", "-4.701972063580004856930827372707426548004150390625", "12.2543113825413545470155440852977335453033447265625", "-20.47593138588525363275039126165211200714111328125", "24.235161922478372531486456864513456821441650390625", "-20.2950430568863424696246511302888393402099609375", "12.03875269295399874636132153682410717010498046875", "-4.5784521183147841583149784128181636333465576171875", "0.96512860665704558460475936954026110470294952392578125"],
            "b": ["0.00313396960980343898539590696827872307039797306060791015625", "-0.0147369224143719390607287778038880787789821624755859375", "0.038447934112071459333836997984690242446959018707275390625", "-0.0644012874509878041617838562160613946616649627685546875", "0.07651019980918667695579671317318570800125598907470703125", "-0.06440128745098772089505700932932086288928985595703125", "0.038447934112071369128216247190721333026885986328125", "-0.01473692241437188528430102252286815200932323932647705078125", "0.003133969609803424240246361165418420569039881229400634765625"]
        }, {
            "a": ["1", "-4.3346339360987666822211394901387393474578857421875", "11.0071881487561800128105460316874086856842041015625", "-17.969683701924584084963498753495514392852783203125", "21.2231623454707829523613327182829380035400390625", "-17.80154232565080718586614239029586315155029296875", "10.80216338854177848816107143647968769073486328125", "-4.21408767781510373851006079348735511302947998046875", "0.9630938245215288073808324043056927621364593505859375"],
            "b": ["0.0031340103648983953614493014327990749734453856945037841796875", "-0.0135821481510238484258223934375564567744731903076171875", "0.0345190643652012185693678247844218276441097259521484375", "-0.056493842012124310947296379481485928408801555633544921875", "0.0669824555980441938007885482875281013548374176025390625", "-0.0564938420121242901306146677598007954657077789306640625", "0.034519064365201197752686113062736694701015949249267578125", "-0.01358214815102383454803458562309970147907733917236328125", "0.003134010364898391458321480484983112546615302562713623046875"]
        }, {
            "a": ["1", "-3.9309464578105437482236084179021418094635009765625", "9.7534444015709755859688812051899731159210205078125", "-15.469333185889507120691632735542953014373779296875", "18.28424365633217263393817120231688022613525390625", "-15.316025153763074939661237294785678386688232421875", "9.5610795575573153115556124248541891574859619140625", "-3.815222701404058280871822717017494142055511474609375", "0.960942737159637960786540133995003998279571533203125"],
            "b": ["0.0031342613535286713462302277122262239572592079639434814453125", "-0.0123143190012197471794319625360003556124866008758544921875", "0.03057159396401865070203029972617514431476593017578125", "-0.04860937530960163233118009884492494165897369384765625", "0.057687077655534123310498983983052312396466732025146484375", "-0.048609375309601639270074002752153319306671619415283203125", "0.0305715939640186611103711555870177107863128185272216796875", "-0.01231431900121975585304934242003582767210900783538818359375", "0.0031342613535286748156771796658404127811081707477569580078125"]
        }, {
            "a": ["1", "-3.4885255874064622361174770048819482326507568359375", "8.519845458921547987074518459849059581756591796875", "-13.005921148231010420204256661236286163330078125", "15.4797346999417726465253508649766445159912109375", "-12.869404768556929496980956173501908779144287109375", "8.34192743772245393074626917950809001922607421875", "-3.379815452618109450355632361606694757938385009765625", "0.95866899175457154225199474240071140229701995849609375"],
            "b": ["0.0031347599637587576781871945286184200085699558258056640625", "-0.010926035150044387245227284211068763397634029388427734375", "0.0266895681021789669962185342910743202082812786102294921875", "-0.0408462481146363298734058844274841248989105224609375", "0.04881802603309577659462803467249614186584949493408203125", "-0.040846248114636336812299788334712502546608448028564453125", "0.026689568102178977404559390151916886679828166961669921875", "-0.0109260351500443976535681400719113298691809177398681640625", "0.0031347599637587589792298015112237408175133168697357177734375"]
        }, {
            "a": ["1", "-3.00517422587821858570578115177340805530548095703125", "7.33998420081357760835771841811947524547576904296875", "-10.6082386901586307459410818410106003284454345703125", "12.878356351370104704301411402411758899688720703125", "-10.490307750476599579769754200242459774017333984375", "7.177696904655402221351323532871901988983154296875", "-2.90605043699696796721809732844121754169464111328125", "0.9562659245906910410184309512260369956493377685546875"],
            "b": ["0.003135548765083880085047240982021321542561054229736328125", "-0.0094104519797177654805153679262730292975902557373046875", "0.0229782961175991999602796767021573032252490520477294921875", "-0.03329574590366234099203524010590626858174800872802734375", "0.04059244349207032087623048255409230478107929229736328125", "-0.033295745903662320175353528384221135638654232025146484375", "0.022978296117599168735257109119629603810608386993408203125", "-0.00941045197971774639855713218139499076642096042633056640625", "0.003135548765083872278791599086389396688900887966156005859375"]
        }, {
            "a": ["1", "-2.47900774694970404965488341986201703548431396484375", "6.2548598633350191988711230806075036525726318359375", "-8.2984071562753030093517736531794071197509765625", "10.555793527387638874870390282012522220611572265625", "-8.2007036932537857865099795162677764892578125", "6.10844461447488651373305401648394763469696044921875", "-2.39246268250720905967909857281483709812164306640625", "0.95372655036493514391082726433523930609226226806640625"],
            "b": ["0.0031366761661352948915848504185532874544151127338409423828125", "-0.007761658699896874236134891589244944043457508087158203125", "0.0195661150503688603674579127300603431649506092071533203125", "-0.0260281971817258421519891697926141205243766307830810546875", "0.033249195004212583892666543761151842772960662841796875", "-0.0260281971817258074575196502564722322858870029449462890625", "0.019566115050368815264647537333075888454914093017578125", "-0.007761658699896849082644489925542075070552527904510498046875", "0.00313667616613528231483964958670185296796262264251708984375"]
        }, {
            "a": ["1", "-1.908613328903812966785835669725202023983001708984375", "5.31313036252814896442941972054541110992431640625", "-6.0860818879256957103507374995388090610504150390625", "8.5944874191974349741940386593341827392578125", "-6.0101938527610645479626327869482338428497314453125", "5.181464187990219016910486971028149127960205078125", "-1.8380931795983332932564735529012978076934814453125", "0.951043551745580639789068300160579383373260498046875"],
            "b": ["0.003138197152981502154045490016187613946385681629180908203125", "-0.00597515948154474230147314983696560375392436981201171875", "0.01660512688913214074393209784830105490982532501220703125", "-0.0190747949369435530753147389759760699234902858734130859375", "0.027048070819325441271896437456234707497060298919677734375", "-0.0190747949369435322586330272542909369803965091705322265625", "0.01660512688913211298835648221938754431903362274169921875", "-0.005975159481544725821600128057298206840641796588897705078125", "0.003138197152981496949875062085766330710612237453460693359375"]
        }, {
            "a": ["1", "-1.293248975911006848349416031851433217525482177734375", "4.57083429540065377949531466583721339702606201171875", "-3.9614156758043606032515526749193668365478515625", "7.08400465477181118245653124176897108554840087890625", "-3.90910433359342857073670529644005000591278076171875", "4.45092607013865571019550770870409905910491943359375", "-1.2426803155842180981238698223023675382137298583984375", "0.94820926928825455259897125870338641107082366943359375"],
            "b": ["0.003140174117913778484290077130935969762504100799560546875", "-0.0040484754220915970812644246734635089524090290069580078125", "0.014270276187751396168579276491072960197925567626953125", "-0.0124055656508273957905341688956468715332448482513427734375", "0.0222707789618358520389307386722066439688205718994140625", "-0.01240556565082739058636374096522558829747140407562255859375", "0.0142702761877513788213445167230020160786807537078857421875", "-0.004048475422091592744455734731445772922597825527191162109375", "0.0031401741179137737138005181947164601297117769718170166015625"]
        }, {
            "a": ["1", "-0.63308822770019179682066123859840445220470428466796875", "4.0903200402683097536282730288803577423095703125", "-1.887283511971484362135242918157018721103668212890625", "6.1223413781405735534235645900480449199676513671875", "-1.8608908708546980648179669515229761600494384765625", "3.976735614441107902194971757126040756702423095703125", "-0.6068919733936304350407908714259974658489227294921875", "0.94521569183452747164864149453933350741863250732421875"],
            "b": ["0.003142677789884648111018439209374264464713633060455322265625", "-0.00198188636029558544471296244182667578570544719696044921875", "0.0127559539108767668047494936445218627341091632843017578125", "-0.005905078542790564467834801831713775754906237125396728515625", "0.0192248619731365498475295083835590048693120479583740234375", "-0.00590507854279056186574958786650313413701951503753662109375", "0.01275595391087675119223820985325801302678883075714111328125", "-0.001981886360295582842627748476616034167818725109100341796875", "0.003142677789884639437401059325338792405091226100921630859375"]
        }, {
            "a": ["1", "0.070483816046842395763860622537322342395782470703125", "3.93806119424765288528078599483706057071685791015625", "0.208180971112347956708532592529081739485263824462890625", "5.81831600967038387040020097629167139530181884765625", "0.20509793421438704541515107848681509494781494140625", "3.822305998904834467566615785472095012664794921875", "0.0673977160859625945565909432843909598886966705322265625", "0.94205444753588574169356206766678951680660247802734375"],
            "b": ["0.0031457882792377809579031922027070322656072676181793212890625", "0.00022066904707871421559804703260709857204346917569637298583984375", "0.0122691348567959095106072453518208931200206279754638671875", "0.000650792122193332030731516280042114885873161256313323974609375", "0.018251035668920521926050781758021912537515163421630859375", "0.00065079212219333105494956104308812427916564047336578369140625", "0.01226913485679595634814109672561244224198162555694580078125", "0.0002206690470787132127110374835154971151496283710002899169921875", "0.00314578827923780481035098688380458042956888675689697265625"]
        }, {
            "a": ["1", "0.81451866051344190555738578041200526058673858642578125", "4.18099199543821153923772726557217538356781005859375", "2.43694409263870692683440211112610995769500732421875", "6.29463572002083271428318766993470489978790283203125", "2.39872601263877260890922116232104599475860595703125", "4.050904831064176647714702994562685489654541015625", "0.77678443379909456467657946632243692874908447265625", "0.93871679566537025163341922961990348994731903076171875"],
            "b": ["0.003149596251061461717191125586623456911183893680572509765625", "0.0025505192574470964168853459597130495239980518817901611328125", "0.01301791716304026395867321497235025162808597087860107421875", "0.00761141762831933459121369622835118207149207592010498046875", "0.0197326633356209764358357716673708637244999408721923828125", "0.00761141762831931030508503255305186030454933643341064453125", "0.01301791716304019803918112785368066397495567798614501953125", "0.002550519257447074299161027255422595771960914134979248046875", "0.0031495962510614300584876890098939838935621082782745361328125"]
        }, {
            "a": ["1", "1.5940945349818156362431409434066154062747955322265625", "4.880983489852869894320974708534777164459228515625", "4.951642526612705097477373783476650714874267578125", "7.6901186521756823566420280258171260356903076171875", "4.8694081049970758812150961603038012981414794921875", "4.72022941525666528406190991518087685108184814453125", "1.515962579825427258839454225380904972553253173828125", "0.93519361939981193732052133782417513430118560791015625"],
            "b": ["0.0031542042434569371976704754700904231867752969264984130859375", "0.004993001887185560642989923252343942294828593730926513671875", "0.01519429535988209116481595373215895961038768291473388671875", "0.01545287468664518874816860005694252322427928447723388671875", "0.02410261184212365848100745324700255878269672393798828125", "0.01545287468664515405369908052080063498578965663909912109375", "0.01519429535988203218421777052071774960495531558990478515625", "0.004993001887185529417967355669816242880187928676605224609375", "0.00315420424345691334522268078899287502281367778778076171875"]
        }, {
            "a": ["1", "2.40185011521700797487710588029585778713226318359375", "6.0871317119466379352843432570807635784149169921875", "7.93779845416464180374305215082131326198577880859375", "10.157825439529748479117188253439962863922119140625", "7.798199563944510970259216264821588993072509765625", "5.874925100813658929155280929990112781524658203125", "2.277311182988524418391307335696183145046234130859375", "0.93147541977880321528715512613416649401187896728515625"],
            "b": ["0.003159728149288692188034755048420265666209161281585693359375", "0.007526022393373442594122213478158300858922302722930908203125", "0.0189501578477617692308765384723301394842565059661865234375", "0.0247531787239566626601661170070656226016581058502197265625", "0.031837299068883932740003928074656869284808635711669921875", "0.02475317872395664531293135723899467848241329193115234375", "0.0189501578477617484141948267506450065411627292633056640625", "0.007526022393373426981610929686894451151601970195770263671875", "0.0031597281492886856828217201353936616214923560619354248046875"]
        }, {
            "a": ["1", "3.22746962821084792949477559886872768402099609375", "7.82568619848760516077845750260166823863983154296875", "11.5935542569186491590471632662229239940643310546875", "13.85366038753246442638555890880525112152099609375", "11.3776445205570642116299495683051645755767822265625", "7.53692455616286594022312783636152744293212890625", "3.05044717106126395123055772273801267147064208984375", "0.9275523110717929231583411819883622229099273681640625"],
            "b": ["0.0031662988826379663033494527013544939109124243259429931640625", "0.0101184467903849238668012588959754793904721736907958984375", "0.02436598839127725180109251823523663915693759918212890625", "0.03612846559355982478667357327140052802860736846923828125", "0.043420842610472576428293223216314800083637237548828125", "0.036128465593559748458840630291888373903930187225341796875", "0.024365988391277147717683959626810974441468715667724609375", "0.01011844679038485794730917177730589173734188079833984375", "0.0031662988826379402824973130492480777320452034473419189453125"]
        }, {
            "a": ["1", "4.0571362565784578890770717407576739788055419921875", "10.08776600815523494247827329672873020172119140625", "16.0931105481437413118328549899160861968994140625", "18.908021103087801151332314475439488887786865234375", "15.7757419686594335672680244897492229938507080078125", "9.6938041388298525902200708515010774135589599609375", "3.821765270654545521011868913774378597736358642578125", "0.923414017811577725325378196430392563343048095703125"],
            "b": ["0.003174064254290491320087408411154683562926948070526123046875", "0.01272837145925256006895320837202234542928636074066162109375", "0.03141273923730568407020058430134668014943599700927734375", "0.05011834586831163951270440293228602968156337738037109375", "0.059255992287540602825313129642381682060658931732177734375", "0.050118345868311688084961730282884673215448856353759765625", "0.031412739237305746520245719466402078978717327117919921875", "0.01272837145925258782452882400093585602007806301116943359375", "0.0031740642542905004273856572893919292255304753780364990234375"]
        }, {
            "a": ["1", "4.8729837792961205877872998826205730438232421875", "12.8155532418933688632023404352366924285888671875", "21.532000897371805336888428428210318088531494140625", "25.37278779237842485372311784885823726654052734375", "21.082357002531960432634150492958724498748779296875", "12.285882185577481351401729625649750232696533203125", "4.57399609823065400604491514968685805797576904296875", "0.9190498737822441199796230648644268512725830078125"],
            "b": ["0.0031831910842479234531599008306557152536697685718536376953125", "0.0153013503401603599696212398839634261094033718109130859375", "0.03990902195711672206801523543617804534733295440673828125", "0.06701485236573646864233211317696259357035160064697265625", "0.079497650964106048032675744252628646790981292724609375", "0.067014852365736510275695536620332859456539154052734375", "0.039909021957116770640272562786776688881218433380126953125", "0.01530135034016038599047337953606984228827059268951416015625", "0.003183191084247932560458149708892960916273295879364013671875"]
        }, {
            "a": ["1", "5.6525942040152710177380868117325007915496826171875", "15.8884757856901561723361737676896154880523681640625", "27.856822587253105893978499807417392730712890625", "33.1397529761859885866215336136519908905029296875", "27.24084417498175980654195882380008697509765625", "15.1935686152550175620490335859358310699462890625", "5.28583031900628075305803577066399157047271728515625", "0.91444882328107979230225055289338342845439910888671875"],
            "b": ["0.0031938675835759045874839845424730810918845236301422119140625", "0.01776871171492701295679950135308899916708469390869140625", "0.049478300175424851092831346477396436966955661773681640625", "0.08664351640301488910456129133308422751724720001220703125", "0.10379683836863513868298269926526700146496295928955078125", "0.08664351640301505563801498510656529106199741363525390625", "0.0494783001754250661985423676014761440455913543701171875", "0.0177687117149271274485489158223572303541004657745361328125", "0.003193867583575931042016993188781270873732864856719970703125"]
        }, {
            "a": ["1", "6.368612580720540705669918679632246494293212890625", "19.11201082154855868111553718335926532745361328125", "34.78974469317444828675434109754860401153564453125", "41.8373520517267110108150518499314785003662109375", "33.975188361523663616026169620454311370849609375", "18.2275236574198942207658546976745128631591796875", "5.9316775413346487511034865747205913066864013671875", "0.9095994250078682785698447332833893597126007080078125"],
            "b": ["0.0032063060430323540687946870519908770802430808544158935546875", "0.0200461665043228064175817593195461085997521877288818359375", "0.059514225795971688326435611315901041962206363677978515625", "0.10812920562968429682992876905700541101396083831787109375", "0.1309769194008718329325091644932399503886699676513671875", "0.10812920562968432458550438468591892160475254058837890625", "0.0595142257959717368986929386664996854960918426513671875", "0.0200461665043228341731573749484596191905438899993896484375", "0.003206306043032358839284245988210386713035404682159423828125"]
        }, {
            "a": ["1", "8.758946473374376040510469465516507625579833984375", "35.58651510976569198874130961485207080841064453125", "88.091587704837451155981398187577724456787109375", "146.9229411714135267175151966512203216552734375", "172.381622832231414577108807861804962158203125", "144.05510905980992220065672881901264190673828125", "84.686206335670618727817782200872898101806640625", "33.54311196414397500120685435831546783447265625", "8.094884173620823020200987230055034160614013671875", "0.90615530991327608578700392172322608530521392822265625"],
            "b": ["0.00096673725231487673929808845940669925766997039318084716796875", "0.0067871983729406830387897997525215032510459423065185546875", "0.0207529465480032204727223188456264324486255645751953125", "0.0344257674810349023619693298314814455807209014892578125", "0.0289103687214516298642497105220172670669853687286376953125", "-1.4940251871457071555969249387717317431466949905535107623322232939244713634252548e-16", "-0.0289103687214518519088546355533253517933189868927001953125", "-0.03442576748103498562869617671822197735309600830078125", "-0.0207529465480032170032753668920122436247766017913818359375", "-0.006787198372940670028363729926468295161612331867218017578125", "-0.0009667372523148730530107020086916236323304474353790283203125"]
        }, {
            "a": ["1", "9.3701900676271900891833865898661315441131591796875", "40.01491587612218836511601693928241729736328125", "102.511797656538846013063448481261730194091796875", "174.41910699116289151788805611431598663330078125", "205.91436029156801623685169033706188201904296875", "170.813975352323808465371257625520229339599609375", "98.317984097895276818235288374125957489013671875", "37.58475988096905240354317356832325458526611328125", "8.6192764829597958708973237662576138973236083984375", "0.9008614160147718763482771464623510837554931640625"],
            "b": ["0.0010232337437848667248407874552640350884757936000823974609375", "0.0076822600538210446263764907826043781824409961700439453125", "0.0246888468368654835638498212802005582489073276519775390625", "0.04239218118939853952031882045048405416309833526611328125", "0.036330805805252365525692681558211916126310825347900390625", "3.6334388898956655854414982707296318832895093420276566575921606272459030151367188e-15", "-0.0363308058052462801157389549189247190952301025390625", "-0.042392181189394993745533923856783076189458370208740234375", "-0.02468884683686412007119770350982435047626495361328125", "-0.007682260053820728906703863003713195212185382843017578125", "-0.001023233743784833331413874901727467658929526805877685546875"]
        }, {
            "a": ["1", "-6.60021538787575590134792946628294885158538818359375", "20.313385299273210904402731102891266345977783203125", "-37.658972317346325553444330580532550811767578125", "45.8333289449330010256744571961462497711181640625", "-37.447382857479254880672669969499111175537109375", "20.0857624339637510502143413759768009185791015625", "-6.48958831669393365615405855351127684116363525390625", "0.9777146894410366773087162073352374136447906494140625"],
            "b": ["0.0031379207286704228173357389408693052246235311031341552734375", "-0.0207327847157833221325429207126944675110280513763427734375", "0.063906415267507010735670291978749446570873260498046875", "-0.11871758675248689218761910524335689842700958251953125", "0.144856445568186609218486182726337574422359466552734375", "-0.1187175867524867534097410270987893454730510711669921875", "0.0639064152675068719577922138341818936169147491455078125", "-0.020732784715783263151944737501253257505595684051513671875", "0.003137920728670410240590538109017870738171041011810302734375"]
        }, {
            "a": ["1", "-6.43611088465761582710911170579493045806884765625", "19.5097582119500572161996387876570224761962890625", "-35.85549030368898826282020309008657932281494140625", "43.513124393454489791110972873866558074951171875", "-35.6420903775225070830856566317379474639892578125", "19.27821816805828092356023262254893779754638671875", "-6.3218769137698753723952904692851006984710693359375", "0.9764053028786185972620614847983233630657196044921875"],
            "b": ["0.0031371752278751513336174649992926788399927318096160888671875", "-0.0202115208103346051526916227203400922007858753204345703125", "0.061360918658493190935843131228466518223285675048828125", "-0.11300823016343324034505002373407478444278240203857421875", "0.1375126869467688528470006303905392996966838836669921875", "-0.1130082301634331987116866002907045185565948486328125", "0.061360918658493114608010188248954364098608493804931640625", "-0.02021152081033457392766905513781239278614521026611328125", "0.0031371752278751443947235610920643011922948062419891357421875"]
        }, {
            "a": ["1", "-6.25348404336197827291243811487220227718353271484375", "18.63923821475354003496249788440763950347900390625", "-33.92550640019909025113520328886806964874267578125", "41.041585107429682466317899525165557861328125", "-33.7116247622535638583940453827381134033203125", "18.4049587028643912844927399419248104095458984375", "-6.1359538691829325074422740726731717586517333984375", "0.975019971573760191319024670519866049289703369140625"],
            "b": ["0.0031364705298693451585023694860865361988544464111328125", "-0.0196323370340034421277497500568642863072454929351806640625", "0.05860563797674107899826623224726063199341297149658203125", "-0.10690077876869441553253636811859905719757080078125", "0.129690268595468005674575806551729328930377960205078125", "-0.10690077876869440165474856030414230190217494964599609375", "0.058605637976741058181584520525575499050319194793701171875", "-0.019632337034003431719408894196021719835698604583740234375", "0.0031364705298693429900980245150776681839488446712493896484375"]
        }, {
            "a": ["1", "-6.05044563575328364635197431198321282863616943359375", "17.700855007541402841297895065508782863616943359375", "-31.8723131389647136302301078103482723236083984375", "38.425934225205566008298774249851703643798828125", "-31.6594676135565435970420367084443569183349609375", "17.465229095948121340597936068661510944366455078125", "-5.930037274813454217792241252027451992034912109375", "0.97355441128384423432606809001299552619457244873046875"],
            "b": ["0.0031358193199002254263063615979945097933523356914520263671875", "-0.018989387810298762049310283828162937425076961517333984375", "0.0556377670229926957201627146787359379231929779052734375", "-0.1004059844147798530311632703160285018384456634521484375", "0.12141214986730754221699868367068120278418064117431640625", "-0.1004059844147797975200120390582014806568622589111328125", "0.05563776702299262633122367560645216144621372222900390625", "-0.01898938781029872735484076429202104918658733367919921875", "0.00313581931990021718636985070816081133671104907989501953125"]
        }, {
            "a": ["1", "-5.824968035121923293218060280196368694305419921875", "16.69506601618542873666228842921555042266845703125", "-29.70254725792965899699993315152823925018310546875", "35.6782261339602513317004195414483547210693359375", "-29.49243892181828385901098954491317272186279296875", "16.4597076133055821856032707728445529937744140625", "-5.702226841433503778944213991053402423858642578125", "0.9720041108375527816320982310571707785129547119140625"],
            "b": ["0.0031352362651771692979296712877612662850879132747650146484375", "-0.01827640256783565064768737329359282739460468292236328125", "0.05245900692616319027639093519610469229519367218017578125", "-0.0935451840483572383266874794571776874363422393798828125", "0.11271659559677227324669956942670978605747222900390625", "-0.093545184048357266082263095086091198027133941650390625", "0.052459006926163224970860454732246580533683300018310546875", "-0.018276402567835671464369085015277960337698459625244140625", "0.003135236265177174068419230223980775917880237102508544921875"]
        }, {
            "a": ["1", "-5.57489068192670078616401951876468956470489501953125", "15.6242114579103628102529910393059253692626953125", "-27.426718584678180690161752863787114620208740234375", "32.8161525331390890869442955590784549713134765625", "-27.221216340877987249768921174108982086181640625", "15.390950593551618652554680011235177516937255859375", "-5.4505121623116874474135329364798963069915771484375", "0.9703643219467055214266792972921393811702728271484375"],
            "b": ["0.0031347382783637376367502636043127495213411748409271240234375", "-0.017486702191674287354405947780833230353891849517822265625", "0.04907698887385096575552978492851252667605876922607421875", "-0.0863519622572214429201409302550018765032291412353515625", "0.1036597249029967138245211799585376866161823272705078125", "-0.086351962257221359653414083368261344730854034423828125", "0.049076988873850875549909034134543617255985736846923828125", "-0.0174867021916742353127016684766203979961574077606201171875", "0.0031347382783637263610476697550666358438320457935333251953125"]
        }, {
            "a": ["1", "-5.2979313936809209195644143619574606418609619140625", "14.4930538565533577610722204553894698619842529296875", "-25.05964385224877588598246802575886249542236328125", "29.86381218093530520718559273518621921539306640625", "-24.8607575863557173079243511892855167388916015625", "14.263917199396932034005658351816236972808837890625", "-5.172786997548893594967012177221477031707763671875", "0.968630048797901821444611414335668087005615234375"],
            "b": ["0.0031343448138669975124026567669943688088096678256988525390625", "-0.0166132330961707534722204826493907603435218334197998046875", "0.04550695822436490178830581498914398252964019775390625", "-0.078873511458899703274738612890359945595264434814453125", "0.09431794199926558930346942588585079647600650787353515625", "-0.0788735114588996755191629972614464350044727325439453125", "0.045506958224364867093836295453002094291150569915771484375", "-0.0166132330961707326555387709277056274004280567169189453125", "0.0031343448138669914408704908481695383670739829540252685546875"]
        }, {
            "a": ["1", "-4.99170532873080485813943596440367400646209716796875", "13.309404743799387205172024550847709178924560546875", "-22.62069035747537526503947447054088115692138671875", "26.85238710675099582658731378614902496337890625", "-22.4305315235644542326554073952138423919677734375", "13.08657557983582364613539539277553558349609375", "-4.86687131560010133313198821269907057285308837890625", "0.96679603745492792565841000396176241338253021240234375"],
            "b": ["0.0031340782008849698940522454648771599750034511089324951171875", "-0.0156486243579872542908137944550617248751223087310791015625", "0.041773727598491690315984925518932868726551532745361328125", "-0.07117139024244167888610945738037116825580596923828125", "0.08479006633787584956696292692868155427277088165283203125", "-0.071171390242441845419563151153852231800556182861328125", "0.041773727598491884605014234921327442862093448638916015625", "-0.0156486243579873653131162569707157672382891178131103515625", "0.003134078200885000685393944053203085786662995815277099609375"]
        }, {
            "a": ["1", "-4.653753822907770398842330905608832836151123046875", "12.084835062330849808631683117710053920745849609375", "-20.133700714412878340908719110302627086639404296875", "23.8206616485169746511019184254109859466552734375", "-19.9544305404797768233038368634879589080810546875", "11.87058561615398133426424465142190456390380859375", "-4.53054319452295661818652661168016493320465087890625", "0.964856765108824010468424603459425270557403564453125"],
            "b": ["0.0031339640176499612873872724350121643510647118091583251953125", "-0.01458527458188043669784494937857743934728205204010009765625", "0.03791388697438143051687831075469148345291614532470703125", "-0.06332127501190744356396322700675227679312229156494140625", "0.0751989585024710194272046237529139034450054168701171875", "-0.06332127501190736029723638012001174502074718475341796875", "0.037913886974381340311257559960722574032843112945556640625", "-0.01458527458188038118669371812075041816569864749908447265625", "0.0031339640176499465422377266321518618497066199779510498046875"]
        }, {
            "a": ["1", "-4.281585789881962256231417995877563953399658203125", "10.8354560530344539159841588116250932216644287109375", "-17.6264332005241186607236159034073352813720703125", "20.815323892871820277150618494488298892974853515625", "-17.46020102801438866890748613514006137847900390625", "10.632043646655173319004461518488824367523193359375", "-4.1615830989312474486041537602432072162628173828125", "0.96280642922038150999242134275846183300018310546875"],
            "b": ["0.00313403151184234000925510343904534238390624523162841796875", "-0.0134154766000571072648295256612982484512031078338623046875", "0.03397822831231513129868204714512103237211704254150390625", "-0.05541118537460121284965453014592640101909637451171875", "0.0656924477294250352965576666974811814725399017333984375", "-0.05541118537460122672744233796038315631449222564697265625", "0.0339782283123151451764698549595777876675128936767578125", "-0.01341547660005711593844690554533372051082551479339599609375", "0.003134031511842340876616841427448889589868485927581787109375"]
        }, {
            "a": ["1", "-3.8727349080990993712703129858709871768951416015625", "9.582742993062129954751071636565029621124267578125", "-15.12931708068035874248380423523485660552978515625", "17.89100839198312797861945000477135181427001953125", "-14.9781949909164922019044752232730388641357421875", "9.39226026491719068189922836609184741973876953125", "-3.75783350315999342683426220901310443878173828125", "0.96063893660775401261986417011939920485019683837890625"],
            "b": ["0.00313431407275455327365865088040663977153599262237548828125", "-0.01213158972588280516691217059133123257197439670562744140625", "0.03003429722211599373071777563382056541740894317626953125", "-0.047537554698310613421341486173332668840885162353515625", "0.05644342717914320461947141893688240088522434234619140625", "-0.04753755469831062729912929398778942413628101348876953125", "0.03003429722211599373071777563382056541740894317626953125", "-0.012131589725882803432188694614524138160049915313720703125", "0.0031343140727545511052543059093977717566303908824920654296875"]
        }, {
            "a": ["1", "-3.4248363998443682731931403395719826221466064453125", "8.35435372587665625587760587222874164581298828125", "-12.673297516320818800750203081406652927398681640625", "15.11008139497545244012144394218921661376953125", "-12.5392226645592206324408834916539490222930908203125", "8.1785222434275741676401594304479658603668212890625", "-3.317277312654878240749667384079657495021820068359375", "0.95834789254143670778063324178219772875308990478515625"],
            "b": ["0.0031348497614687776714748057571569006540812551975250244140625", "-0.010726271072503422432387054641367285512387752532958984375", "0.026168920577454006515250028996888431720435619354248046875", "-0.0397984413773646295009456252955715171992778778076171875", "0.047649116288133556984529803912664647214114665985107421875", "-0.039798441377364567050900490130516118369996547698974609375", "0.02616892057745391630962927820291952230036258697509765625", "-0.0107262710725033703906827753371544531546533107757568359375", "0.0031348497614687585895165700122788621229119598865509033203125"]
        }, {
            "a": ["1", "-2.93572782033495638387421422521583735942840576171875", "7.18486611434628219541309590567834675312042236328125", "-10.286544485660893855083486414514482021331787109375", "12.54224051058957911664037965238094329833984375", "-10.17128765203819540374752250500023365020751953125", "7.024762624592508331033968715928494930267333984375", "-2.838139018246842670833984811906702816486358642578125", "0.95592658991928203260357577164540998637676239013671875"],
            "b": ["0.00313568190608537987473791730508310138247907161712646484375", "-0.0091927793535850031714229402268756530247628688812255859375", "0.0224904725827445688135508561344977351836860179901123046875", "-0.0322831784768280172226440072336117736995220184326171875", "0.039529712477959298710938895737854181788861751556396484375", "-0.03228317847682797558928058379024150781333446502685546875", "0.022490472582744523710740480737513280473649501800537109375", "-0.00919277935358497368112384862115504802204668521881103515625", "0.0031356819060853681653544544616352141019888222217559814453125"]
        }, {
            "a": ["1", "-2.403578879038170246218442116514779627323150634765625", "6.11632217149513035536756433430127799510955810546875", "-7.9898460166697216067177578224800527095794677734375", "10.26409870046517625041815335862338542938232421875", "-7.89503366660821459532826338545419275760650634765625", "5.972028061086351868880228721536695957183837890625", "-2.31901295904884197085493724443949759006500244140625", "0.9533679986057441713143134620622731745243072509765625"],
            "b": ["0.0031368597699173127180127806923337629996240139007568359375", "-0.0075253665075120691752008639241466880775988101959228515625", "0.019130529035119747671700451974174939095973968505859375", "-0.0250579069047216808352462891207323991693556308746337890625", "0.03232696428491359241785829681248287670314311981201171875", "-0.0250579069047216183852011539556770003400743007659912109375", "0.019130529035119657466079701180206029675900936126708984375", "-0.007525366507512018000858322608337402925826609134674072265625", "0.0031368597699172871308415100344291204237379133701324462890625"]
        }, {
            "a": ["1", "-1.8270558495316773228722695421311073005199432373046875", "5.198421115961533445215536630712449550628662109375", "-5.7906276866009900317067149444483220577239990234375", "8.3590330257153713233719827258028090000152587890625", "-5.71785456438966566139470160123892128467559814453125", "5.068589260032592136440143804065883159637451171875", "-1.7590234027983857600929695763625204563140869140625", "0.9506647550328235496408524340949952602386474609375"],
            "b": ["0.00313843930156435489686739259695968939922749996185302734375", "-0.005719774260753211943264506800232993555255234241485595703125", "0.0162444187597389939903269606702451710589230060577392578125", "-0.018146823055204229502290758091476163826882839202880859375", "0.0263035484011632202105968048044815077446401119232177734375", "-0.018146823055204215624502950277019408531486988067626953125", "0.0162444187597389662347513450413316604681313037872314453125", "-0.00571977426075319893283843697417978546582162380218505859375", "0.0031384393015643440548456677419153493246994912624359130859375"]
        }, {
            "a": ["1", "-1.205526491804016497866314239217899739742279052734375", "4.4881497112630643897546178777702152729034423828125", "-3.67577510073930824319177190773189067840576171875", "6.91766241991176134007446307805366814136505126953125", "-3.626853253530224474587839722516946494579315185546875", "4.36948992373519473630949505604803562164306640625", "-1.1580212787083066228177585799130611121654510498046875", "0.94780915217421346508075430392636917531490325927734375"],
            "b": ["0.003140483976920675768251811632580938749015331268310546875", "-0.003773854107037596765372722273923500324599444866180419921875", "0.01401001488956300604360460937414245563559234142303466796875", "-0.0115097123022641044387537334614535211585462093353271484375", "0.02174440090578831641376922334529808722436428070068359375", "-0.01150971230226410617347720943826061557047069072723388671875", "0.01401001488956300777832808535094955004751682281494140625", "-0.003773854107037598500096198250730594736523926258087158203125", "0.003140483976920675768251811632580938749015331268310546875"]
        }, {
            "a": ["1", "-0.5393114686446278671638765445095486938953399658203125", "4.0485791148709040498943068087100982666015625", "-1.60382460792334935462122302851639688014984130859375", "6.039299829774737560228459187783300876617431640625", "-1.5812193317469915854189821402542293071746826171875", "3.935275297206402012051285055349580943584442138671875", "-0.5168221751766435279051847828668542206287384033203125", "0.94479313002072984328805205223034135997295379638671875"],
            "b": ["0.003143065744473659377244967316755719366483390331268310546875", "-0.00168832972916367618498867386733763851225376129150390625", "0.01262392665601257298046977695094028604216873645782470703125", "-0.00501756083336719893583932616820675320923328399658203125", "0.0189610984517669702020814526122194365598261356353759765625", "-0.005017560833367191129583684272574828355573117733001708984375", "0.0126239266560125261429359255771487369202077388763427734375", "-0.001688329729163669246094769960109260864555835723876953125", "0.00314306574447363595847804162985994480550289154052734375"]
        }, {
            "a": ["1", "0.17001222019738670976352068464620970189571380615234375", "3.946500136793292146109024542965926229953765869140625", "0.5023368793937603715704653950524516403675079345703125", "5.83448011573346736469147799653001129627227783203125", "0.4948389904594991950403937153168953955173492431640625", "3.82959057344748554641000737319700419902801513671875", "0.1625105551249055590989911479482543654739856719970703125", "0.94160826670204844646150377229787409305572509765625"],
            "b": ["0.0031462660867501751789376829293587434221990406513214111328125", "0.00053227994830741293293130400599011409212835133075714111328125", "0.012294076596205440188303015247583971358835697174072265625", "0.00157015821188668668224874824801418071729131042957305908203125", "0.0182996231457205997539272601670745643787086009979248046875", "0.00157015821188668277912092730019821829046122729778289794921875", "0.01229407659620546273970820294607619871385395526885986328125", "0.000532279948307409246643917555275038466788828372955322265625", "0.0031462660867501864546402767786048570997081696987152099609375"]
        }, {
            "a": ["1", "0.919251523023273175994063421967439353466033935546875", "4.24852629388968949797344976104795932769775390625", "2.76035449449940006871884179417975246906280517578125", "6.428032774455317621686845086514949798583984375", "2.71672364332568516687160808942280709743499755859375", "4.1153049338169811477428083890117704868316650390625", "0.8763353256500525656491618065047077834606170654296875", "0.93824577041983270309088993599289096891880035400390625"],
            "b": ["0.00315017721249385811155274694783656741492450237274169921875", "0.002878561930340510326142844377272922429256141185760498046875", "0.01322751885310724344335664426353105227462947368621826171875", "0.0086205310779880230109828431750429444946348667144775390625", "0.02014986025471605934900054535319213755428791046142578125", "0.0086205310779880230109828431750429444946348667144775390625", "0.013227518853107224361398408518653013743460178375244140625", "0.0028785619303405090251002373946676016203127801418304443359375", "0.00315017721249384770321189108699400094337761402130126953125"]
        }, {
            "a": ["1", "1.703179528713617774116073633194901049137115478515625", "5.015287757416036384938706760294735431671142578125", "5.32806077440858860683192688156850636005401611328125", "7.96098192326598308454776997677981853485107421875", "5.23887850108091601697424266603775322437286376953125", "4.8488198012471972475623260834254324436187744140625", "1.6190549785696861651018707561888732016086578369140625", "0.93469647237834563302527612904668785631656646728515625"],
            "b": ["0.003154903396156242927073076742772173020057380199432373046875", "0.0053349257686195229732906142317006015218794345855712890625", "0.01561233768780127990905004509158970904536545276641845703125", "0.016625786217075909367846264785839593969285488128662109375", "0.0249514475250040314302513166921926313079893589019775390625", "0.0166257862170759058983993128322254051454365253448486328125", "0.01561233768780126950070918923074714257381856441497802734375", "0.005334925768619520371205400266489959903992712497711181640625", "0.0031549033961562381565835178065526633872650563716888427734375"]
        }, {
            "a": ["1", "2.514061906187282868785359823959879577159881591796875", "6.29340154384957628508345806039869785308837890625", "8.39423146563270705655668280087411403656005859375", "10.587745962986769399094555410556495189666748046875", "8.2454436468666205684030501288361847400665283203125", "6.07229090526543391348468503565527498722076416015625", "2.382697447162033910217360244132578372955322265625", "0.93095082092189496147938143622013740241527557373046875"],
            "b": ["0.0031605624836081058250114583785261856974102556705474853515625", "0.007878138029965751909511340045355609618127346038818359375", "0.0195926610689062981329744417280380730517208576202392578125", "0.0261739547654983965851993588103141519241034984588623046875", "0.03318490105337500162274722015354200266301631927490234375", "0.0261739547654984520963505900681411731056869029998779296875", "0.01959266106890637793025433666116441600024700164794921875", "0.00787813802996580048176866739595425315201282501220703125", "0.00316056248360812967745925305962373386137187480926513671875"]
        }, {
            "a": ["1", "3.341136424454350883905817681807093322277069091796875", "8.1050789919991199639071055571548640727996826171875", "12.156292605234437331773733603768050670623779296875", "14.46288997694498590362854884006083011627197265625", "11.928121476639272913189415703527629375457763671875", "7.803675186353562054364374489523470401763916015625", "3.156465821125731263663283243658952414989471435546875", "0.92699887711404660439740155197796411812305450439453125"],
            "b": ["0.003167287585689188521287373845325419097207486629486083984375", "0.01047569494888361991968839248556832899339497089385986328125", "0.02523637048400627358457626314702793024480342864990234375", "0.037878718568647544440164409706994774751365184783935546875", "0.045329961175599960132576171645268914289772510528564453125", "0.037878718568647586073527833150365040637552738189697265625", "0.0252363704840063256262805424512407626025378704071044921875", "0.01047569494888365461415791202171021723188459873199462890625", "0.0031672875856892019653943126655804007896222174167633056640625"]
        }, {
            "a": ["1", "4.1700640026406521343460553907789289951324462890625", "10.435577366312262626024676137603819370269775390625", "16.781312917147996444100499502383172512054443359375", "19.709825692983816480818859417922794818878173828125", "16.4477691249987998389769927598536014556884765625", "10.0248574262253828948132650111801922321319580078125", "3.9262785513232199008371026138775050640106201171875", "0.9228303120209846444055301617481745779514312744140625"],
            "b": ["0.00317522898439318197738590043854856048710644245147705078125", "0.013084080667193305480555665099018369801342487335205078125", "0.03249615922764866049465837249954347498714923858642578125", "0.0522571528313321154168846760512678883969783782958984375", "0.061767264252217408959655386979648028500378131866455078125", "0.052257152831332032150157829164527356624603271484375", "0.032496159227648556411249813891117810271680355072021484375", "0.01308408066719324476523400591077006538398563861846923828125", "0.003175228984393163762789402682074069161899387836456298828125"]
        }, {
            "a": ["1", "4.9823833616924257938762821140699088573455810546875", "13.2192806005689771353672767872922122478485107421875", "22.348859344642079349796404130756855010986328125", "26.36396622732581107584337587468326091766357421875", "21.8784874513892617642341065220534801483154296875", "12.668672958216347979032434523105621337890625", "4.67433333773299874991380420397035777568817138671875", "0.9184344059910010127367741006310097873210906982421875"],
            "b": ["0.00318455628022703933488468663881576503627002239227294921875", "0.0156469975174816471052974264921431313268840312957763671875", "0.04116637886668512991139579071386833675205707550048828125", "0.0695511875977750937405374997979379259049892425537109375", "0.0825998306110033719829033316273125819861888885498046875", "0.06955118759777502435159846072565414942800998687744140625", "0.041166378866685053583562847734356182627379894256591796875", "0.0156469975174816054719340030487728654406964778900146484375", "0.0031845562802270306612673067547802929766476154327392578125"]
        }, {
            "a": ["1", "5.75501989315661699464499179157428443431854248046875", "16.326056867467979571983960340730845928192138671875", "28.77919079782304123682479257695376873016357421875", "34.287437921565270926294033415615558624267578125", "28.13781512653702776560749043710529804229736328125", "15.6064643257793296271529470686800777912139892578125", "5.378745152315531186104635708034038543701171875", "0.913800050254381712733220410882495343685150146484375"],
            "b": ["0.0031954608137085001133559369890235757338814437389373779296875", "0.018093708981559729342958320330581045709550380706787109375", "0.050840777857542575335347834197818883694708347320556640625", "0.08950400741584151054208717823712504468858242034912109375", "0.1073853871681484661859684592855046503245830535888671875", "0.08950400741584151054208717823712504468858242034912109375", "0.0508407778575425683964539302905905060470104217529296875", "0.0180937089815597258735113683769668568857014179229736328125", "0.0031954608137084983786324610122164813219569623470306396484375"]
        }]
    },
    'minusHalf': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [1, -7.8485, 27.0923, -53.719, 66.9162, -53.6225, 26.995, -7.8063, 0.99283],
            "b": [0.0031521, -0.024757, 0.085524, -0.16972, 0.2116, -0.16972, 0.085524, -0.024757, 0.0031521]
        }, {
            "a": [1, -7.8304, 26.9858, -53.4547, 66.5625, -53.353, 26.8832, -7.7858, 0.99241],
            "b": [0.0031515, -0.024696, 0.085179, -0.16887, 0.21048, -0.16887, 0.085179, -0.024696, 0.0031515]
        }, {
            "a": [1, -7.8102, 26.8669, -53.1599, 66.1686, -53.0528, 26.7587, -7.7631, 0.99196],
            "b": [0.003151, -0.024629, 0.084795, -0.16793, 0.20923, -0.16793, 0.084795, -0.024629, 0.003151]
        }, {
            "a": [1, -7.7876, 26.7341, -52.8314, 65.7299, -52.7186, 26.62, -7.7378, 0.99148],
            "b": [0.0031504, -0.024554, 0.084366, -0.16688, 0.20784, -0.16688, 0.084366, -0.024554, 0.0031504]
        }, {
            "a": [1, -7.7623, 26.5858, -52.4655, 65.2417, -52.3467, 26.4656, -7.7097, 0.99098],
            "b": [0.0031498, -0.02447, 0.083888, -0.16572, 0.2063, -0.16572, 0.083888, -0.02447, 0.0031498]
        }, {
            "a": [1, -7.7339, 26.4204, -52.058, 64.6989, -51.9332, 26.2939, -7.6784, 0.99045],
            "b": [0.0031492, -0.024377, 0.083356, -0.16442, 0.20458, -0.16442, 0.083356, -0.024377, 0.0031492]
        }, {
            "a": [1, -7.7021, 26.2359, -51.6048, 64.0957, -51.4738, 26.1029, -7.6436, 0.98988],
            "b": [0.0031485, -0.024272, 0.082763, -0.16297, 0.20267, -0.16297, 0.082763, -0.024272, 0.0031485]
        }, {
            "a": [1, -7.6666, 26.0303, -51.101, 63.426, -50.9636, 25.8904, -7.6049, 0.98928],
            "b": [0.0031478, -0.024156, 0.082103, -0.16137, 0.20055, -0.16137, 0.082103, -0.024156, 0.0031478]
        }, {
            "a": [1, -7.6267, 25.8013, -50.5416, 62.6833, -50.3976, 25.6544, -7.5617, 0.98865],
            "b": [0.0031471, -0.024026, 0.081369, -0.15959, 0.1982, -0.15959, 0.081369, -0.024026, 0.0031471]
        }, {
            "a": [1, -7.5822, 25.5464, -49.9211, 61.8607, -49.7703, 25.3923, -7.5137, 0.98798],
            "b": [0.0031464, -0.023881, 0.080553, -0.15761, 0.19559, -0.15761, 0.080553, -0.023881, 0.0031464]
        }, {
            "a": [1, -7.5323, 25.2629, -49.2335, 60.9506, -49.0761, 25.1015, -7.4602, 0.98727],
            "b": [0.0031457, -0.023719, 0.079646, -0.15543, 0.19271, -0.15543, 0.079646, -0.023719, 0.0031457]
        }, {
            "a": [1, -7.4765, 24.9479, -48.4729, 59.9454, -48.3086, 24.7791, -7.4007, 0.98651],
            "b": [0.0031449, -0.023538, 0.078639, -0.15301, 0.18953, -0.15301, 0.078639, -0.023538, 0.0031449]
        }, {
            "a": [1, -7.414, 24.5984, -47.6327, 58.8369, -47.4617, 24.4221, -7.3345, 0.98572],
            "b": [0.0031441, -0.023336, 0.077524, -0.15034, 0.18602, -0.15034, 0.077524, -0.023336, 0.0031441]
        }, {
            "a": [1, -7.3442, 24.2111, -46.7062, 57.6171, -46.5286, 24.0273, -7.2607, 0.98488],
            "b": [0.0031434, -0.023111, 0.076288, -0.1474, 0.18216, -0.1474, 0.076288, -0.023111, 0.0031434]
        }, {
            "a": [1, -7.2661, 23.7824, -45.6867, 56.2775, -45.5026, 23.5912, -7.1786, 0.98398],
            "b": [0.0031426, -0.02286, 0.074923, -0.14416, 0.17792, -0.14416, 0.074923, -0.02286, 0.0031426]
        }, {
            "a": [1, -7.1788, 23.3088, -44.5673, 54.8101, -44.3771, 23.1103, -7.0873, 0.98304],
            "b": [0.0031417, -0.022579, 0.073415, -0.14061, 0.17327, -0.14061, 0.073415, -0.022579, 0.0031417]
        }, {
            "a": [1, -7.0814, 22.7865, -43.3415, 53.2073, -43.1456, 22.5809, -6.9858, 0.98204],
            "b": [0.0031409, -0.022267, 0.071754, -0.13672, 0.1682, -0.13672, 0.071754, -0.022267, 0.0031409]
        }, {
            "a": [1, -6.9725, 22.2118, -42.0031, 51.4621, -41.8019, 21.9995, -6.8728, 0.98098],
            "b": [0.0031401, -0.021919, 0.069928, -0.13248, 0.16267, -0.13248, 0.069928, -0.021919, 0.0031401]
        }, {
            "a": [1, -6.8511, 21.581, -40.5465, 49.5686, -40.3408, 21.3626, -6.7473, 0.97986],
            "b": [0.0031393, -0.021531, 0.067926, -0.12786, 0.15668, -0.12786, 0.067926, -0.021531, 0.0031393]
        }, {
            "a": [1, -6.7156, 20.8905, -38.9672, 47.5225, -38.7578, 20.6666, -6.6079, 0.97868],
            "b": [0.0031385, -0.0211, 0.065736, -0.12286, 0.1502, -0.12286, 0.065736, -0.0211, 0.0031385]
        }, {
            "a": [1, -6.5646, 20.1373, -37.262, 45.3218, -37.0499, 19.9087, -6.4531, 0.97742],
            "b": [0.0031377, -0.02062, 0.063349, -0.11746, 0.14324, -0.11746, 0.063349, -0.02062, 0.0031377]
        }, {
            "a": [1, -6.3965, 19.3187, -35.4298, 42.9669, -35.2162, 19.0864, -6.2815, 0.9761],
            "b": [0.003137, -0.020086, 0.060756, -0.11166, 0.13578, -0.11166, 0.060756, -0.020086, 0.003137]
        }, {
            "a": [1, -6.2094, 18.4329, -33.4715, 40.462, -33.2577, 18.1981, -6.0912, 0.9747],
            "b": [0.0031363, -0.019493, 0.057953, -0.10546, 0.12786, -0.10546, 0.057953, -0.019493, 0.0031363]
        }, {
            "a": [1, -6.0015, 17.4791, -31.3912, 37.8152, -31.1789, 17.2434, -5.8805, 0.97321],
            "b": [0.0031357, -0.018834, 0.054937, -0.098885, 0.11948, -0.098885, 0.054937, -0.018834, 0.0031357]
        }, {
            "a": [1, -5.7706, 16.4583, -29.1964, 35.0399, -28.9872, 16.2233, -5.6474, 0.97164],
            "b": [0.0031351, -0.018105, 0.051711, -0.091945, 0.1107, -0.091945, 0.051711, -0.018105, 0.0031351]
        }, {
            "a": [1, -5.5147, 15.3733, -26.8985, 32.155, -26.6943, 15.1408, -5.39, 0.96998],
            "b": [0.0031346, -0.017297, 0.048285, -0.084683, 0.10157, -0.084683, 0.048285, -0.017297, 0.0031346]
        }, {
            "a": [1, -5.2313, 14.2295, -24.5133, 29.1863, -24.3162, 14.0016, -5.1061, 0.96822],
            "b": [0.0031343, -0.016403, 0.044675, -0.077148, 0.092174, -0.077148, 0.044675, -0.016403, 0.0031343]
        }, {
            "a": [1, -4.9181, 13.0354, -22.0612, 26.1666, -21.8733, 12.8143, -4.7935, 0.96637],
            "b": [0.003134, -0.015417, 0.04091, -0.069405, 0.08262, -0.069405, 0.04091, -0.015417, 0.003134]
        }, {
            "a": [1, -4.5726, 11.8036, -19.5671, 23.1365, -19.3906, 11.5916, -4.45, 0.9644],
            "b": [0.003134, -0.01433, 0.037028, -0.061533, 0.073035, -0.061533, 0.037028, -0.01433, 0.003134]
        }, {
            "a": [1, -4.1924, 10.5514, -17.0594, 20.1444, -16.8964, 10.3507, -4.0733, 0.96233],
            "b": [0.0031341, -0.013135, 0.033084, -0.053623, 0.06357, -0.053623, 0.033084, -0.013135, 0.0031341]
        }, {
            "a": [1, -3.7749, 9.3015, -14.5689, 17.2468, -14.4215, 9.1142, -3.6614, 0.96013],
            "b": [0.0031344, -0.011824, 0.029149, -0.045771, 0.054406, -0.045771, 0.029149, -0.011824, 0.0031344]
        }, {
            "a": [1, -3.3178, 8.0832, -12.1263, 14.5078, -11.9963, 7.9109, -3.2123, 0.95781],
            "b": [0.003135, -0.010391, 0.025316, -0.038075, 0.045745, -0.038075, 0.025316, -0.010391, 0.003135]
        }, {
            "a": [1, -2.8191, 6.9326, -9.7585, 11.9985, -9.6477, 6.7761, -2.7242, 0.95536],
            "b": [0.0031359, -0.0088274, 0.021697, -0.030621, 0.037811, -0.030621, 0.021697, -0.0088274, 0.0031359]
        }, {
            "a": [1, -2.277, 5.8935, -7.4838, 9.7973, -7.3938, 5.7527, -2.1959, 0.95277],
            "b": [0.0031372, -0.007129, 0.01843, -0.023467, 0.030851, -0.023467, 0.01843, -0.007129, 0.0031372]
        }, {
            "a": [1, -1.6904, 5.0174, -5.3057, 7.9889, -5.2381, 4.8904, -1.6266, 0.95003],
            "b": [0.0031389, -0.0052918, 0.015675, -0.016624, 0.025133, -0.016624, 0.015675, -0.0052918, 0.0031389]
        }, {
            "a": [1, -1.0587, 4.3626, -3.2053, 6.6659, -3.1621, 4.2458, -1.0164, 0.94714],
            "b": [0.003141, -0.0033141, 0.013615, -0.010035, 0.020947, -0.010035, 0.013615, -0.0033141, 0.003141]
        }, {
            "a": [1, -0.3825, 3.9935, -1.1338, 5.9298, -1.1176, 3.8803, -0.36634, 0.94409],
            "b": [0.0031437, -0.0011974, 0.012449, -0.0035464, 0.018612, -0.0035464, 0.012449, -0.0011974, 0.0031437]
        }, {
            "a": [1, 0.3362, 3.9772, 0.99494, 5.8941, 0.97989, 3.8578, 0.32118, 0.94086],
            "b": [0.0031471, 0.0010526, 0.012388, 0.0031093, 0.018483, 0.0031093, 0.012388, 0.0010526, 0.0031471]
        }, {
            "a": [1, 1.0938, 4.3794, 3.3079, 6.6873, 3.2549, 4.2403, 1.0421, 0.93746],
            "b": [0.0031512, 0.0034254, 0.013634, 0.010328, 0.020961, 0.010328, 0.013634, 0.0034254, 0.0031512]
        }, {
            "a": [1, -7.4683, 24.9022, -48.3628, 59.7999, -48.1976, 24.7324, -7.3921, 0.98641],
            "b": [0.0031448, -0.023511, 0.078493, -0.15266, 0.18907, -0.15266, 0.078493, -0.023511, 0.0031448]
        }, {
            "a": [1, -7.4049, 24.5477, -47.5111, 58.6767, -47.3392, 24.3704, -7.3248, 0.98561],
            "b": [0.003144, -0.023307, 0.077362, -0.14995, 0.18551, -0.14995, 0.077362, -0.023307, 0.003144]
        }, {
            "a": [1, -7.334, 24.1549, -46.5723, 57.441, -46.3938, 23.9701, -7.25, 0.98476],
            "b": [0.0031432, -0.023078, 0.076109, -0.14697, 0.1816, -0.14697, 0.076109, -0.023078, 0.0031432]
        }, {
            "a": [1, -7.2547, 23.7203, -45.5395, 56.0844, -45.3546, 23.5281, -7.1667, 0.98386],
            "b": [0.0031424, -0.022823, 0.074725, -0.1437, 0.17731, -0.1437, 0.074725, -0.022823, 0.0031424]
        }, {
            "a": [1, -7.1661, 23.2402, -44.406, 54.5989, -44.215, 23.0407, -7.0741, 0.98291],
            "b": [0.0031416, -0.022539, 0.073197, -0.1401, 0.1726, -0.1401, 0.073197, -0.022539, 0.0031416]
        }, {
            "a": [1, -7.0672, 22.711, -43.1651, 52.977, -42.9684, 22.5045, -6.971, 0.9819],
            "b": [0.0031408, -0.022222, 0.071514, -0.13616, 0.16747, -0.13616, 0.071514, -0.022222, 0.0031408]
        }, {
            "a": [1, -6.9567, 22.1288, -41.8108, 51.2118, -41.609, 21.9157, -6.8564, 0.98083],
            "b": [0.00314, -0.021868, 0.069665, -0.13187, 0.16188, -0.13187, 0.069665, -0.021868, 0.00314]
        }, {
            "a": [1, -6.8334, 21.4901, -40.3377, 49.2976, -40.1314, 21.2709, -6.7291, 0.9797],
            "b": [0.0031392, -0.021475, 0.067637, -0.1272, 0.15582, -0.1272, 0.067637, -0.021475, 0.0031392]
        }, {
            "a": [1, -6.6959, 20.7912, -38.7413, 47.2305, -38.5314, 20.5666, -6.5877, 0.97851],
            "b": [0.0031384, -0.021037, 0.065421, -0.12214, 0.14928, -0.12214, 0.065421, -0.021037, 0.0031384]
        }, {
            "a": [1, -6.5427, 20.0292, -37.0188, 45.0086, -36.8064, 19.8, -6.4307, 0.97725],
            "b": [0.0031376, -0.02055, 0.063006, -0.11669, 0.14225, -0.11669, 0.063006, -0.02055, 0.0031376]
        }, {
            "a": [1, -6.372, 19.2015, -35.1692, 42.6328, -34.9554, 18.9688, -6.2566, 0.97591],
            "b": [0.0031369, -0.020008, 0.060385, -0.11084, 0.13473, -0.11084, 0.060385, -0.020008, 0.0031369]
        }, {
            "a": [1, -6.1822, 18.3063, -33.1939, 40.1079, -32.9802, 18.0714, -6.0636, 0.9745],
            "b": [0.0031362, -0.019407, 0.057552, -0.10459, 0.12674, -0.10459, 0.057552, -0.019407, 0.0031362]
        }, {
            "a": [1, -5.9713, 17.3433, -31.0974, 37.4426, -30.8853, 17.1076, -5.8499, 0.973],
            "b": [0.0031356, -0.018739, 0.054508, -0.097955, 0.1183, -0.097955, 0.054508, -0.018739, 0.0031356]
        }, {
            "a": [1, -5.7371, 16.3135, -28.8877, 34.651, -28.679, 16.0787, -5.6137, 0.97142],
            "b": [0.003135, -0.017999, 0.051254, -0.090969, 0.10947, -0.090969, 0.051254, -0.017999, 0.003135]
        }, {
            "a": [1, -5.4775, 15.2201, -26.5768, 31.753, -26.3734, 14.9881, -5.3528, 0.96975],
            "b": [0.0031346, -0.01718, 0.047801, -0.083666, 0.1003, -0.083666, 0.047801, -0.01718, 0.0031346]
        }, {
            "a": [1, -5.1902, 14.0688, -24.1811, 28.7752, -23.9852, 13.8417, -5.0651, 0.96798],
            "b": [0.0031342, -0.016274, 0.044169, -0.076099, 0.090874, -0.076099, 0.044169, -0.016274, 0.0031342]
        }, {
            "a": [1, -4.8728, 12.8687, -21.7217, 25.7515, -21.5353, 12.6487, -4.7484, 0.9661],
            "b": [0.003134, -0.015274, 0.040384, -0.068333, 0.081307, -0.068333, 0.040384, -0.015274, 0.003134]
        }, {
            "a": [1, -4.5227, 11.633, -19.224, 22.7236, -19.0492, 11.4224, -4.4004, 0.96413],
            "b": [0.003134, -0.014173, 0.03649, -0.060451, 0.071728, -0.060451, 0.03649, -0.014173, 0.003134]
        }, {
            "a": [1, -4.1375, 10.3796, -16.7168, 19.7409, -16.5558, 10.1807, -4.0191, 0.96203],
            "b": [0.0031341, -0.012963, 0.032543, -0.052543, 0.062294, -0.052543, 0.032543, -0.012963, 0.0031341]
        }, {
            "a": [1, -3.7147, 9.1322, -14.2311, 16.8611, -14.086, 8.9469, -3.6022, 0.95982],
            "b": [0.0031345, -0.011636, 0.028616, -0.044707, 0.053186, -0.044707, 0.028616, -0.011636, 0.0031345]
        }, {
            "a": [1, -3.2521, 7.9208, -11.7973, 14.1491, -11.6698, 7.7506, -3.1478, 0.95748],
            "b": [0.0031351, -0.010185, 0.024805, -0.037039, 0.04461, -0.037039, 0.024805, -0.010185, 0.0031351]
        }, {
            "a": [1, -2.7475, 6.7827, -9.4414, 11.6772, -9.3334, 6.6284, -2.6543, 0.95501],
            "b": [0.0031361, -0.008603, 0.021226, -0.029623, 0.036795, -0.029623, 0.021226, -0.008603, 0.0031361]
        }, {
            "a": [1, -2.1994, 5.7627, -7.1801, 9.5246, -7.0931, 5.6239, -2.1204, 0.9524],
            "b": [0.0031374, -0.0068858, 0.018019, -0.022512, 0.029989, -0.022512, 0.018019, -0.0068858, 0.0031374]
        }, {
            "a": [1, -1.6066, 4.9133, -5.0144, 7.777, -4.95, 4.788, -1.5455, 0.94965],
            "b": [0.0031391, -0.0050294, 0.015348, -0.01571, 0.024463, -0.01571, 0.015348, -0.0050294, 0.0031391]
        }, {
            "a": [1, -0.96871, 4.2938, -2.9216, 6.5281, -2.8819, 4.1779, -0.92975, 0.94673],
            "b": [0.0031414, -0.0030325, 0.013398, -0.0091454, 0.020511, -0.0091454, 0.013398, -0.0030325, 0.0031414]
        }, {
            "a": [1, -0.28659, 3.9689, -0.84824, 5.8808, -0.83603, 3.8555, -0.27439, 0.94366],
            "b": [0.0031442, -0.00089719, 0.012371, -0.0026529, 0.018456, -0.0026529, 0.012371, -0.00089719, 0.0031442]
        }, {
            "a": [1, 0.4377, 4.0061, 1.2973, 5.9506, 1.2775, 3.8849, 0.41799, 0.94041],
            "b": [0.0031476, 0.0013704, 0.012476, 0.0040536, 0.018659, 0.0040536, 0.012476, 0.0013704, 0.0031476]
        }, {
            "a": [1, 1.2003, 4.4704, 3.6476, 6.8682, 3.5887, 4.3273, 1.1431, 0.93698],
            "b": [0.0031518, 0.0037589, 0.013917, 0.011388, 0.021528, 0.011388, 0.013917, 0.0037589, 0.0031518]
        }, {
            "a": [1, 1.995, 5.4185, 6.3734, 8.78, 6.2644, 5.2349, 1.8944, 0.93336],
            "b": [0.0031568, 0.0062499, 0.016868, 0.019882, 0.027519, 0.019882, 0.016868, 0.0062499, 0.0031568]
        }, {
            "a": [1, 2.8132, 6.8894, 9.67, 11.843, 9.495, 6.6423, 2.6632, 0.92954],
            "b": [0.0031629, 0.0088172, 0.021449, 0.030144, 0.037119, 0.030144, 0.021449, 0.0088172, 0.0031629]
        }, {
            "a": [1, 3.6428, 8.8936, 13.7293, 16.2051, 13.4662, 8.556, 3.4373, 0.92551],
            "b": [0.00317, 0.011424, 0.027693, 0.04277, 0.050789, 0.04277, 0.027693, 0.011424, 0.00317]
        }, {
            "a": [1, 4.4681, 11.3994, 18.6941, 21.966, 18.3147, 10.9414, 4.2015, 0.92126],
            "b": [0.0031784, 0.014023, 0.035498, 0.0582, 0.068832, 0.0582, 0.035498, 0.014023, 0.0031784]
        }, {
            "a": [1, 5.2689, 14.3192, 24.5949, 29.1093, 24.0664, 13.7104, 4.9365, 0.91678],
            "b": [0.0031883, 0.016553, 0.044592, 0.076523, 0.09119, 0.076523, 0.044592, 0.016553, 0.0031883]
        }, {
            "a": [1, 6.0205, 17.4967, 31.2753, 37.4087, 30.5636, 16.7095, 5.6188, 0.91206],
            "b": [0.0031999, 0.018937, 0.054485, 0.097242, 0.11714, 0.097242, 0.054485, 0.018937, 0.0031999]
        }, {
            "a": [1, 8.3877, 33.0419, 80.0999, 131.9927, 154.2804, 129.4891, 77.09, 31.1971, 7.7692, 0.9087],
            "b": [0.00093969, 0.0063187, 0.018733, 0.030428, 0.025242, -1.2686e-16, -0.025242, -0.030428, -0.018733, -0.0063187, -0.00093969]
        }, {
            "a": [1, 9.0886, 37.9378, 95.6685, 161.2845, 189.8671, 158.045, 91.8639, 35.6975, 8.3802, 0.90354],
            "b": [0.00099458, 0.0072441, 0.022757, 0.03846, 0.032653, -1.2544e-16, -0.032653, -0.03846, -0.022757, -0.0072441, -0.00099458]
        }, {
            "a": [1, -6.6759, 20.6907, -38.513, 46.9355, -38.3028, 20.4654, -6.5671, 0.97834],
            "b": [0.0031383, -0.020973, 0.065102, -0.12142, 0.14835, -0.12142, 0.065102, -0.020973, 0.0031383]
        }, {
            "a": [1, -6.5204, 19.9198, -36.7731, 44.6924, -36.5605, 19.6901, -6.4079, 0.97707],
            "b": [0.0031375, -0.020479, 0.06266, -0.11591, 0.14125, -0.11591, 0.06266, -0.020479, 0.0031375]
        }, {
            "a": [1, -6.3472, 19.0829, -34.9062, 42.2959, -34.6924, 18.8499, -6.2313, 0.97572],
            "b": [0.0031368, -0.01993, 0.06001, -0.11, 0.13366, -0.11, 0.06001, -0.01993, 0.0031368]
        }, {
            "a": [1, -6.1546, 18.1785, -32.914, 39.7511, -32.7004, 17.9434, -6.0356, 0.9743],
            "b": [0.0031361, -0.019319, 0.057148, -0.1037, 0.12561, -0.1037, 0.057148, -0.019319, 0.0031361]
        }, {
            "a": [1, -5.9406, 17.2063, -30.8014, 37.0676, -30.5897, 16.9706, -5.819, 0.97279],
            "b": [0.0031355, -0.018642, 0.054074, -0.09702, 0.11711, -0.09702, 0.054074, -0.018642, 0.0031355]
        }, {
            "a": [1, -5.7031, 16.1675, -28.5771, 34.2601, -28.369, 15.933, -5.5795, 0.9712],
            "b": [0.003135, -0.017892, 0.050793, -0.089988, 0.10823, -0.089988, 0.050793, -0.017892, 0.003135]
        }, {
            "a": [1, -5.4399, 15.0658, -26.2535, 31.3495, -26.051, 14.8343, -5.315, 0.96951],
            "b": [0.0031345, -0.017061, 0.047314, -0.082645, 0.099019, -0.082645, 0.047314, -0.017061, 0.0031345]
        }, {
            "a": [1, -5.1486, 13.9072, -23.8478, 28.3632, -23.653, 13.6809, -5.0235, 0.96773],
            "b": [0.0031342, -0.016143, 0.043659, -0.075046, 0.08957, -0.075046, 0.043659, -0.016143, 0.0031342]
        }, {
            "a": [1, -4.8269, 12.7013, -21.3815, 25.3363, -21.1966, 12.4825, -4.7026, 0.96584],
            "b": [0.003134, -0.01513, 0.039857, -0.06726, 0.079994, -0.06726, 0.039857, -0.01513, 0.003134]
        }, {
            "a": [1, -4.4721, 11.462, -18.8807, 22.3115, -18.7077, 11.2529, -4.3503, 0.96385],
            "b": [0.003134, -0.014014, 0.035952, -0.059368, 0.070425, -0.059368, 0.035952, -0.014014, 0.003134]
        }, {
            "a": [1, -4.0819, 10.2079, -16.3747, 19.3393, -16.2157, 10.0108, -3.9642, 0.96174],
            "b": [0.0031341, -0.012788, 0.032002, -0.051464, 0.061024, -0.051464, 0.032002, -0.012788, 0.0031341]
        }, {
            "a": [1, -3.6538, 8.9635, -13.8943, 16.4784, -13.7515, 8.7802, -3.5423, 0.95951],
            "b": [0.0031345, -0.011445, 0.028086, -0.043645, 0.051976, -0.043645, 0.028086, -0.011445, 0.0031345]
        }, {
            "a": [1, -3.1856, 7.7598, -11.4697, 13.7949, -11.3449, 7.5917, -3.0826, 0.95715],
            "b": [0.0031352, -0.0099759, 0.024299, -0.036008, 0.04349, -0.036008, 0.024299, -0.0099759, 0.0031352]
        }, {
            "a": [1, -2.6751, 6.635, -9.1261, 11.3619, -9.0209, 6.4829, -2.5836, 0.95466],
            "b": [0.0031362, -0.0083761, 0.020762, -0.028632, 0.035798, -0.028632, 0.020762, -0.0083761, 0.0031362]
        }, {
            "a": [1, -2.1209, 5.6351, -6.8783, 9.2594, -6.7943, 5.4984, -2.0442, 0.95203],
            "b": [0.0031376, -0.00664, 0.017618, -0.021564, 0.029151, -0.021564, 0.017618, -0.00664, 0.0031376]
        }, {
            "a": [1, -1.5219, 4.8135, -4.7245, 7.5744, -4.6634, 4.6898, -1.4636, 0.94926],
            "b": [0.0031394, -0.0047644, 0.015034, -0.0148, 0.023822, -0.0148, 0.015034, -0.0047644, 0.0031394]
        }, {
            "a": [1, -0.87794, 4.2304, -2.6383, 6.4015, -2.6022, 4.1153, -0.84235, 0.94632],
            "b": [0.0031417, -0.0027484, 0.013198, -0.0082577, 0.02011, -0.0082577, 0.013198, -0.0027484, 0.0031417]
        }, {
            "a": [1, -0.18988, 3.9511, -0.56139, 5.8453, -0.55325, 3.8374, -0.18174, 0.94322],
            "b": [0.0031446, -0.00059445, 0.012314, -0.0017555, 0.018342, -0.0017555, 0.012314, -0.00059445, 0.0031446]
        }, {
            "a": [1, 0.53992, 4.043, 1.6034, 6.023, 1.5788, 3.9198, 0.51541, 0.93995],
            "b": [0.0031481, 0.0016905, 0.01259, 0.0050095, 0.018884, 0.0050095, 0.01259, 0.0016905, 0.0031481]
        }, {
            "a": [1, 1.3073, 4.5705, 3.9942, 7.0677, 3.9293, 4.423, 1.2445, 0.9365],
            "b": [0.0031524, 0.0040942, 0.014228, 0.012469, 0.022152, 0.012469, 0.014228, 0.0040942, 0.0031524]
        }, {
            "a": [1, 2.1058, 5.5883, 6.7863, 9.1277, 6.6694, 5.3975, 1.9989, 0.93285],
            "b": [0.0031576, 0.0065975, 0.017397, 0.021168, 0.028608, 0.021168, 0.017397, 0.0065975, 0.0031576]
        }, {
            "a": [1, 2.9264, 7.1324, 10.1765, 12.3603, 9.9909, 6.8746, 2.7691, 0.929],
            "b": [0.0031638, 0.0091726, 0.022206, 0.03172, 0.038741, 0.03172, 0.022206, 0.0091726, 0.0031638]
        }, {
            "a": [1, 3.7564, 9.2082, 14.3531, 16.9097, 14.0759, 8.8559, 3.5429, 0.92494],
            "b": [0.0031711, 0.011782, 0.028673, 0.04471, 0.052996, 0.04471, 0.028673, 0.011782, 0.0031711]
        }, {
            "a": [1, 4.5796, 11.7773, 19.4476, 22.8644, 19.0499, 11.3004, 4.3043, 0.92066],
            "b": [0.0031797, 0.014375, 0.036675, 0.060541, 0.071645, 0.060541, 0.036675, 0.014375, 0.0031797]
        }, {
            "a": [1, 5.3753, 14.7433, 25.4695, 30.1852, 24.9179, 14.1116, 5.0335, 0.91615],
            "b": [0.0031898, 0.01689, 0.045912, 0.079237, 0.094556, 0.079237, 0.045912, 0.01689, 0.0031898]
        }]
    },
    'minusQuarter': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [1, -7.8442, 27.0667, -53.6556, 66.8313, -53.5578, 26.9682, -7.8013, 0.99273],
            "b": [0.0031519, -0.024742, 0.085441, -0.16951, 0.21133, -0.16951, 0.085441, -0.024742, 0.0031519]
        }, {
            "a": [1, -7.8256, 26.9573, -53.384, 66.468, -53.2809, 26.8533, -7.7804, 0.9923],
            "b": [0.0031514, -0.02468, 0.085087, -0.16865, 0.21018, -0.16865, 0.085087, -0.02468, 0.0031514]
        }, {
            "a": [1, -7.8048, 26.835, -53.0811, 66.0633, -52.9725, 26.7254, -7.757, 0.99184],
            "b": [0.0031508, -0.024611, 0.084692, -0.16768, 0.2089, -0.16768, 0.084692, -0.024611, 0.0031508]
        }, {
            "a": [1, -7.7816, 26.6985, -52.7436, 65.6127, -52.6293, 26.5829, -7.7311, 0.99136],
            "b": [0.0031502, -0.024534, 0.084252, -0.1666, 0.20747, -0.1666, 0.084252, -0.024534, 0.0031502]
        }, {
            "a": [1, -7.7555, 26.5462, -52.3676, 65.1114, -52.2474, 26.4244, -7.7022, 0.99085],
            "b": [0.0031496, -0.024448, 0.083761, -0.1654, 0.20588, -0.1654, 0.083761, -0.024448, 0.0031496]
        }, {
            "a": [1, -7.7263, 26.3762, -51.9492, 64.554, -51.8229, 26.248, -7.6701, 0.99031],
            "b": [0.003149, -0.024352, 0.083214, -0.16407, 0.20412, -0.16407, 0.083214, -0.024352, 0.003149]
        }, {
            "a": [1, -7.6936, 26.1866, -51.4838, 63.9347, -51.3512, 26.0518, -7.6343, 0.98973],
            "b": [0.0031483, -0.024244, 0.082605, -0.16259, 0.20216, -0.16259, 0.082605, -0.024244, 0.0031483]
        }, {
            "a": [1, -7.657, 25.9754, -50.9666, 63.2475, -50.8275, 25.8337, -7.5945, 0.98913],
            "b": [0.0031477, -0.024125, 0.081927, -0.16094, 0.19998, -0.16094, 0.081927, -0.024125, 0.0031477]
        }, {
            "a": [1, -7.6161, 25.7401, -50.3924, 62.4855, -50.2467, 25.5914, -7.5502, 0.98848],
            "b": [0.003147, -0.023991, 0.081173, -0.15911, 0.19757, -0.15911, 0.081173, -0.023991, 0.003147]
        }, {
            "a": [1, -7.5702, 25.4783, -49.7557, 61.6416, -49.6033, 25.3224, -7.5009, 0.9878],
            "b": [0.0031462, -0.023842, 0.080335, -0.15709, 0.1949, -0.15709, 0.080335, -0.023842, 0.0031462]
        }, {
            "a": [1, -7.5189, 25.1872, -49.0505, 60.7085, -48.8913, 25.024, -7.4459, 0.98708],
            "b": [0.0031455, -0.023675, 0.079404, -0.15485, 0.19194, -0.15485, 0.079404, -0.023675, 0.0031455]
        }, {
            "a": [1, -7.4615, 24.8639, -48.2706, 59.6783, -48.1046, 24.6933, -7.3848, 0.98632],
            "b": [0.0031447, -0.023489, 0.078371, -0.15237, 0.18868, -0.15237, 0.078371, -0.023489, 0.0031447]
        }, {
            "a": [1, -7.3973, 24.5053, -47.4094, 58.5427, -47.2367, 24.3271, -7.3168, 0.98551],
            "b": [0.0031439, -0.023282, 0.077226, -0.14963, 0.18509, -0.14963, 0.077226, -0.023282, 0.0031439]
        }, {
            "a": [1, -7.3255, 24.1079, -46.4603, 57.2937, -46.281, 23.9223, -7.241, 0.98466],
            "b": [0.0031432, -0.02305, 0.07596, -0.14662, 0.18113, -0.14662, 0.07596, -0.02305, 0.0031432]
        }, {
            "a": [1, -7.2452, 23.6683, -45.4164, 55.9229, -45.2308, 23.4753, -7.1567, 0.98375],
            "b": [0.0031424, -0.022792, 0.07456, -0.1433, 0.17679, -0.1433, 0.07456, -0.022792, 0.0031424]
        }, {
            "a": [1, -7.1555, 23.1829, -44.2711, 54.4224, -44.0794, 22.9826, -7.0629, 0.98279],
            "b": [0.0031415, -0.022504, 0.073015, -0.13967, 0.17204, -0.13967, 0.073015, -0.022504, 0.0031415]
        }, {
            "a": [1, -7.0553, 22.6479, -43.0177, 52.7846, -42.8204, 22.4406, -6.9586, 0.98178],
            "b": [0.0031407, -0.022184, 0.071314, -0.1357, 0.16686, -0.1357, 0.071314, -0.022184, 0.0031407]
        }, {
            "a": [1, -6.9434, 22.0595, -41.6502, 51.0028, -41.4478, 21.8456, -6.8427, 0.98071],
            "b": [0.0031399, -0.021826, 0.069445, -0.13136, 0.16122, -0.13136, 0.069445, -0.021826, 0.0031399]
        }, {
            "a": [1, -6.8186, 21.4141, -40.1633, 49.0715, -39.9566, 21.1942, -6.7138, 0.97957],
            "b": [0.0031391, -0.021428, 0.067396, -0.12665, 0.15511, -0.12665, 0.067396, -0.021428, 0.0031391]
        }, {
            "a": [1, -6.6794, 20.7082, -38.5528, 46.9869, -38.3426, 20.483, -6.5707, 0.97837],
            "b": [0.0031383, -0.020985, 0.065158, -0.12155, 0.14851, -0.12155, 0.065158, -0.020985, 0.0031383]
        }, {
            "a": [1, -6.5243, 19.9389, -36.8159, 44.7474, -36.6033, 19.7093, -6.4119, 0.9771],
            "b": [0.0031376, -0.020491, 0.06272, -0.11605, 0.14142, -0.11605, 0.06272, -0.020491, 0.0031376]
        }, {
            "a": [1, -6.3516, 19.1036, -34.9519, 42.3545, -34.7381, 18.8706, -6.2357, 0.97576],
            "b": [0.0031368, -0.019943, 0.060075, -0.11015, 0.13385, -0.11015, 0.060075, -0.019943, 0.0031368]
        }, {
            "a": [1, -6.1594, 18.2008, -32.9627, 39.8132, -32.7491, 17.9657, -6.0405, 0.97433],
            "b": [0.0031362, -0.019334, 0.057219, -0.10385, 0.1258, -0.10385, 0.057219, -0.019334, 0.0031362]
        }, {
            "a": [1, -5.946, 17.2301, -30.8529, 37.1328, -30.6411, 16.9944, -5.8244, 0.97283],
            "b": [0.0031355, -0.018659, 0.05415, -0.097182, 0.11732, -0.097182, 0.05415, -0.018659, 0.0031355]
        }, {
            "a": [1, -5.7091, 16.1929, -28.6311, 34.328, -28.4229, 15.9583, -5.5855, 0.97123],
            "b": [0.003135, -0.01791, 0.050873, -0.090158, 0.10844, -0.090158, 0.050873, -0.01791, 0.003135]
        }, {
            "a": [1, -5.4465, 15.0926, -26.3096, 31.4195, -26.107, 14.861, -5.3216, 0.96955],
            "b": [0.0031345, -0.017082, 0.047399, -0.082822, 0.09924, -0.082822, 0.047399, -0.017082, 0.0031345]
        }, {
            "a": [1, -5.1559, 13.9352, -23.9056, 28.4347, -23.7106, 13.7088, -5.0307, 0.96777],
            "b": [0.0031342, -0.016166, 0.043747, -0.075229, 0.089796, -0.075229, 0.043747, -0.016166, 0.0031342]
        }, {
            "a": [1, -4.8349, 12.7304, -21.4406, 25.4083, -21.2553, 12.5114, -4.7106, 0.96589],
            "b": [0.003134, -0.015155, 0.039948, -0.067446, 0.080221, -0.067446, 0.039948, -0.015155, 0.003134]
        }, {
            "a": [1, -4.4809, 11.4917, -18.9403, 22.3828, -18.7669, 11.2823, -4.359, 0.96389],
            "b": [0.003134, -0.014042, 0.036045, -0.059556, 0.070651, -0.059556, 0.036045, -0.014042, 0.003134]
        }, {
            "a": [1, -4.0916, 10.2377, -16.4339, 19.4088, -16.2746, 10.0402, -3.9738, 0.96179],
            "b": [0.0031341, -0.012819, 0.032096, -0.051651, 0.061244, -0.051651, 0.032096, -0.012819, 0.0031341]
        }, {
            "a": [1, -3.6644, 8.9927, -13.9526, 16.5445, -13.8094, 8.809, -3.5527, 0.95956],
            "b": [0.0031345, -0.011478, 0.028177, -0.043829, 0.052185, -0.043829, 0.028177, -0.011478, 0.0031345]
        }, {
            "a": [1, -3.1971, 7.7876, -11.5264, 13.856, -11.4011, 7.6192, -3.094, 0.95721],
            "b": [0.0031352, -0.010012, 0.024386, -0.036186, 0.043684, -0.036186, 0.024386, -0.010012, 0.0031352]
        }, {
            "a": [1, -2.6877, 6.6605, -9.1806, 11.4161, -9.0749, 6.508, -2.5959, 0.95473],
            "b": [0.0031362, -0.0084156, 0.020842, -0.028803, 0.035969, -0.028803, 0.020842, -0.0084156, 0.0031362]
        }, {
            "a": [1, -2.1346, 5.657, -6.9305, 9.3049, -6.846, 5.5199, -2.0574, 0.9521],
            "b": [0.0031376, -0.0066828, 0.017686, -0.021728, 0.029294, -0.021728, 0.017686, -0.0066828, 0.0031376]
        }, {
            "a": [1, -1.5367, 4.8305, -4.7746, 7.6088, -4.713, 4.7065, -1.4779, 0.94932],
            "b": [0.0031394, -0.0048105, 0.015087, -0.014957, 0.023931, -0.014957, 0.015087, -0.0048105, 0.0031394]
        }, {
            "a": [1, -0.89374, 4.241, -2.6874, 6.4226, -2.6507, 4.1258, -0.85755, 0.94639],
            "b": [0.0031416, -0.0027978, 0.013231, -0.0084115, 0.020177, -0.0084115, 0.013231, -0.0027978, 0.0031416]
        }, {
            "a": [1, -0.2067, 3.9537, -0.61122, 5.8505, -0.60237, 3.84, -0.19785, 0.9433],
            "b": [0.0031445, -0.00064711, 0.012322, -0.0019114, 0.018359, -0.0019114, 0.012322, -0.00064711, 0.0031445]
        }, {
            "a": [1, 0.52215, 4.036, 1.55, 6.0093, 1.5263, 3.9132, 0.49848, 0.94003],
            "b": [0.003148, 0.0016349, 0.012569, 0.0048429, 0.018842, 0.0048429, 0.012569, 0.0016349, 0.003148]
        }, {
            "a": [1, 1.2887, 4.5525, 3.9336, 7.0317, 3.8697, 4.4058, 1.2269, 0.93658],
            "b": [0.0031523, 0.004036, 0.014172, 0.01228, 0.02204, 0.01228, 0.014172, 0.004036, 0.0031523]
        }, {
            "a": [1, -7.4531, 24.817, -48.1576, 59.5292, -47.9908, 24.6453, -7.3759, 0.98621],
            "b": [0.0031446, -0.023462, 0.078221, -0.15201, 0.18821, -0.15201, 0.078221, -0.023462, 0.0031446]
        }, {
            "a": [1, -7.3879, 24.4533, -47.2848, 58.3787, -47.1113, 24.2741, -7.3069, 0.9854],
            "b": [0.0031438, -0.023252, 0.077061, -0.14924, 0.18457, -0.14924, 0.077061, -0.023252, 0.0031438]
        }, {
            "a": [1, -7.315, 24.0503, -46.3232, 57.1135, -46.143, 23.8637, -7.23, 0.98454],
            "b": [0.003143, -0.023017, 0.075776, -0.14618, 0.18056, -0.14618, 0.075776, -0.023017, 0.003143]
        }, {
            "a": [1, -7.2335, 23.6047, -45.2658, 55.7254, -45.0794, 23.4106, -7.1445, 0.98362],
            "b": [0.0031422, -0.022755, 0.074357, -0.14283, 0.17617, -0.14283, 0.074357, -0.022755, 0.0031422]
        }, {
            "a": [1, -7.1424, 23.1127, -44.1061, 54.2065, -43.9136, 22.9114, -7.0493, 0.98266],
            "b": [0.0031414, -0.022463, 0.072792, -0.13915, 0.17136, -0.13915, 0.072792, -0.022463, 0.0031414]
        }, {
            "a": [1, -7.0407, 22.5706, -42.8374, 52.5494, -42.6394, 22.3624, -6.9435, 0.98164],
            "b": [0.0031406, -0.022137, 0.071068, -0.13512, 0.16612, -0.13512, 0.071068, -0.022137, 0.0031406]
        }, {
            "a": [1, -6.9271, 21.9746, -41.4538, 50.7474, -41.2509, 21.7599, -6.8258, 0.98056],
            "b": [0.0031398, -0.021774, 0.069175, -0.13074, 0.16041, -0.13074, 0.069175, -0.021774, 0.0031398]
        }, {
            "a": [1, -6.8004, 21.3211, -39.9503, 48.7953, -39.743, 21.1005, -6.6951, 0.97941],
            "b": [0.003139, -0.02137, 0.067101, -0.12597, 0.15423, -0.12597, 0.067101, -0.02137, 0.003139]
        }, {
            "a": [1, -6.6591, 20.6067, -38.3225, 46.6895, -38.112, 20.3809, -6.5499, 0.9782],
            "b": [0.0031382, -0.02092, 0.064836, -0.12082, 0.14757, -0.12082, 0.064836, -0.02092, 0.0031382]
        }, {
            "a": [1, -6.5017, 19.8285, -36.5683, 44.4289, -36.3554, 19.5983, -6.3888, 0.97692],
            "b": [0.0031375, -0.02042, 0.06237, -0.11526, 0.14041, -0.11526, 0.06237, -0.02042, 0.0031375]
        }, {
            "a": [1, -6.3264, 18.984, -34.687, 42.0153, -34.4731, 18.7507, -6.2102, 0.97557],
            "b": [0.0031367, -0.019864, 0.059697, -0.10931, 0.13277, -0.10931, 0.059697, -0.019864, 0.0031367]
        }, {
            "a": [1, -6.1315, 18.0719, -32.6809, 39.4543, -32.4674, 17.8367, -6.0122, 0.97413],
            "b": [0.0031361, -0.019246, 0.056811, -0.10296, 0.12467, -0.10296, 0.056811, -0.019246, 0.0031361]
        }, {
            "a": [1, -5.915, 17.0921, -30.5552, 36.7559, -30.3438, 16.8564, -5.7931, 0.97261],
            "b": [0.0031355, -0.018561, 0.053713, -0.096241, 0.11613, -0.096241, 0.053713, -0.018561, 0.0031355]
        }, {
            "a": [1, -5.6747, 16.046, -28.3189, 33.9356, -28.1114, 15.8117, -5.5509, 0.97101],
            "b": [0.0031349, -0.017802, 0.050409, -0.089171, 0.1072, -0.089171, 0.050409, -0.017802, 0.0031349]
        }, {
            "a": [1, -5.4084, 14.9374, -25.9851, 31.0148, -25.7834, 14.7064, -5.2835, 0.96931],
            "b": [0.0031345, -0.016962, 0.046909, -0.081797, 0.09796, -0.081797, 0.046909, -0.016962, 0.0031345]
        }, {
            "a": [1, -5.1138, 13.7729, -23.5713, 28.0221, -23.3775, 13.5474, -4.9887, 0.96752],
            "b": [0.0031342, -0.016033, 0.043235, -0.074173, 0.088491, -0.074173, 0.043235, -0.016033, 0.0031342]
        }, {
            "a": [1, -4.7884, 12.5625, -21.0998, 24.9931, -20.9161, 12.3447, -4.6644, 0.96562],
            "b": [0.003134, -0.015009, 0.039419, -0.06637, 0.078908, -0.06637, 0.039419, -0.015009, 0.003134]
        }, {
            "a": [1, -4.4298, 11.3205, -18.5969, 21.9715, -18.4254, 11.1126, -4.3083, 0.96361],
            "b": [0.003134, -0.013881, 0.035506, -0.058472, 0.06935, -0.058472, 0.035506, -0.013881, 0.003134]
        }, {
            "a": [1, -4.0354, 10.0661, -16.0922, 19.0089, -15.935, 9.8704, -3.9183, 0.96149],
            "b": [0.0031342, -0.012642, 0.031556, -0.050573, 0.059979, -0.050573, 0.031556, -0.012642, 0.0031342]
        }, {
            "a": [1, -3.6029, 8.8246, -13.6167, 16.1646, -13.4758, 8.643, -3.4922, 0.95925],
            "b": [0.0031346, -0.011285, 0.027649, -0.04277, 0.050984, -0.04277, 0.027649, -0.011285, 0.0031346]
        }, {
            "a": [1, -3.13, 7.6278, -11.2001, 13.5056, -11.0774, 7.4615, -3.0282, 0.95688],
            "b": [0.0031353, -0.0098016, 0.023883, -0.035159, 0.042576, -0.035159, 0.023883, -0.0098016, 0.0031353]
        }, {
            "a": [1, -2.6147, 6.5147, -8.8668, 11.1059, -8.7639, 6.3644, -2.5247, 0.95437],
            "b": [0.0031364, -0.0081866, 0.020383, -0.027816, 0.034988, -0.027816, 0.020383, -0.0081866, 0.0031364]
        }, {
            "a": [1, -2.0554, 5.5322, -6.6302, 9.0462, -6.5487, 5.397, -1.9805, 0.95173],
            "b": [0.0031378, -0.0064349, 0.017294, -0.020784, 0.028476, -0.020784, 0.017294, -0.0064349, 0.0031378]
        }, {
            "a": [1, -1.4513, 4.7344, -4.4859, 7.4142, -4.4275, 4.6119, -1.3954, 0.94893],
            "b": [0.0031396, -0.0045433, 0.014785, -0.014051, 0.023315, -0.014051, 0.014785, -0.0045433, 0.0031396]
        }, {
            "a": [1, -0.80228, 4.1823, -2.4044, 6.3056, -2.3712, 4.0678, -0.76955, 0.94598],
            "b": [0.003142, -0.0025115, 0.013046, -0.0075246, 0.019806, -0.0075246, 0.013046, -0.0025115, 0.003142]
        }, {
            "a": [1, -0.10935, 3.9417, -0.32309, 5.8262, -0.31838, 3.8274, -0.10463, 0.94286],
            "b": [0.0031449, -0.00034233, 0.012283, -0.0010102, 0.01828, -0.0010102, 0.012283, -0.00034233, 0.0031449]
        }, {
            "a": [1, 0.62495, 4.0797, 1.8596, 6.0951, 1.8308, 3.9545, 0.5964, 0.93957],
            "b": [0.0031486, 0.0019568, 0.012704, 0.0058093, 0.019109, 0.0058093, 0.012704, 0.0019568, 0.0031486]
        }, {
            "a": [1, 1.3962, 4.6601, 4.2864, 7.2469, 4.2163, 4.5088, 1.3287, 0.93609],
            "b": [0.003153, 0.0043729, 0.014507, 0.01338, 0.022714, 0.01338, 0.014507, 0.0043729, 0.003153]
        }, {
            "a": [1, 2.1978, 5.7362, 7.1362, 9.4317, 7.0124, 5.5391, 2.0854, 0.93242],
            "b": [0.0031583, 0.0068858, 0.017857, 0.022257, 0.029561, 0.022257, 0.017857, 0.0068858, 0.0031583]
        }, {
            "a": [1, 3.0201, 7.3409, 10.6065, 12.8066, 10.4117, 7.0738, 2.8567, 0.92855],
            "b": [0.0031646, 0.0094669, 0.022856, 0.033058, 0.040139, 0.033058, 0.022856, 0.0094669, 0.0031646]
        }, {
            "a": [1, 3.8502, 9.4754, 14.8819, 17.5122, 14.5926, 9.1105, 3.63, 0.92447],
            "b": [0.003172, 0.012077, 0.029505, 0.046354, 0.054884, 0.046354, 0.029505, 0.012077, 0.003172]
        }, {
            "a": [1, 4.6715, 12.0953, 20.0839, 23.6266, 19.6704, 11.6025, 4.3888, 0.92016],
            "b": [0.0031808, 0.014665, 0.037666, 0.062518, 0.074032, 0.062518, 0.037666, 0.014665, 0.0031808]
        }, {
            "a": [1, 5.4625, 15.0972, 26.2032, 31.0907, 25.6321, 14.4462, 5.113, 0.91562],
            "b": [0.003191, 0.017166, 0.047014, 0.081514, 0.097389, 0.081514, 0.047014, 0.017166, 0.003191]
        }, {
            "a": [1, 6.1973, 18.3056, 33.025, 39.6089, 32.2628, 17.4703, 5.778, 0.91084],
            "b": [0.003203, 0.0195, 0.057004, 0.10266, 0.12402, 0.10266, 0.057004, 0.0195, 0.003203]
        }, {
            "a": [1, 8.5781, 34.3335, 84.129, 139.4913, 163.3612, 136.8072, 80.9226, 32.3895, 7.9367, 0.90744],
            "b": [0.00095312, 0.006554, 0.019742, 0.032415, 0.02706, -2.2518e-16, -0.02706, -0.032415, -0.019742, -0.006554, -0.00095312]
        }, {
            "a": [1, 9.2358, 39.0159, 99.2029, 168.0494, 198.1261, 164.6253, 95.2015, 36.6793, 8.5058, 0.90221],
            "b": [0.0010088, 0.007466, 0.023736, 0.040448, 0.03451, -1.3995e-14, -0.03451, -0.040448, -0.023736, -0.007466, -0.0010088]
        }, {
            "a": [1, -6.6386, 20.5041, -38.09, 46.3893, -37.879, 20.2776, -6.5289, 0.97803],
            "b": [0.0031381, -0.020855, 0.064511, -0.12008, 0.14662, -0.12008, 0.064511, -0.020855, 0.0031381]
        }, {
            "a": [1, -6.4788, 19.7169, -36.3183, 44.1076, -36.1052, 19.4862, -6.3654, 0.97674],
            "b": [0.0031374, -0.020347, 0.062017, -0.11447, 0.13939, -0.11447, 0.062017, -0.020347, 0.0031374]
        }, {
            "a": [1, -6.301, 18.8632, -34.4197, 41.6733, -34.2058, 18.6295, -6.1842, 0.97537],
            "b": [0.0031366, -0.019783, 0.059314, -0.10846, 0.13169, -0.10846, 0.059314, -0.019783, 0.0031366]
        }, {
            "a": [1, -6.1032, 17.9418, -32.3969, 39.0928, -32.1836, 17.7064, -5.9835, 0.97393],
            "b": [0.003136, -0.019156, 0.0564, -0.10207, 0.12352, -0.10207, 0.0564, -0.019156, 0.003136]
        }, {
            "a": [1, -5.8836, 16.9527, -30.2554, 36.3767, -30.0445, 16.7172, -5.7613, 0.9724],
            "b": [0.0031354, -0.018462, 0.053273, -0.095293, 0.11493, -0.095293, 0.053273, -0.018462, 0.0031354]
        }, {
            "a": [1, -5.6398, 15.8978, -28.0049, 33.5412, -27.798, 15.6638, -5.5158, 0.97078],
            "b": [0.0031349, -0.017692, 0.049941, -0.088179, 0.10595, -0.088179, 0.049941, -0.017692, 0.0031349]
        }, {
            "a": [1, -5.3698, 14.7811, -25.659, 30.6088, -25.4583, 14.5508, -5.2448, 0.96907],
            "b": [0.0031344, -0.01684, 0.046416, -0.080767, 0.096675, -0.080767, 0.046416, -0.01684, 0.0031344]
        }, {
            "a": [1, -5.0711, 13.6097, -23.2359, 27.6088, -23.0434, 13.3851, -4.9461, 0.96726],
            "b": [0.0031341, -0.015899, 0.042721, -0.073114, 0.087183, -0.073114, 0.042721, -0.015899, 0.0031341]
        }, {
            "a": [1, -4.7414, 12.394, -20.7585, 24.5781, -20.5763, 12.1774, -4.6176, 0.96535],
            "b": [0.003134, -0.014861, 0.038888, -0.065293, 0.077595, -0.065293, 0.038888, -0.014861, 0.003134]
        }, {
            "a": [1, -4.378, 11.1491, -18.2535, 21.5613, -18.0838, 10.9427, -4.257, 0.96333],
            "b": [0.003134, -0.013718, 0.034966, -0.057389, 0.068052, -0.057389, 0.034966, -0.013718, 0.003134]
        }, {
            "a": [1, -3.9785, 9.8948, -15.7509, 18.6112, -15.5958, 9.7009, -3.8621, 0.96119],
            "b": [0.0031342, -0.012464, 0.031017, -0.049497, 0.058721, -0.049497, 0.031017, -0.012464, 0.0031342]
        }, {
            "a": [1, -3.5406, 8.6574, -13.2818, 15.7882, -13.1433, 8.4778, -3.431, 0.95893],
            "b": [0.0031347, -0.011089, 0.027122, -0.041715, 0.049793, -0.041715, 0.027122, -0.011089, 0.0031347]
        }, {
            "a": [1, -3.062, 7.4695, -10.8754, 13.1601, -10.7553, 7.3055, -2.9616, 0.95654],
            "b": [0.0031354, -0.0095885, 0.023386, -0.034137, 0.041483, -0.034137, 0.023386, -0.0095885, 0.0031354]
        }, {
            "a": [1, -2.5407, 6.3714, -8.5549, 10.802, -8.4548, 6.2232, -2.4526, 0.95402],
            "b": [0.0031365, -0.007955, 0.019933, -0.026835, 0.034028, -0.026835, 0.019933, -0.007955, 0.0031365]
        }, {
            "a": [1, -1.9754, 5.4108, -6.3316, 8.7955, -6.2531, 5.2775, -1.9029, 0.95135],
            "b": [0.003138, -0.0061843, 0.016912, -0.019846, 0.027684, -0.019846, 0.016912, -0.0061843, 0.003138]
        }, {
            "a": [1, -1.3651, 4.6429, -4.1983, 7.2293, -4.1432, 4.5219, -1.3121, 0.94854],
            "b": [0.0031399, -0.0042735, 0.014497, -0.013149, 0.02273, -0.013149, 0.014497, -0.0042735, 0.0031399]
        }, {
            "a": [1, -0.70999, 4.1295, -2.1213, 6.2003, -2.0919, 4.0155, -0.6808, 0.94556],
            "b": [0.0031424, -0.0022226, 0.01288, -0.0066381, 0.019472, -0.0066381, 0.01288, -0.0022226, 0.0031424]
        }, {
            "a": [1, -0.011217, 3.9367, -0.03313, 5.816, -0.032643, 3.8217, -0.010729, 0.94242],
            "b": [0.0031454, -3.5117e-05, 0.012266, -0.00010358, 0.018246, -0.00010358, 0.012266, -3.5117e-05, 0.0031454]
        }, {
            "a": [1, 0.72845, 4.1316, 2.1736, 6.1974, 2.1398, 4.0039, 0.69491, 0.9391],
            "b": [0.0031491, 0.0022809, 0.012865, 0.0067896, 0.019429, 0.0067896, 0.012865, 0.0022809, 0.0031491]
        }, {
            "a": [1, 1.5043, 4.7772, 4.6472, 7.4814, 4.5705, 4.6208, 1.4311, 0.9356],
            "b": [0.0031536, 0.0047116, 0.014871, 0.014504, 0.023449, 0.014504, 0.014871, 0.0047116, 0.0031536]
        }, {
            "a": [1, 2.3093, 5.9242, 7.57, 9.8198, 7.4377, 5.719, 2.1904, 0.93191],
            "b": [0.0031591, 0.0072358, 0.018443, 0.023608, 0.030778, 0.023608, 0.018443, 0.0072358, 0.0031591]
        }, {
            "a": [1, 3.1336, 7.6022, 11.1404, 13.3694, 10.9343, 7.3235, 2.9628, 0.92801],
            "b": [0.0031655, 0.0098234, 0.02367, 0.034719, 0.041903, 0.034719, 0.02367, 0.0098234, 0.0031655]
        }, {
            "a": [1, 3.9636, 9.8069, 15.5377, 18.2653, 15.2332, 9.4264, 3.7351, 0.92389],
            "b": [0.0031731, 0.012434, 0.030538, 0.048392, 0.057243, 0.048392, 0.030538, 0.012434, 0.0031731]
        }, {
            "a": [1, 4.782, 12.4868, 20.8695, 24.5721, 20.4365, 11.974, 4.4905, 0.91956],
            "b": [0.0031821, 0.015014, 0.038885, 0.064958, 0.076992, 0.064958, 0.038885, 0.015014, 0.0031821]
        }, {
            "a": [1, 5.567, 15.5289, 27.1032, 32.2046, 26.5078, 14.8541, 5.2081, 0.91498],
            "b": [0.0031926, 0.017497, 0.048359, 0.084306, 0.10087, 0.084306, 0.048359, 0.017497, 0.0031926]
        }]
    },
    'minusThird': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [1, -7.8456, 27.0753, -53.677, 66.8599, -53.5796, 26.9772, -7.803, 0.99276],
            "b": [0.003152, -0.024747, 0.085469, -0.16958, 0.21142, -0.16958, 0.085469, -0.024747, 0.003152]
        }, {
            "a": [1, -7.8272, 26.9669, -53.4078, 66.4998, -53.3051, 26.8633, -7.7822, 0.99234],
            "b": [0.0031514, -0.024686, 0.085118, -0.16872, 0.21028, -0.16872, 0.085118, -0.024686, 0.0031514]
        }, {
            "a": [1, -7.8066, 26.8458, -53.1076, 66.0987, -52.9995, 26.7366, -7.7591, 0.99188],
            "b": [0.0031509, -0.024617, 0.084727, -0.16776, 0.20901, -0.16776, 0.084727, -0.024617, 0.0031509]
        }, {
            "a": [1, -7.7836, 26.7105, -52.7731, 65.6521, -52.6593, 26.5954, -7.7333, 0.9914],
            "b": [0.0031503, -0.024541, 0.08429, -0.1667, 0.20759, -0.1667, 0.08429, -0.024541, 0.0031503]
        }, {
            "a": [1, -7.7578, 26.5595, -52.4005, 65.1552, -52.2808, 26.4383, -7.7047, 0.99089],
            "b": [0.0031497, -0.024455, 0.083804, -0.16551, 0.20602, -0.16551, 0.083804, -0.024455, 0.0031497]
        }, {
            "a": [1, -7.7289, 26.3911, -51.9858, 64.6027, -51.86, 26.2635, -7.6729, 0.99035],
            "b": [0.003149, -0.02436, 0.083262, -0.16419, 0.20427, -0.16419, 0.083262, -0.02436, 0.003149]
        }, {
            "a": [1, -7.6965, 26.2032, -51.5245, 63.9888, -51.3924, 26.069, -7.6374, 0.98978],
            "b": [0.0031484, -0.024254, 0.082658, -0.16272, 0.20233, -0.16272, 0.082658, -0.024254, 0.0031484]
        }, {
            "a": [1, -7.6602, 25.9938, -51.0118, 63.3075, -50.8732, 25.8528, -7.598, 0.98918],
            "b": [0.0031477, -0.024135, 0.081986, -0.16108, 0.20017, -0.16108, 0.081986, -0.024135, 0.0031477]
        }, {
            "a": [1, -7.6197, 25.7607, -50.4426, 62.552, -50.2974, 25.6126, -7.5541, 0.98854],
            "b": [0.003147, -0.024003, 0.081239, -0.15927, 0.19778, -0.15927, 0.081239, -0.024003, 0.003147]
        }, {
            "a": [1, -7.5742, 25.5012, -49.8113, 61.7153, -49.6594, 25.3459, -7.5052, 0.98786],
            "b": [0.0031463, -0.023855, 0.080408, -0.15726, 0.19513, -0.15726, 0.080408, -0.023855, 0.0031463]
        }, {
            "a": [1, -7.5234, 25.2127, -49.112, 60.7899, -48.9534, 25.0501, -7.4507, 0.98714],
            "b": [0.0031456, -0.02369, 0.079485, -0.15504, 0.1922, -0.15504, 0.079485, -0.02369, 0.0031456]
        }, {
            "a": [1, -7.4665, 24.8922, -48.3386, 59.768, -48.1732, 24.7221, -7.3902, 0.98639],
            "b": [0.0031448, -0.023506, 0.078461, -0.15258, 0.18897, -0.15258, 0.078461, -0.023506, 0.0031448]
        }, {
            "a": [1, -7.4029, 24.5366, -47.4844, 58.6416, -47.3123, 24.3591, -7.3227, 0.98558],
            "b": [0.003144, -0.0233, 0.077326, -0.14987, 0.1854, -0.14987, 0.077326, -0.0233, 0.003144]
        }, {
            "a": [1, -7.3318, 24.1426, -46.5429, 57.4023, -46.3642, 23.9576, -7.2476, 0.98473],
            "b": [0.0031432, -0.023071, 0.07607, -0.14688, 0.18148, -0.14688, 0.07607, -0.023071, 0.0031432]
        }, {
            "a": [1, -7.2522, 23.7067, -45.5072, 56.042, -45.3221, 23.5142, -7.1641, 0.98383],
            "b": [0.0031424, -0.022815, 0.074682, -0.14359, 0.17717, -0.14359, 0.074682, -0.022815, 0.0031424]
        }, {
            "a": [1, -7.1633, 23.2252, -44.3706, 54.5526, -44.1794, 23.0255, -7.0711, 0.98288],
            "b": [0.0031416, -0.02253, 0.073149, -0.13999, 0.17246, -0.13999, 0.073149, -0.02253, 0.0031416]
        }, {
            "a": [1, -7.064, 22.6944, -43.1264, 52.9265, -42.9296, 22.4877, -6.9678, 0.98187],
            "b": [0.0031408, -0.022212, 0.071462, -0.13604, 0.16731, -0.13604, 0.071462, -0.022212, 0.0031408]
        }, {
            "a": [1, -6.9532, 22.1106, -41.7686, 51.1569, -41.5667, 21.8973, -6.8528, 0.9808],
            "b": [0.00314, -0.021857, 0.069607, -0.13174, 0.16171, -0.13174, 0.069607, -0.021857, 0.00314]
        }, {
            "a": [1, -6.8295, 21.4701, -40.2919, 49.2383, -40.0855, 21.2507, -6.7251, 0.97967],
            "b": [0.0031392, -0.021463, 0.067574, -0.12706, 0.15563, -0.12706, 0.067574, -0.021463, 0.0031392]
        }, {
            "a": [1, -6.6915, 20.7694, -38.6918, 47.1665, -38.4819, 20.5447, -6.5832, 0.97847],
            "b": [0.0031384, -0.021023, 0.065352, -0.12199, 0.14908, -0.12199, 0.065352, -0.021023, 0.0031384]
        }, {
            "a": [1, -6.5378, 20.0055, -36.9655, 44.94, -36.753, 19.7762, -6.4258, 0.97721],
            "b": [0.0031376, -0.020535, 0.062931, -0.11652, 0.14203, -0.11652, 0.062931, -0.020535, 0.0031376]
        }, {
            "a": [1, -6.3667, 19.1758, -35.1121, 42.5597, -34.8983, 18.943, -6.2511, 0.97587],
            "b": [0.0031369, -0.019991, 0.060304, -0.11066, 0.1345, -0.11066, 0.060304, -0.019991, 0.0031369]
        }, {
            "a": [1, -6.1762, 18.2786, -33.1331, 40.0304, -32.9195, 18.0436, -6.0575, 0.97445],
            "b": [0.0031362, -0.019388, 0.057465, -0.10439, 0.12649, -0.10439, 0.057465, -0.019388, 0.0031362]
        }, {
            "a": [1, -5.9646, 17.3136, -31.0331, 37.3612, -30.8212, 17.0779, -5.8432, 0.97296],
            "b": [0.0031356, -0.018718, 0.054414, -0.097752, 0.11804, -0.097752, 0.054414, -0.018718, 0.0031356]
        }, {
            "a": [1, -5.7298, 16.2818, -28.8202, 34.5661, -28.6117, 16.0471, -5.6063, 0.97137],
            "b": [0.003135, -0.017976, 0.051154, -0.090756, 0.1092, -0.090756, 0.051154, -0.017976, 0.003135]
        }, {
            "a": [1, -5.4694, 15.1866, -26.5065, 31.6653, -26.3034, 14.9547, -5.3446, 0.96969],
            "b": [0.0031346, -0.017154, 0.047695, -0.083444, 0.10002, -0.083444, 0.047695, -0.017154, 0.0031346]
        }, {
            "a": [1, -5.1812, 14.0337, -24.1086, 28.6856, -23.9129, 13.8067, -5.0561, 0.96792],
            "b": [0.0031342, -0.016245, 0.044058, -0.07587, 0.09059, -0.07587, 0.044058, -0.016245, 0.0031342]
        }, {
            "a": [1, -4.8628, 12.8323, -21.6477, 25.6611, -21.4616, 12.6126, -4.7385, 0.96605],
            "b": [0.003134, -0.015243, 0.04027, -0.0681, 0.081021, -0.0681, 0.04027, -0.015243, 0.003134]
        }, {
            "a": [1, -4.5117, 11.5958, -19.1493, 22.6337, -18.9749, 11.3855, -4.3896, 0.96406],
            "b": [0.003134, -0.014139, 0.036373, -0.060215, 0.071444, -0.060215, 0.036373, -0.014139, 0.003134]
        }, {
            "a": [1, -4.1254, 10.3422, -16.6423, 19.6533, -16.4817, 10.1437, -4.0072, 0.96197],
            "b": [0.0031341, -0.012925, 0.032425, -0.052307, 0.062017, -0.052307, 0.032425, -0.012925, 0.0031341]
        }, {
            "a": [1, -3.7015, 9.0954, -14.1577, 16.7775, -14.013, 8.9105, -3.5892, 0.95975],
            "b": [0.0031345, -0.011594, 0.028501, -0.044475, 0.052922, -0.044475, 0.028501, -0.011594, 0.0031345]
        }, {
            "a": [1, -3.2377, 7.8856, -11.7258, 14.0716, -11.5989, 7.7159, -3.1337, 0.95741],
            "b": [0.0031351, -0.010139, 0.024694, -0.036814, 0.044365, -0.036814, 0.024694, -0.010139, 0.0031351]
        }, {
            "a": [1, -2.7318, 6.7504, -9.3726, 11.608, -9.2651, 6.5965, -2.639, 0.95494],
            "b": [0.0031361, -0.0085538, 0.021124, -0.029407, 0.036576, -0.029407, 0.021124, -0.0085538, 0.0031361]
        }, {
            "a": [1, -2.1824, 5.7347, -7.1142, 9.4662, -7.0279, 5.5963, -2.1039, 0.95232],
            "b": [0.0031374, -0.0068325, 0.017931, -0.022305, 0.029804, -0.022305, 0.017931, -0.0068325, 0.0031374]
        }, {
            "a": [1, -1.5882, 4.8912, -4.9511, 7.7321, -4.8875, 4.7663, -1.5277, 0.94956],
            "b": [0.0031392, -0.0049719, 0.015278, -0.015511, 0.024321, -0.015511, 0.015278, -0.0049719, 0.0031392]
        }, {
            "a": [1, -0.94902, 4.2795, -2.8599, 6.4995, -2.821, 4.1638, -0.91078, 0.94664],
            "b": [0.0031414, -0.0029709, 0.013353, -0.008952, 0.020421, -0.008952, 0.013353, -0.0029709, 0.0031414]
        }, {
            "a": [1, -0.26559, 3.9645, -0.78589, 5.8719, -0.77456, 3.851, -0.25427, 0.94356],
            "b": [0.0031442, -0.00083147, 0.012357, -0.0024578, 0.018428, -0.0024578, 0.012357, -0.00083147, 0.0031442]
        }, {
            "a": [1, 0.4599, 4.0134, 1.3636, 5.965, 1.3428, 3.8918, 0.43915, 0.94031],
            "b": [0.0031477, 0.00144, 0.012499, 0.0042607, 0.018704, 0.0042607, 0.012499, 0.00144, 0.0031477]
        }, {
            "a": [1, 1.2235, 4.4914, 3.7224, 6.91, 3.6623, 4.3474, 1.1651, 0.93687],
            "b": [0.0031519, 0.0038317, 0.013982, 0.011621, 0.021659, 0.011621, 0.013982, 0.0038317, 0.0031519]
        }, {
            "a": [1, -7.4582, 24.8457, -48.2266, 59.6202, -48.0603, 24.6746, -7.3813, 0.98628],
            "b": [0.0031447, -0.023479, 0.078313, -0.15223, 0.1885, -0.15223, 0.078313, -0.023479, 0.0031447]
        }, {
            "a": [1, -7.3936, 24.485, -47.3609, 58.4788, -47.1879, 24.3065, -7.3129, 0.98547],
            "b": [0.0031439, -0.02327, 0.077162, -0.14948, 0.18489, -0.14948, 0.077162, -0.02327, 0.0031439]
        }, {
            "a": [1, -7.3214, 24.0855, -46.4069, 57.2235, -46.2273, 23.8994, -7.2367, 0.98461],
            "b": [0.0031431, -0.023037, 0.075888, -0.14645, 0.18091, -0.14645, 0.075888, -0.023037, 0.0031431]
        }, {
            "a": [1, -7.2406, 23.6436, -45.3578, 55.846, -45.1718, 23.4501, -7.1519, 0.9837],
            "b": [0.0031423, -0.022778, 0.074481, -0.14312, 0.17655, -0.14312, 0.074481, -0.022778, 0.0031423]
        }, {
            "a": [1, -7.1504, 23.1556, -44.2068, 54.3383, -44.0148, 22.9549, -7.0576, 0.98274],
            "b": [0.0031415, -0.022488, 0.072928, -0.13947, 0.17178, -0.13947, 0.072928, -0.022488, 0.0031415]
        }, {
            "a": [1, -7.0496, 22.6177, -42.9474, 52.6929, -42.7498, 22.4101, -6.9527, 0.98173],
            "b": [0.0031407, -0.022165, 0.071218, -0.13547, 0.16657, -0.13547, 0.071218, -0.022165, 0.0031407]
        }, {
            "a": [1, -6.9371, 22.0264, -41.5737, 50.9033, -41.3711, 21.8122, -6.8361, 0.98065],
            "b": [0.0031399, -0.021806, 0.06934, -0.13112, 0.1609, -0.13112, 0.06934, -0.021806, 0.0031399]
        }, {
            "a": [1, -6.8115, 21.3778, -40.0802, 48.9638, -39.8733, 21.1577, -6.7065, 0.97951],
            "b": [0.0031391, -0.021405, 0.067281, -0.12639, 0.15477, -0.12639, 0.067281, -0.021405, 0.0031391]
        }, {
            "a": [1, -6.6715, 20.6687, -38.463, 46.8709, -38.2527, 20.4432, -6.5626, 0.97831],
            "b": [0.0031383, -0.020959, 0.065032, -0.12126, 0.14814, -0.12126, 0.065032, -0.020959, 0.0031383]
        }, {
            "a": [1, -6.5155, 19.8958, -36.7193, 44.6232, -36.5066, 19.666, -6.4029, 0.97703],
            "b": [0.0031375, -0.020463, 0.062584, -0.11574, 0.14103, -0.11574, 0.062584, -0.020463, 0.0031375]
        }, {
            "a": [1, -6.3418, 19.057, -34.8486, 42.2222, -34.6348, 18.8238, -6.2258, 0.97568],
            "b": [0.0031368, -0.019912, 0.059928, -0.10982, 0.13343, -0.10982, 0.059928, -0.019912, 0.0031368]
        }, {
            "a": [1, -6.1486, 18.1505, -32.8527, 39.6731, -32.6392, 17.9154, -6.0295, 0.97425],
            "b": [0.0031361, -0.0193, 0.05706, -0.10351, 0.12536, -0.10351, 0.05706, -0.0193, 0.0031361]
        }, {
            "a": [1, -5.9339, 17.1763, -30.7367, 36.9857, -30.5251, 16.9406, -5.8122, 0.97274],
            "b": [0.0031355, -0.018621, 0.05398, -0.096815, 0.11685, -0.096815, 0.05398, -0.018621, 0.0031355]
        }, {
            "a": [1, -5.6957, 16.1356, -28.5092, 34.1748, -28.3013, 15.9011, -5.572, 0.97115],
            "b": [0.003135, -0.017868, 0.050692, -0.089773, 0.10796, -0.089773, 0.050692, -0.017868, 0.003135]
        }, {
            "a": [1, -5.4317, 15.032, -26.1829, 31.2614, -25.9806, 14.8007, -5.3067, 0.96946],
            "b": [0.0031345, -0.017035, 0.047208, -0.082422, 0.09874, -0.082422, 0.047208, -0.017035, 0.0031345]
        }, {
            "a": [1, -5.1395, 13.8719, -23.775, 28.2734, -23.5805, 13.6458, -5.0144, 0.96767],
            "b": [0.0031342, -0.016114, 0.043547, -0.074816, 0.089286, -0.074816, 0.043547, -0.016114, 0.0031342]
        }, {
            "a": [1, -4.8168, 12.6648, -21.3074, 25.2459, -21.1227, 12.4462, -4.6926, 0.96578],
            "b": [0.003134, -0.015098, 0.039742, -0.067025, 0.079708, -0.067025, 0.039742, -0.015098, 0.003134]
        }, {
            "a": [1, -4.461, 11.4248, -18.806, 22.2218, -18.6333, 11.216, -4.3393, 0.96378],
            "b": [0.003134, -0.013979, 0.035834, -0.059132, 0.070141, -0.059132, 0.035834, -0.013979, 0.003134]
        }, {
            "a": [1, -4.0697, 10.1706, -16.3002, 19.2521, -16.1417, 9.9738, -3.9521, 0.96167],
            "b": [0.0031342, -0.01275, 0.031885, -0.051229, 0.060748, -0.051229, 0.031885, -0.01275, 0.0031342]
        }, {
            "a": [1, -3.6404, 8.9269, -13.8211, 16.3955, -13.6788, 8.744, -3.5291, 0.95944],
            "b": [0.0031346, -0.011403, 0.02797, -0.043415, 0.051714, -0.043415, 0.02797, -0.011403, 0.0031346]
        }, {
            "a": [1, -3.171, 7.7249, -11.3986, 13.7184, -11.2743, 7.5573, -3.0683, 0.95708],
            "b": [0.0031353, -0.0099302, 0.024189, -0.035784, 0.043248, -0.035784, 0.024189, -0.0099302, 0.0031353]
        }, {
            "a": [1, -2.6593, 6.6032, -9.0577, 11.2941, -8.953, 6.4515, -2.5682, 0.95459],
            "b": [0.0031363, -0.0083264, 0.020661, -0.028416, 0.035583, -0.028416, 0.020661, -0.0083264, 0.0031363]
        }, {
            "a": [1, -2.1037, 5.6078, -6.8128, 9.2027, -6.7295, 5.4714, -2.0274, 0.95195],
            "b": [0.0031376, -0.0065862, 0.017532, -0.021358, 0.028971, -0.021358, 0.017532, -0.0065862, 0.0031376]
        }, {
            "a": [1, -1.5034, 4.7924, -4.6615, 7.5316, -4.6012, 4.669, -1.4457, 0.94917],
            "b": [0.0031395, -0.0047063, 0.014967, -0.014602, 0.023687, -0.014602, 0.014967, -0.0047063, 0.0031395]
        }, {
            "a": [1, -0.85806, 4.2174, -2.5767, 6.3755, -2.5413, 4.1024, -0.82322, 0.94623],
            "b": [0.0031418, -0.0026861, 0.013157, -0.0080645, 0.020028, -0.0080645, 0.013157, -0.0026861, 0.0031418]
        }, {
            "a": [1, -0.16872, 3.9482, -0.49873, 5.8393, -0.49148, 3.8343, -0.16147, 0.94313],
            "b": [0.0031447, -0.0005282, 0.012304, -0.0015595, 0.018323, -0.0015595, 0.012304, -0.0005282, 0.0031447]
        }, {
            "a": [1, 0.56227, 4.0521, 1.6706, 6.0409, 1.6449, 3.9284, 0.53671, 0.93985],
            "b": [0.0031482, 0.0017605, 0.012619, 0.0052193, 0.01894, 0.0052193, 0.012619, 0.0017605, 0.0031482]
        }, {
            "a": [1, 1.3307, 4.5935, 4.0707, 7.1136, 4.0044, 4.445, 1.2667, 0.93639],
            "b": [0.0031526, 0.0041675, 0.0143, 0.012707, 0.022296, 0.012707, 0.0143, 0.0041675, 0.0031526]
        }, {
            "a": [1, 2.13, 5.6266, 6.8777, 9.2063, 6.7591, 5.4342, 2.0216, 0.93274],
            "b": [0.0031578, 0.0066733, 0.017516, 0.021453, 0.028855, 0.021453, 0.017516, 0.0066733, 0.0031578]
        }, {
            "a": [1, 2.9511, 7.1867, 10.2888, 12.4762, 10.1008, 6.9265, 2.7922, 0.92888],
            "b": [0.003164, 0.0092501, 0.022375, 0.03207, 0.039104, 0.03207, 0.022375, 0.0092501, 0.003164]
        }, {
            "a": [1, 3.7811, 9.278, 14.4913, 17.0667, 14.2109, 8.9224, 3.5658, 0.92482],
            "b": [0.0031713, 0.01186, 0.02889, 0.045139, 0.053488, 0.045139, 0.02889, 0.01186, 0.0031713]
        }, {
            "a": [1, 4.6039, 11.8606, 19.6141, 23.0635, 19.2122, 11.3795, 4.3266, 0.92053],
            "b": [0.00318, 0.014452, 0.036935, 0.061058, 0.072269, 0.061058, 0.036935, 0.014452, 0.00318]
        }, {
            "a": [1, 5.3983, 14.8362, 25.6619, 30.4224, 25.1051, 14.1995, 5.0545, 0.91601],
            "b": [0.0031901, 0.016963, 0.046202, 0.079834, 0.095298, 0.079834, 0.046202, 0.016963, 0.0031901]
        }, {
            "a": [1, 6.1389, 18.036, 32.4396, 38.8717, 31.6944, 17.2169, 5.7255, 0.91124],
            "b": [0.0032019, 0.019314, 0.056165, 0.10085, 0.12171, 0.10085, 0.056165, 0.019314, 0.0032019]
        }, {
            "a": [1, 8.5157, 33.9068, 82.7916, 136.9957, 160.3367, 134.3722, 79.651, 31.9959, 7.8819, 0.90786],
            "b": [0.00094862, 0.0064757, 0.019405, 0.031749, 0.026449, -1.466e-16, -0.026449, -0.031749, -0.019405, -0.0064757, -0.00094862]
        }, {
            "a": [1, 9.1881, 38.6648, 98.0477, 165.8339, 195.4197, 162.471, 94.1115, 36.36, 8.4653, 0.90266],
            "b": [0.001004, 0.0073927, 0.023412, 0.03979, 0.033894, -1.0118e-14, -0.033894, -0.03979, -0.023412, -0.0073927, -0.001004]
        }, {
            "a": [1, -6.6511, 20.5667, -38.2319, 46.5724, -38.0211, 20.3406, -6.5417, 0.97813],
            "b": [0.0031382, -0.020895, 0.064709, -0.12053, 0.1472, -0.12053, 0.064709, -0.020895, 0.0031382]
        }, {
            "a": [1, -6.4928, 19.785, -36.4708, 44.3036, -36.2578, 19.5546, -6.3797, 0.97685],
            "b": [0.0031374, -0.020391, 0.062232, -0.11496, 0.14001, -0.11496, 0.062232, -0.020391, 0.0031374]
        }, {
            "a": [1, -6.3165, 18.9369, -34.5828, 41.8819, -34.3689, 18.7034, -6.2001, 0.97549],
            "b": [0.0031367, -0.019832, 0.059548, -0.10898, 0.13235, -0.10898, 0.059548, -0.019832, 0.0031367]
        }, {
            "a": [1, -6.1205, 18.0212, -32.5701, 39.3132, -32.3567, 17.7859, -6.001, 0.97405],
            "b": [0.003136, -0.019211, 0.056651, -0.10261, 0.12422, -0.10261, 0.056651, -0.019211, 0.003136]
        }, {
            "a": [1, -5.9028, 17.0377, -30.4382, 36.6078, -30.227, 16.8021, -5.7807, 0.97253],
            "b": [0.0031354, -0.018522, 0.053542, -0.095871, 0.11566, -0.095871, 0.053542, -0.018522, 0.0031354]
        }, {
            "a": [1, -5.6611, 15.9882, -28.1963, 33.7815, -27.989, 15.754, -5.5372, 0.97092],
            "b": [0.0031349, -0.017759, 0.050226, -0.088784, 0.10671, -0.088784, 0.050226, -0.017759, 0.0031349]
        }, {
            "a": [1, -5.3934, 14.8764, -25.8577, 30.8562, -25.6564, 14.6456, -5.2684, 0.96922],
            "b": [0.0031345, -0.016914, 0.046717, -0.081395, 0.097458, -0.081395, 0.046717, -0.016914, 0.0031345]
        }, {
            "a": [1, -5.0972, 13.7092, -23.4403, 27.8605, -23.247, 13.484, -4.9721, 0.96742],
            "b": [0.0031342, -0.015981, 0.043034, -0.073759, 0.08798, -0.073759, 0.043034, -0.015981, 0.0031342]
        }, {
            "a": [1, -4.7701, 12.4967, -20.9664, 24.8308, -20.7833, 12.2793, -4.6462, 0.96552],
            "b": [0.003134, -0.014951, 0.039212, -0.065949, 0.078394, -0.065949, 0.039212, -0.014951, 0.003134]
        }, {
            "a": [1, -4.4096, 11.2535, -18.4626, 21.811, -18.2918, 11.0462, -4.2883, 0.9635],
            "b": [0.003134, -0.013818, 0.035295, -0.058049, 0.068842, -0.058049, 0.035295, -0.013818, 0.003134]
        }, {
            "a": [1, -4.0132, 9.9991, -15.9586, 18.8531, -15.8022, 9.8041, -3.8964, 0.96137],
            "b": [0.0031342, -0.012573, 0.031345, -0.050152, 0.059486, -0.050152, 0.031345, -0.012573, 0.0031342]
        }, {
            "a": [1, -3.5786, 8.7591, -13.4856, 16.017, -13.3456, 8.5783, -3.4683, 0.95913],
            "b": [0.0031346, -0.011209, 0.027442, -0.042357, 0.050517, -0.042357, 0.027442, -0.011209, 0.0031346]
        }, {
            "a": [1, -3.1035, 7.5657, -11.0729, 13.3699, -10.9512, 7.4003, -3.0022, 0.95675],
            "b": [0.0031354, -0.0097186, 0.023688, -0.034759, 0.042147, -0.034759, 0.023688, -0.0097186, 0.0031354]
        }, {
            "a": [1, -2.5858, 6.4584, -8.7446, 10.9863, -8.6428, 6.3089, -2.4966, 0.95424],
            "b": [0.0031364, -0.0080964, 0.020206, -0.027432, 0.03461, -0.027432, 0.020206, -0.0080964, 0.0031364]
        }, {
            "a": [1, -2.0242, 5.4843, -6.5132, 8.9472, -6.4329, 5.3499, -1.9503, 0.95158],
            "b": [0.0031379, -0.0063372, 0.017143, -0.020416, 0.028163, -0.020416, 0.017143, -0.0063372, 0.0031379]
        }, {
            "a": [1, -1.4177, 4.698, -4.3732, 7.3407, -4.3161, 4.5762, -1.3629, 0.94878],
            "b": [0.0031397, -0.0044381, 0.014671, -0.013698, 0.023083, -0.013698, 0.014671, -0.0044381, 0.0031397]
        }, {
            "a": [1, -0.76628, 4.1609, -2.2937, 6.263, -2.2619, 4.0467, -0.73492, 0.94582],
            "b": [0.0031421, -0.0023988, 0.012979, -0.0071778, 0.019671, -0.0071778, 0.012979, -0.0023988, 0.0031421]
        }, {
            "a": [1, -0.071059, 3.9389, -0.20992, 5.8205, -0.20685, 3.8244, -0.067982, 0.94269],
            "b": [0.0031451, -0.00022247, 0.012274, -0.00065634, 0.018261, -0.00065634, 0.012274, -0.00022247, 0.0031451]
        }, {
            "a": [1, 0.66535, 4.099, 1.9818, 6.1331, 1.9511, 3.9729, 0.63486, 0.93939],
            "b": [0.0031488, 0.0020833, 0.012764, 0.006191, 0.019228, 0.006191, 0.012764, 0.0020833, 0.0031488]
        }, {
            "a": [1, 1.4384, 4.7048, 4.4266, 7.3363, 4.3539, 4.5516, 1.3687, 0.9359],
            "b": [0.0031532, 0.0045052, 0.014646, 0.013816, 0.022994, 0.013816, 0.014646, 0.0045052, 0.0031532]
        }, {
            "a": [1, 2.2414, 5.8085, 7.3044, 9.5808, 7.1774, 5.6083, 2.1264, 0.93222],
            "b": [0.0031586, 0.0070225, 0.018082, 0.022781, 0.030029, 0.022781, 0.018082, 0.0070225, 0.0031586]
        }, {
            "a": [1, 3.0645, 7.4419, 10.8135, 13.0237, 10.6143, 7.1703, 2.8982, 0.92834],
            "b": [0.0031649, 0.0096062, 0.02317, 0.033702, 0.04082, 0.033702, 0.02317, 0.0096062, 0.0031649]
        }, {
            "a": [1, 3.8946, 9.6039, 15.1363, 17.8036, 14.8411, 9.233, 3.6711, 0.92424],
            "b": [0.0031724, 0.012217, 0.029906, 0.047144, 0.055797, 0.047144, 0.029906, 0.012217, 0.0031724]
        }, {
            "a": [1, 4.7148, 12.2476, 20.3891, 23.9934, 19.9681, 11.747, 4.4287, 0.91993],
            "b": [0.0031813, 0.014802, 0.03814, 0.063466, 0.07518, 0.063466, 0.03814, 0.014802, 0.0031813]
        }, {
            "a": [1, 5.5035, 15.2656, 26.5537, 31.524, 25.9731, 14.6053, 5.1503, 0.91537],
            "b": [0.0031916, 0.017296, 0.047539, 0.082601, 0.098744, 0.082601, 0.047539, 0.017296, 0.0031916]
        }]
    },
    'minusThreeQuarters': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [1, -7.8456, 27.0753, -53.677, 66.8599, -53.5796, 26.9772, -7.803, 0.99276],
            "b": [0.003152, -0.024747, 0.085469, -0.16958, 0.21142, -0.16958, 0.085469, -0.024747, 0.003152]
        }, {
            "a": [1, -7.8272, 26.9669, -53.4078, 66.4998, -53.3051, 26.8633, -7.7822, 0.99234],
            "b": [0.0031514, -0.024686, 0.085118, -0.16872, 0.21028, -0.16872, 0.085118, -0.024686, 0.0031514]
        }, {
            "a": [1, -7.8066, 26.8458, -53.1076, 66.0987, -52.9995, 26.7366, -7.7591, 0.99188],
            "b": [0.0031509, -0.024617, 0.084727, -0.16776, 0.20901, -0.16776, 0.084727, -0.024617, 0.0031509]
        }, {
            "a": [1, -7.7836, 26.7105, -52.7731, 65.6521, -52.6593, 26.5954, -7.7333, 0.9914],
            "b": [0.0031503, -0.024541, 0.08429, -0.1667, 0.20759, -0.1667, 0.08429, -0.024541, 0.0031503]
        }, {
            "a": [1, -7.7578, 26.5595, -52.4005, 65.1552, -52.2808, 26.4383, -7.7047, 0.99089],
            "b": [0.0031497, -0.024455, 0.083804, -0.16551, 0.20602, -0.16551, 0.083804, -0.024455, 0.0031497]
        }, {
            "a": [1, -7.7289, 26.3911, -51.9858, 64.6027, -51.86, 26.2635, -7.6729, 0.99035],
            "b": [0.003149, -0.02436, 0.083262, -0.16419, 0.20427, -0.16419, 0.083262, -0.02436, 0.003149]
        }, {
            "a": [1, -7.6965, 26.2032, -51.5245, 63.9888, -51.3924, 26.069, -7.6374, 0.98978],
            "b": [0.0031484, -0.024254, 0.082658, -0.16272, 0.20233, -0.16272, 0.082658, -0.024254, 0.0031484]
        }, {
            "a": [1, -7.6602, 25.9938, -51.0118, 63.3075, -50.8732, 25.8528, -7.598, 0.98918],
            "b": [0.0031477, -0.024135, 0.081986, -0.16108, 0.20017, -0.16108, 0.081986, -0.024135, 0.0031477]
        }, {
            "a": [1, -7.6197, 25.7607, -50.4426, 62.552, -50.2974, 25.6126, -7.5541, 0.98854],
            "b": [0.003147, -0.024003, 0.081239, -0.15927, 0.19778, -0.15927, 0.081239, -0.024003, 0.003147]
        }, {
            "a": [1, -7.5742, 25.5012, -49.8113, 61.7153, -49.6594, 25.3459, -7.5052, 0.98786],
            "b": [0.0031463, -0.023855, 0.080408, -0.15726, 0.19513, -0.15726, 0.080408, -0.023855, 0.0031463]
        }, {
            "a": [1, -7.5234, 25.2127, -49.112, 60.7899, -48.9534, 25.0501, -7.4507, 0.98714],
            "b": [0.0031456, -0.02369, 0.079485, -0.15504, 0.1922, -0.15504, 0.079485, -0.02369, 0.0031456]
        }, {
            "a": [1, -7.4665, 24.8922, -48.3386, 59.768, -48.1732, 24.7221, -7.3902, 0.98639],
            "b": [0.0031448, -0.023506, 0.078461, -0.15258, 0.18897, -0.15258, 0.078461, -0.023506, 0.0031448]
        }, {
            "a": [1, -7.4029, 24.5366, -47.4844, 58.6416, -47.3123, 24.3591, -7.3227, 0.98558],
            "b": [0.003144, -0.0233, 0.077326, -0.14987, 0.1854, -0.14987, 0.077326, -0.0233, 0.003144]
        }, {
            "a": [1, -7.3318, 24.1426, -46.5429, 57.4023, -46.3642, 23.9576, -7.2476, 0.98473],
            "b": [0.0031432, -0.023071, 0.07607, -0.14688, 0.18148, -0.14688, 0.07607, -0.023071, 0.0031432]
        }, {
            "a": [1, -7.2522, 23.7067, -45.5072, 56.042, -45.3221, 23.5142, -7.1641, 0.98383],
            "b": [0.0031424, -0.022815, 0.074682, -0.14359, 0.17717, -0.14359, 0.074682, -0.022815, 0.0031424]
        }, {
            "a": [1, -7.1633, 23.2252, -44.3706, 54.5526, -44.1794, 23.0255, -7.0711, 0.98288],
            "b": [0.0031416, -0.02253, 0.073149, -0.13999, 0.17246, -0.13999, 0.073149, -0.02253, 0.0031416]
        }, {
            "a": [1, -7.064, 22.6944, -43.1264, 52.9265, -42.9296, 22.4877, -6.9678, 0.98187],
            "b": [0.0031408, -0.022212, 0.071462, -0.13604, 0.16731, -0.13604, 0.071462, -0.022212, 0.0031408]
        }, {
            "a": [1, -6.9532, 22.1106, -41.7686, 51.1569, -41.5667, 21.8973, -6.8528, 0.9808],
            "b": [0.00314, -0.021857, 0.069607, -0.13174, 0.16171, -0.13174, 0.069607, -0.021857, 0.00314]
        }, {
            "a": [1, -6.8295, 21.4701, -40.2919, 49.2383, -40.0855, 21.2507, -6.7251, 0.97967],
            "b": [0.0031392, -0.021463, 0.067574, -0.12706, 0.15563, -0.12706, 0.067574, -0.021463, 0.0031392]
        }, {
            "a": [1, -6.6915, 20.7694, -38.6918, 47.1665, -38.4819, 20.5447, -6.5832, 0.97847],
            "b": [0.0031384, -0.021023, 0.065352, -0.12199, 0.14908, -0.12199, 0.065352, -0.021023, 0.0031384]
        }, {
            "a": [1, -6.5378, 20.0055, -36.9655, 44.94, -36.753, 19.7762, -6.4258, 0.97721],
            "b": [0.0031376, -0.020535, 0.062931, -0.11652, 0.14203, -0.11652, 0.062931, -0.020535, 0.0031376]
        }, {
            "a": [1, -6.3667, 19.1758, -35.1121, 42.5597, -34.8983, 18.943, -6.2511, 0.97587],
            "b": [0.0031369, -0.019991, 0.060304, -0.11066, 0.1345, -0.11066, 0.060304, -0.019991, 0.0031369]
        }, {
            "a": [1, -6.1762, 18.2786, -33.1331, 40.0304, -32.9195, 18.0436, -6.0575, 0.97445],
            "b": [0.0031362, -0.019388, 0.057465, -0.10439, 0.12649, -0.10439, 0.057465, -0.019388, 0.0031362]
        }, {
            "a": [1, -5.9646, 17.3136, -31.0331, 37.3612, -30.8212, 17.0779, -5.8432, 0.97296],
            "b": [0.0031356, -0.018718, 0.054414, -0.097752, 0.11804, -0.097752, 0.054414, -0.018718, 0.0031356]
        }, {
            "a": [1, -5.7298, 16.2818, -28.8202, 34.5661, -28.6117, 16.0471, -5.6063, 0.97137],
            "b": [0.003135, -0.017976, 0.051154, -0.090756, 0.1092, -0.090756, 0.051154, -0.017976, 0.003135]
        }, {
            "a": [1, -5.4694, 15.1866, -26.5065, 31.6653, -26.3034, 14.9547, -5.3446, 0.96969],
            "b": [0.0031346, -0.017154, 0.047695, -0.083444, 0.10002, -0.083444, 0.047695, -0.017154, 0.0031346]
        }, {
            "a": [1, -5.1812, 14.0337, -24.1086, 28.6856, -23.9129, 13.8067, -5.0561, 0.96792],
            "b": [0.0031342, -0.016245, 0.044058, -0.07587, 0.09059, -0.07587, 0.044058, -0.016245, 0.0031342]
        }, {
            "a": [1, -4.8628, 12.8323, -21.6477, 25.6611, -21.4616, 12.6126, -4.7385, 0.96605],
            "b": [0.003134, -0.015243, 0.04027, -0.0681, 0.081021, -0.0681, 0.04027, -0.015243, 0.003134]
        }, {
            "a": [1, -4.5117, 11.5958, -19.1493, 22.6337, -18.9749, 11.3855, -4.3896, 0.96406],
            "b": [0.003134, -0.014139, 0.036373, -0.060215, 0.071444, -0.060215, 0.036373, -0.014139, 0.003134]
        }, {
            "a": [1, -4.1254, 10.3422, -16.6423, 19.6533, -16.4817, 10.1437, -4.0072, 0.96197],
            "b": [0.0031341, -0.012925, 0.032425, -0.052307, 0.062017, -0.052307, 0.032425, -0.012925, 0.0031341]
        }, {
            "a": [1, -3.7015, 9.0954, -14.1577, 16.7775, -14.013, 8.9105, -3.5892, 0.95975],
            "b": [0.0031345, -0.011594, 0.028501, -0.044475, 0.052922, -0.044475, 0.028501, -0.011594, 0.0031345]
        }, {
            "a": [1, -3.2377, 7.8856, -11.7258, 14.0716, -11.5989, 7.7159, -3.1337, 0.95741],
            "b": [0.0031351, -0.010139, 0.024694, -0.036814, 0.044365, -0.036814, 0.024694, -0.010139, 0.0031351]
        }, {
            "a": [1, -2.7318, 6.7504, -9.3726, 11.608, -9.2651, 6.5965, -2.639, 0.95494],
            "b": [0.0031361, -0.0085538, 0.021124, -0.029407, 0.036576, -0.029407, 0.021124, -0.0085538, 0.0031361]
        }, {
            "a": [1, -2.1824, 5.7347, -7.1142, 9.4662, -7.0279, 5.5963, -2.1039, 0.95232],
            "b": [0.0031374, -0.0068325, 0.017931, -0.022305, 0.029804, -0.022305, 0.017931, -0.0068325, 0.0031374]
        }, {
            "a": [1, -1.5882, 4.8912, -4.9511, 7.7321, -4.8875, 4.7663, -1.5277, 0.94956],
            "b": [0.0031392, -0.0049719, 0.015278, -0.015511, 0.024321, -0.015511, 0.015278, -0.0049719, 0.0031392]
        }, {
            "a": [1, -0.94902, 4.2795, -2.8599, 6.4995, -2.821, 4.1638, -0.91078, 0.94664],
            "b": [0.0031414, -0.0029709, 0.013353, -0.008952, 0.020421, -0.008952, 0.013353, -0.0029709, 0.0031414]
        }, {
            "a": [1, -0.26559, 3.9645, -0.78589, 5.8719, -0.77456, 3.851, -0.25427, 0.94356],
            "b": [0.0031442, -0.00083147, 0.012357, -0.0024578, 0.018428, -0.0024578, 0.012357, -0.00083147, 0.0031442]
        }, {
            "a": [1, 0.4599, 4.0134, 1.3636, 5.965, 1.3428, 3.8918, 0.43915, 0.94031],
            "b": [0.0031477, 0.00144, 0.012499, 0.0042607, 0.018704, 0.0042607, 0.012499, 0.00144, 0.0031477]
        }, {
            "a": [1, 1.2235, 4.4914, 3.7224, 6.91, 3.6623, 4.3474, 1.1651, 0.93687],
            "b": [0.0031519, 0.0038317, 0.013982, 0.011621, 0.021659, 0.011621, 0.013982, 0.0038317, 0.0031519]
        }, {
            "a": [1, -7.4582, 24.8457, -48.2266, 59.6202, -48.0603, 24.6746, -7.3813, 0.98628],
            "b": [0.0031447, -0.023479, 0.078313, -0.15223, 0.1885, -0.15223, 0.078313, -0.023479, 0.0031447]
        }, {
            "a": [1, -7.3936, 24.485, -47.3609, 58.4788, -47.1879, 24.3065, -7.3129, 0.98547],
            "b": [0.0031439, -0.02327, 0.077162, -0.14948, 0.18489, -0.14948, 0.077162, -0.02327, 0.0031439]
        }, {
            "a": [1, -7.3214, 24.0855, -46.4069, 57.2235, -46.2273, 23.8994, -7.2367, 0.98461],
            "b": [0.0031431, -0.023037, 0.075888, -0.14645, 0.18091, -0.14645, 0.075888, -0.023037, 0.0031431]
        }, {
            "a": [1, -7.2406, 23.6436, -45.3578, 55.846, -45.1718, 23.4501, -7.1519, 0.9837],
            "b": [0.0031423, -0.022778, 0.074481, -0.14312, 0.17655, -0.14312, 0.074481, -0.022778, 0.0031423]
        }, {
            "a": [1, -7.1504, 23.1556, -44.2068, 54.3383, -44.0148, 22.9549, -7.0576, 0.98274],
            "b": [0.0031415, -0.022488, 0.072928, -0.13947, 0.17178, -0.13947, 0.072928, -0.022488, 0.0031415]
        }, {
            "a": [1, -7.0496, 22.6177, -42.9474, 52.6929, -42.7498, 22.4101, -6.9527, 0.98173],
            "b": [0.0031407, -0.022165, 0.071218, -0.13547, 0.16657, -0.13547, 0.071218, -0.022165, 0.0031407]
        }, {
            "a": [1, -6.9371, 22.0264, -41.5737, 50.9033, -41.3711, 21.8122, -6.8361, 0.98065],
            "b": [0.0031399, -0.021806, 0.06934, -0.13112, 0.1609, -0.13112, 0.06934, -0.021806, 0.0031399]
        }, {
            "a": [1, -6.8115, 21.3778, -40.0802, 48.9638, -39.8733, 21.1577, -6.7065, 0.97951],
            "b": [0.0031391, -0.021405, 0.067281, -0.12639, 0.15477, -0.12639, 0.067281, -0.021405, 0.0031391]
        }, {
            "a": [1, -6.6715, 20.6687, -38.463, 46.8709, -38.2527, 20.4432, -6.5626, 0.97831],
            "b": [0.0031383, -0.020959, 0.065032, -0.12126, 0.14814, -0.12126, 0.065032, -0.020959, 0.0031383]
        }, {
            "a": [1, -6.5155, 19.8958, -36.7193, 44.6232, -36.5066, 19.666, -6.4029, 0.97703],
            "b": [0.0031375, -0.020463, 0.062584, -0.11574, 0.14103, -0.11574, 0.062584, -0.020463, 0.0031375]
        }, {
            "a": [1, -6.3418, 19.057, -34.8486, 42.2222, -34.6348, 18.8238, -6.2258, 0.97568],
            "b": [0.0031368, -0.019912, 0.059928, -0.10982, 0.13343, -0.10982, 0.059928, -0.019912, 0.0031368]
        }, {
            "a": [1, -6.1486, 18.1505, -32.8527, 39.6731, -32.6392, 17.9154, -6.0295, 0.97425],
            "b": [0.0031361, -0.0193, 0.05706, -0.10351, 0.12536, -0.10351, 0.05706, -0.0193, 0.0031361]
        }, {
            "a": [1, -5.9339, 17.1763, -30.7367, 36.9857, -30.5251, 16.9406, -5.8122, 0.97274],
            "b": [0.0031355, -0.018621, 0.05398, -0.096815, 0.11685, -0.096815, 0.05398, -0.018621, 0.0031355]
        }, {
            "a": [1, -5.6957, 16.1356, -28.5092, 34.1748, -28.3013, 15.9011, -5.572, 0.97115],
            "b": [0.003135, -0.017868, 0.050692, -0.089773, 0.10796, -0.089773, 0.050692, -0.017868, 0.003135]
        }, {
            "a": [1, -5.4317, 15.032, -26.1829, 31.2614, -25.9806, 14.8007, -5.3067, 0.96946],
            "b": [0.0031345, -0.017035, 0.047208, -0.082422, 0.09874, -0.082422, 0.047208, -0.017035, 0.0031345]
        }, {
            "a": [1, -5.1395, 13.8719, -23.775, 28.2734, -23.5805, 13.6458, -5.0144, 0.96767],
            "b": [0.0031342, -0.016114, 0.043547, -0.074816, 0.089286, -0.074816, 0.043547, -0.016114, 0.0031342]
        }, {
            "a": [1, -4.8168, 12.6648, -21.3074, 25.2459, -21.1227, 12.4462, -4.6926, 0.96578],
            "b": [0.003134, -0.015098, 0.039742, -0.067025, 0.079708, -0.067025, 0.039742, -0.015098, 0.003134]
        }, {
            "a": [1, -4.461, 11.4248, -18.806, 22.2218, -18.6333, 11.216, -4.3393, 0.96378],
            "b": [0.003134, -0.013979, 0.035834, -0.059132, 0.070141, -0.059132, 0.035834, -0.013979, 0.003134]
        }, {
            "a": [1, -4.0697, 10.1706, -16.3002, 19.2521, -16.1417, 9.9738, -3.9521, 0.96167],
            "b": [0.0031342, -0.01275, 0.031885, -0.051229, 0.060748, -0.051229, 0.031885, -0.01275, 0.0031342]
        }, {
            "a": [1, -3.6404, 8.9269, -13.8211, 16.3955, -13.6788, 8.744, -3.5291, 0.95944],
            "b": [0.0031346, -0.011403, 0.02797, -0.043415, 0.051714, -0.043415, 0.02797, -0.011403, 0.0031346]
        }, {
            "a": [1, -3.171, 7.7249, -11.3986, 13.7184, -11.2743, 7.5573, -3.0683, 0.95708],
            "b": [0.0031353, -0.0099302, 0.024189, -0.035784, 0.043248, -0.035784, 0.024189, -0.0099302, 0.0031353]
        }, {
            "a": [1, -2.6593, 6.6032, -9.0577, 11.2941, -8.953, 6.4515, -2.5682, 0.95459],
            "b": [0.0031363, -0.0083264, 0.020661, -0.028416, 0.035583, -0.028416, 0.020661, -0.0083264, 0.0031363]
        }, {
            "a": [1, -2.1037, 5.6078, -6.8128, 9.2027, -6.7295, 5.4714, -2.0274, 0.95195],
            "b": [0.0031376, -0.0065862, 0.017532, -0.021358, 0.028971, -0.021358, 0.017532, -0.0065862, 0.0031376]
        }, {
            "a": [1, -1.5034, 4.7924, -4.6615, 7.5316, -4.6012, 4.669, -1.4457, 0.94917],
            "b": [0.0031395, -0.0047063, 0.014967, -0.014602, 0.023687, -0.014602, 0.014967, -0.0047063, 0.0031395]
        }, {
            "a": [1, -0.85806, 4.2174, -2.5767, 6.3755, -2.5413, 4.1024, -0.82322, 0.94623],
            "b": [0.0031418, -0.0026861, 0.013157, -0.0080645, 0.020028, -0.0080645, 0.013157, -0.0026861, 0.0031418]
        }, {
            "a": [1, -0.16872, 3.9482, -0.49873, 5.8393, -0.49148, 3.8343, -0.16147, 0.94313],
            "b": [0.0031447, -0.0005282, 0.012304, -0.0015595, 0.018323, -0.0015595, 0.012304, -0.0005282, 0.0031447]
        }, {
            "a": [1, 0.56227, 4.0521, 1.6706, 6.0409, 1.6449, 3.9284, 0.53671, 0.93985],
            "b": [0.0031482, 0.0017605, 0.012619, 0.0052193, 0.01894, 0.0052193, 0.012619, 0.0017605, 0.0031482]
        }, {
            "a": [1, 1.3307, 4.5935, 4.0707, 7.1136, 4.0044, 4.445, 1.2667, 0.93639],
            "b": [0.0031526, 0.0041675, 0.0143, 0.012707, 0.022296, 0.012707, 0.0143, 0.0041675, 0.0031526]
        }, {
            "a": [1, 2.13, 5.6266, 6.8777, 9.2063, 6.7591, 5.4342, 2.0216, 0.93274],
            "b": [0.0031578, 0.0066733, 0.017516, 0.021453, 0.028855, 0.021453, 0.017516, 0.0066733, 0.0031578]
        }, {
            "a": [1, 2.9511, 7.1867, 10.2888, 12.4762, 10.1008, 6.9265, 2.7922, 0.92888],
            "b": [0.003164, 0.0092501, 0.022375, 0.03207, 0.039104, 0.03207, 0.022375, 0.0092501, 0.003164]
        }, {
            "a": [1, 3.7811, 9.278, 14.4913, 17.0667, 14.2109, 8.9224, 3.5658, 0.92482],
            "b": [0.0031713, 0.01186, 0.02889, 0.045139, 0.053488, 0.045139, 0.02889, 0.01186, 0.0031713]
        }, {
            "a": [1, 4.6039, 11.8606, 19.6141, 23.0635, 19.2122, 11.3795, 4.3266, 0.92053],
            "b": [0.00318, 0.014452, 0.036935, 0.061058, 0.072269, 0.061058, 0.036935, 0.014452, 0.00318]
        }, {
            "a": [1, 5.3983, 14.8362, 25.6619, 30.4224, 25.1051, 14.1995, 5.0545, 0.91601],
            "b": [0.0031901, 0.016963, 0.046202, 0.079834, 0.095298, 0.079834, 0.046202, 0.016963, 0.0031901]
        }, {
            "a": [1, 6.1389, 18.036, 32.4396, 38.8717, 31.6944, 17.2169, 5.7255, 0.91124],
            "b": [0.0032019, 0.019314, 0.056165, 0.10085, 0.12171, 0.10085, 0.056165, 0.019314, 0.0032019]
        }, {
            "a": [1, 8.5157, 33.9068, 82.7916, 136.9957, 160.3367, 134.3722, 79.651, 31.9959, 7.8819, 0.90786],
            "b": [0.00094862, 0.0064757, 0.019405, 0.031749, 0.026449, -1.466e-16, -0.026449, -0.031749, -0.019405, -0.0064757, -0.00094862]
        }, {
            "a": [1, 9.1881, 38.6648, 98.0477, 165.8339, 195.4197, 162.471, 94.1115, 36.36, 8.4653, 0.90266],
            "b": [0.001004, 0.0073927, 0.023412, 0.03979, 0.033894, -1.0118e-14, -0.033894, -0.03979, -0.023412, -0.0073927, -0.001004]
        }, {
            "a": [1, -6.6511, 20.5667, -38.2319, 46.5724, -38.0211, 20.3406, -6.5417, 0.97813],
            "b": [0.0031382, -0.020895, 0.064709, -0.12053, 0.1472, -0.12053, 0.064709, -0.020895, 0.0031382]
        }, {
            "a": [1, -6.4928, 19.785, -36.4708, 44.3036, -36.2578, 19.5546, -6.3797, 0.97685],
            "b": [0.0031374, -0.020391, 0.062232, -0.11496, 0.14001, -0.11496, 0.062232, -0.020391, 0.0031374]
        }, {
            "a": [1, -6.3165, 18.9369, -34.5828, 41.8819, -34.3689, 18.7034, -6.2001, 0.97549],
            "b": [0.0031367, -0.019832, 0.059548, -0.10898, 0.13235, -0.10898, 0.059548, -0.019832, 0.0031367]
        }, {
            "a": [1, -6.1205, 18.0212, -32.5701, 39.3132, -32.3567, 17.7859, -6.001, 0.97405],
            "b": [0.003136, -0.019211, 0.056651, -0.10261, 0.12422, -0.10261, 0.056651, -0.019211, 0.003136]
        }, {
            "a": [1, -5.9028, 17.0377, -30.4382, 36.6078, -30.227, 16.8021, -5.7807, 0.97253],
            "b": [0.0031354, -0.018522, 0.053542, -0.095871, 0.11566, -0.095871, 0.053542, -0.018522, 0.0031354]
        }, {
            "a": [1, -5.6611, 15.9882, -28.1963, 33.7815, -27.989, 15.754, -5.5372, 0.97092],
            "b": [0.0031349, -0.017759, 0.050226, -0.088784, 0.10671, -0.088784, 0.050226, -0.017759, 0.0031349]
        }, {
            "a": [1, -5.3934, 14.8764, -25.8577, 30.8562, -25.6564, 14.6456, -5.2684, 0.96922],
            "b": [0.0031345, -0.016914, 0.046717, -0.081395, 0.097458, -0.081395, 0.046717, -0.016914, 0.0031345]
        }, {
            "a": [1, -5.0972, 13.7092, -23.4403, 27.8605, -23.247, 13.484, -4.9721, 0.96742],
            "b": [0.0031342, -0.015981, 0.043034, -0.073759, 0.08798, -0.073759, 0.043034, -0.015981, 0.0031342]
        }, {
            "a": [1, -4.7701, 12.4967, -20.9664, 24.8308, -20.7833, 12.2793, -4.6462, 0.96552],
            "b": [0.003134, -0.014951, 0.039212, -0.065949, 0.078394, -0.065949, 0.039212, -0.014951, 0.003134]
        }, {
            "a": [1, -4.4096, 11.2535, -18.4626, 21.811, -18.2918, 11.0462, -4.2883, 0.9635],
            "b": [0.003134, -0.013818, 0.035295, -0.058049, 0.068842, -0.058049, 0.035295, -0.013818, 0.003134]
        }, {
            "a": [1, -4.0132, 9.9991, -15.9586, 18.8531, -15.8022, 9.8041, -3.8964, 0.96137],
            "b": [0.0031342, -0.012573, 0.031345, -0.050152, 0.059486, -0.050152, 0.031345, -0.012573, 0.0031342]
        }, {
            "a": [1, -3.5786, 8.7591, -13.4856, 16.017, -13.3456, 8.5783, -3.4683, 0.95913],
            "b": [0.0031346, -0.011209, 0.027442, -0.042357, 0.050517, -0.042357, 0.027442, -0.011209, 0.0031346]
        }, {
            "a": [1, -3.1035, 7.5657, -11.0729, 13.3699, -10.9512, 7.4003, -3.0022, 0.95675],
            "b": [0.0031354, -0.0097186, 0.023688, -0.034759, 0.042147, -0.034759, 0.023688, -0.0097186, 0.0031354]
        }, {
            "a": [1, -2.5858, 6.4584, -8.7446, 10.9863, -8.6428, 6.3089, -2.4966, 0.95424],
            "b": [0.0031364, -0.0080964, 0.020206, -0.027432, 0.03461, -0.027432, 0.020206, -0.0080964, 0.0031364]
        }, {
            "a": [1, -2.0242, 5.4843, -6.5132, 8.9472, -6.4329, 5.3499, -1.9503, 0.95158],
            "b": [0.0031379, -0.0063372, 0.017143, -0.020416, 0.028163, -0.020416, 0.017143, -0.0063372, 0.0031379]
        }, {
            "a": [1, -1.4177, 4.698, -4.3732, 7.3407, -4.3161, 4.5762, -1.3629, 0.94878],
            "b": [0.0031397, -0.0044381, 0.014671, -0.013698, 0.023083, -0.013698, 0.014671, -0.0044381, 0.0031397]
        }, {
            "a": [1, -0.76628, 4.1609, -2.2937, 6.263, -2.2619, 4.0467, -0.73492, 0.94582],
            "b": [0.0031421, -0.0023988, 0.012979, -0.0071778, 0.019671, -0.0071778, 0.012979, -0.0023988, 0.0031421]
        }, {
            "a": [1, -0.071059, 3.9389, -0.20992, 5.8205, -0.20685, 3.8244, -0.067982, 0.94269],
            "b": [0.0031451, -0.00022247, 0.012274, -0.00065634, 0.018261, -0.00065634, 0.012274, -0.00022247, 0.0031451]
        }, {
            "a": [1, 0.66535, 4.099, 1.9818, 6.1331, 1.9511, 3.9729, 0.63486, 0.93939],
            "b": [0.0031488, 0.0020833, 0.012764, 0.006191, 0.019228, 0.006191, 0.012764, 0.0020833, 0.0031488]
        }, {
            "a": [1, 1.4384, 4.7048, 4.4266, 7.3363, 4.3539, 4.5516, 1.3687, 0.9359],
            "b": [0.0031532, 0.0045052, 0.014646, 0.013816, 0.022994, 0.013816, 0.014646, 0.0045052, 0.0031532]
        }, {
            "a": [1, 2.2414, 5.8085, 7.3044, 9.5808, 7.1774, 5.6083, 2.1264, 0.93222],
            "b": [0.0031586, 0.0070225, 0.018082, 0.022781, 0.030029, 0.022781, 0.018082, 0.0070225, 0.0031586]
        }, {
            "a": [1, 3.0645, 7.4419, 10.8135, 13.0237, 10.6143, 7.1703, 2.8982, 0.92834],
            "b": [0.0031649, 0.0096062, 0.02317, 0.033702, 0.04082, 0.033702, 0.02317, 0.0096062, 0.0031649]
        }, {
            "a": [1, 3.8946, 9.6039, 15.1363, 17.8036, 14.8411, 9.233, 3.6711, 0.92424],
            "b": [0.0031724, 0.012217, 0.029906, 0.047144, 0.055797, 0.047144, 0.029906, 0.012217, 0.0031724]
        }, {
            "a": [1, 4.7148, 12.2476, 20.3891, 23.9934, 19.9681, 11.747, 4.4287, 0.91993],
            "b": [0.0031813, 0.014802, 0.03814, 0.063466, 0.07518, 0.063466, 0.03814, 0.014802, 0.0031813]
        }, {
            "a": [1, 5.5035, 15.2656, 26.5537, 31.524, 25.9731, 14.6053, 5.1503, 0.91537],
            "b": [0.0031916, 0.017296, 0.047539, 0.082601, 0.098744, 0.082601, 0.047539, 0.017296, 0.0031916]
        }]
    },
    'minusTwoThird': {
        "data": [{
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [],
            "b": []
        }, {
            "a": [1, -7.8513, 27.1089, -53.7603, 66.9715, -53.6647, 27.0125, -7.8095, 0.9929],
            "b": [0.0031521, -0.024766, 0.085578, -0.16985, 0.21177, -0.16985, 0.085578, -0.024766, 0.0031521]
        }, {
            "a": [1, -7.8336, 27.0044, -53.5008, 66.6242, -53.3999, 26.9027, -7.7894, 0.99248],
            "b": [0.0031516, -0.024707, 0.085239, -0.16902, 0.21067, -0.16902, 0.085239, -0.024707, 0.0031516]
        }, {
            "a": [1, -7.8138, 26.8876, -53.2113, 66.2372, -53.1051, 26.7803, -7.7671, 0.99204],
            "b": [0.0031511, -0.024641, 0.084862, -0.1681, 0.20945, -0.1681, 0.084862, -0.024641, 0.0031511]
        }, {
            "a": [1, -7.7916, 26.7572, -52.8887, 65.8063, -52.7768, 26.6441, -7.7422, 0.99156],
            "b": [0.0031505, -0.024567, 0.084441, -0.16707, 0.20808, -0.16707, 0.084441, -0.024567, 0.0031505]
        }, {
            "a": [1, -7.7667, 26.6117, -52.5292, 65.3267, -52.4115, 26.4925, -7.7146, 0.99107],
            "b": [0.0031499, -0.024485, 0.083972, -0.16592, 0.20656, -0.16592, 0.083972, -0.024485, 0.0031499]
        }, {
            "a": [1, -7.7389, 26.4493, -52.129, 64.7934, -52.0052, 26.3238, -7.6839, 0.99054],
            "b": [0.0031493, -0.024393, 0.083449, -0.16464, 0.20488, -0.16464, 0.083449, -0.024393, 0.0031493]
        }, {
            "a": [1, -7.7077, 26.2681, -51.6837, 64.2006, -51.5537, 26.1361, -7.6497, 0.98998],
            "b": [0.0031486, -0.024291, 0.082866, -0.16322, 0.203, -0.16322, 0.082866, -0.024291, 0.0031486]
        }, {
            "a": [1, -7.6728, 26.0662, -51.1887, 63.5425, -51.0523, 25.9274, -7.6116, 0.98938],
            "b": [0.0031479, -0.024176, 0.082218, -0.16165, 0.20092, -0.16165, 0.082218, -0.024176, 0.0031479]
        }, {
            "a": [1, -7.6337, 25.8412, -50.6389, 62.8125, -50.496, 25.6955, -7.5692, 0.98876],
            "b": [0.0031473, -0.024048, 0.081497, -0.1599, 0.1986, -0.1599, 0.081497, -0.024048, 0.0031473]
        }, {
            "a": [1, -7.5899, 25.5908, -50.029, 62.0037, -49.8794, 25.4379, -7.5221, 0.98809],
            "b": [0.0031465, -0.023906, 0.080695, -0.15796, 0.19604, -0.15796, 0.080695, -0.023906, 0.0031465]
        }, {
            "a": [1, -7.541, 25.3122, -49.353, 61.1087, -49.1967, 25.1521, -7.4695, 0.98739],
            "b": [0.0031458, -0.023747, 0.079803, -0.15581, 0.19321, -0.15581, 0.079803, -0.023747, 0.0031458]
        }, {
            "a": [1, -7.4862, 25.0027, -48.605, 60.1199, -48.4419, 24.8352, -7.4111, 0.98664],
            "b": [0.003145, -0.023569, 0.078814, -0.15343, 0.19008, -0.15343, 0.078814, -0.023569, 0.003145]
        }, {
            "a": [1, -7.4249, 24.6592, -47.7785, 59.0292, -47.6086, 24.4842, -7.346, 0.98585],
            "b": [0.0031443, -0.023371, 0.077718, -0.1508, 0.18663, -0.1508, 0.077718, -0.023371, 0.0031443]
        }, {
            "a": [1, -7.3564, 24.2784, -46.8669, 57.8285, -46.6904, 24.0959, -7.2736, 0.98502],
            "b": [0.0031435, -0.02315, 0.076503, -0.14791, 0.18283, -0.14791, 0.076503, -0.02315, 0.0031435]
        }, {
            "a": [1, -7.2797, 23.8569, -45.8633, 56.5094, -45.6803, 23.6669, -7.1929, 0.98414],
            "b": [0.0031427, -0.022903, 0.07516, -0.14472, 0.17865, -0.14472, 0.07516, -0.022903, 0.0031427]
        }, {
            "a": [1, -7.1941, 23.391, -44.7611, 55.0639, -44.5719, 23.1937, -7.1032, 0.9832],
            "b": [0.0031419, -0.022628, 0.073677, -0.14123, 0.17407, -0.14123, 0.073677, -0.022628, 0.0031419]
        }, {
            "a": [1, -7.0984, 22.8771, -43.5535, 53.4842, -43.3585, 22.6727, -7.0034, 0.98221],
            "b": [0.0031411, -0.022322, 0.072042, -0.1374, 0.16907, -0.1374, 0.072042, -0.022322, 0.0031411]
        }, {
            "a": [1, -6.9915, 22.3113, -42.2342, 51.7631, -42.0339, 22.1002, -6.8925, 0.98116],
            "b": [0.0031403, -0.02198, 0.070245, -0.13321, 0.16363, -0.13321, 0.070245, -0.02198, 0.0031403]
        }, {
            "a": [1, -6.8722, 21.6901, -40.7976, 49.8947, -40.5927, 21.4727, -6.7692, 0.98005],
            "b": [0.0031394, -0.021599, 0.068272, -0.12866, 0.15771, -0.12866, 0.068272, -0.021599, 0.0031394]
        }, {
            "a": [1, -6.7392, 21.0099, -39.2391, 47.8743, -39.0302, 20.7868, -6.6322, 0.97888],
            "b": [0.0031386, -0.021175, 0.066114, -0.12372, 0.15132, -0.12372, 0.066114, -0.021175, 0.0031386]
        }, {
            "a": [1, -6.5909, 20.2673, -37.555, 45.6993, -37.3433, 20.0394, -6.4801, 0.97764],
            "b": [0.0031379, -0.020703, 0.06376, -0.11839, 0.14443, -0.11839, 0.06376, -0.020703, 0.0031379]
        }, {
            "a": [1, -6.4258, 19.4598, -35.744, 43.37, -35.5305, 19.228, -6.3113, 0.97632],
            "b": [0.0031371, -0.020179, 0.061203, -0.11266, 0.13706, -0.11266, 0.061203, -0.020179, 0.0031371]
        }, {
            "a": [1, -6.242, 18.5852, -33.8065, 40.8896, -33.5927, 18.3508, -6.1243, 0.97493],
            "b": [0.0031364, -0.019596, 0.058435, -0.10652, 0.12921, -0.10652, 0.058435, -0.019596, 0.0031364]
        }, {
            "a": [1, -6.0377, 17.6428, -31.7462, 38.2657, -31.5334, 17.4071, -5.9171, 0.97346],
            "b": [0.0031358, -0.018949, 0.055454, -0.10001, 0.12091, -0.10001, 0.055454, -0.018949, 0.0031358]
        }, {
            "a": [1, -5.8108, 16.633, -29.5697, 35.5106, -29.3599, 16.3977, -5.6879, 0.97191],
            "b": [0.0031352, -0.018232, 0.052263, -0.093125, 0.11219, -0.093125, 0.052263, -0.018232, 0.0031352]
        }, {
            "a": [1, -5.5592, 15.5584, -27.288, 32.6424, -27.0828, 15.3253, -5.4347, 0.97026],
            "b": [0.0031347, -0.017437, 0.048869, -0.085914, 0.10311, -0.085914, 0.048869, -0.017437, 0.0031347]
        }, {
            "a": [1, -5.2805, 14.4239, -24.9161, 29.6856, -24.7176, 14.1951, -5.1554, 0.96852],
            "b": [0.0031343, -0.016558, 0.045289, -0.07842, 0.093754, -0.07842, 0.045289, -0.016558, 0.0031343]
        }, {
            "a": [1, -4.9725, 13.2374, -22.4735, 26.6718, -22.284, 13.015, -4.8477, 0.96668],
            "b": [0.0031341, -0.015588, 0.041547, -0.070707, 0.084219, -0.070707, 0.041547, -0.015588, 0.0031341]
        }, {
            "a": [1, -4.6326, 12.0109, -19.9845, 23.6403, -19.806, 11.7972, -4.5095, 0.96474],
            "b": [0.003134, -0.014519, 0.037681, -0.062851, 0.074628, -0.062851, 0.037681, -0.014519, 0.003134]
        }, {
            "a": [1, -4.2583, 10.7606, -17.477, 20.6382, -17.3116, 10.5579, -4.1385, 0.96268],
            "b": [0.003134, -0.013342, 0.033743, -0.05494, 0.065132, -0.05494, 0.033743, -0.013342, 0.003134]
        }, {
            "a": [1, -3.8472, 9.5085, -14.9815, 17.7206, -14.8313, 9.3189, -3.7326, 0.96051],
            "b": [0.0031343, -0.012051, 0.029801, -0.047072, 0.055904, -0.047072, 0.029801, -0.012051, 0.0031343]
        }, {
            "a": [1, -3.3969, 8.2826, -12.5288, 14.9503, -12.3958, 8.1077, -3.2898, 0.95821],
            "b": [0.0031349, -0.010639, 0.025943, -0.039343, 0.047144, -0.039343, 0.025943, -0.010639, 0.0031349]
        }, {
            "a": [1, -2.9052, 7.1179, -10.147, 12.3975, -10.0329, 6.9587, -2.8083, 0.95578],
            "b": [0.0031357, -0.0090972, 0.02228, -0.031844, 0.039072, -0.031844, 0.02228, -0.0090972, 0.0031357]
        }, {
            "a": [1, -2.3705, 6.0569, -7.856, 10.1392, -7.7625, 5.9135, -2.2868, 0.95321],
            "b": [0.0031369, -0.0074216, 0.018944, -0.024637, 0.031932, -0.024637, 0.018944, -0.0074216, 0.0031369]
        }, {
            "a": [1, -1.7913, 5.1497, -5.6625, 8.2592, -5.5911, 5.0206, -1.7243, 0.9505],
            "b": [0.0031385, -0.0056077, 0.016091, -0.017744, 0.025988, -0.017744, 0.016091, -0.0056077, 0.0031385]
        }, {
            "a": [1, -1.1671, 4.4537, -3.5516, 6.8485, -3.5042, 4.3356, -1.1209, 0.94763],
            "b": [0.0031406, -0.0036534, 0.013902, -0.01112, 0.021525, -0.01112, 0.013902, -0.0036534, 0.0031406]
        }, {
            "a": [1, -0.49822, 4.0324, -1.4802, 6.0071, -1.4593, 3.9191, -0.47737, 0.94461],
            "b": [0.0031432, -0.0015597, 0.012573, -0.0046306, 0.018859, -0.0046306, 0.012573, -0.0015597, 0.0031432]
        }, {
            "a": [1, 0.21359, 3.9525, 0.6313, 5.8462, 0.62184, 3.835, 0.20414, 0.94141],
            "b": [0.0031465, 0.00066874, 0.012312, 0.0019731, 0.018335, 0.0019731, 0.012312, 0.00066874, 0.0031465]
        }, {
            "a": [1, 0.96507, 4.2807, 2.903, 6.4916, 2.8569, 4.146, 0.91986, 0.93804],
            "b": [0.0031504, 0.0030221, 0.013327, 0.0090655, 0.020349, 0.0090655, 0.013327, 0.0030221, 0.0031504]
        }, {
            "a": [1, -7.4782, 24.9578, -48.4967, 59.9768, -48.3326, 24.7892, -7.4026, 0.98654],
            "b": [0.0031449, -0.023543, 0.078671, -0.15309, 0.18963, -0.15309, 0.078671, -0.023543, 0.0031449]
        }, {
            "a": [1, -7.416, 24.6094, -47.6589, 58.8715, -47.4881, 24.4333, -7.3365, 0.98574],
            "b": [0.0031442, -0.023342, 0.077559, -0.15042, 0.18613, -0.15042, 0.077559, -0.023342, 0.0031442]
        }, {
            "a": [1, -7.3464, 24.2232, -46.7351, 57.6551, -46.5577, 24.0396, -7.263, 0.9849],
            "b": [0.0031434, -0.023118, 0.076327, -0.14749, 0.18228, -0.14749, 0.076327, -0.023118, 0.0031434]
        }, {
            "a": [1, -7.2686, 23.7958, -45.7184, 56.3192, -45.5346, 23.6048, -7.1812, 0.98401],
            "b": [0.0031426, -0.022867, 0.074965, -0.14426, 0.17805, -0.14426, 0.074965, -0.022867, 0.0031426]
        }, {
            "a": [1, -7.1816, 23.3236, -44.6022, 54.8558, -44.4121, 23.1253, -7.0902, 0.98307],
            "b": [0.0031418, -0.022588, 0.073462, -0.14072, 0.17342, -0.14072, 0.073462, -0.022588, 0.0031418]
        }, {
            "a": [1, -7.0844, 22.8028, -43.3796, 53.2571, -43.1839, 22.5974, -6.9889, 0.98207],
            "b": [0.003141, -0.022277, 0.071806, -0.13684, 0.16836, -0.13684, 0.071806, -0.022277, 0.003141]
        }, {
            "a": [1, -6.9759, 22.2297, -42.0446, 51.5162, -41.8436, 22.0177, -6.8764, 0.98101],
            "b": [0.0031401, -0.02193, 0.069985, -0.13261, 0.16284, -0.13261, 0.069985, -0.02193, 0.0031401]
        }, {
            "a": [1, -6.8549, 21.6006, -40.5916, 49.6272, -40.3861, 21.3824, -6.7513, 0.9799],
            "b": [0.0031393, -0.021544, 0.067988, -0.12801, 0.15687, -0.12801, 0.067988, -0.021544, 0.0031393]
        }, {
            "a": [1, -6.7198, 20.912, -39.016, 47.5858, -38.8067, 20.6882, -6.6123, 0.97871],
            "b": [0.0031385, -0.021113, 0.065804, -0.12302, 0.1504, -0.12302, 0.065804, -0.021113, 0.0031385]
        }, {
            "a": [1, -6.5694, 20.1607, -37.3147, 45.3896, -37.1026, 19.9322, -6.458, 0.97746],
            "b": [0.0031378, -0.020635, 0.063423, -0.11763, 0.14345, -0.11763, 0.063423, -0.020635, 0.0031378]
        }, {
            "a": [1, -6.4017, 19.3441, -35.4862, 43.0393, -35.2726, 19.1119, -6.2868, 0.97614],
            "b": [0.003137, -0.020102, 0.060836, -0.11184, 0.13601, -0.11184, 0.060836, -0.020102, 0.003137]
        }, {
            "a": [1, -6.2153, 18.4602, -33.5317, 40.5388, -33.3179, 18.2256, -6.0971, 0.97474],
            "b": [0.0031363, -0.019511, 0.058039, -0.10565, 0.1281, -0.10565, 0.058039, -0.019511, 0.0031363]
        }, {
            "a": [1, -6.008, 17.5085, -31.4549, 37.896, -31.2425, 17.2728, -5.8871, 0.97326],
            "b": [0.0031357, -0.018855, 0.05503, -0.099086, 0.11974, -0.099086, 0.05503, -0.018855, 0.0031357]
        }, {
            "a": [1, -5.7778, 16.4897, -29.2634, 35.1243, -29.054, 16.2546, -5.6547, 0.97169],
            "b": [0.0031351, -0.018128, 0.05181, -0.092157, 0.11096, -0.092157, 0.05181, -0.018128, 0.0031351]
        }, {
            "a": [1, -5.5227, 15.4065, -26.9683, 32.2424, -26.764, 15.1739, -5.3981, 0.97003],
            "b": [0.0031347, -0.017322, 0.04839, -0.084903, 0.10184, -0.084903, 0.04839, -0.017322, 0.0031347]
        }, {
            "a": [1, -5.2402, 14.2643, -24.5854, 29.2757, -24.3881, 14.0363, -5.115, 0.96828],
            "b": [0.0031343, -0.016431, 0.044785, -0.077376, 0.092457, -0.077376, 0.044785, -0.016431, 0.0031343]
        }, {
            "a": [1, -4.9279, 13.0716, -22.135, 26.257, -21.9468, 12.8503, -4.8033, 0.96642],
            "b": [0.003134, -0.015448, 0.041024, -0.069638, 0.082906, -0.069638, 0.041024, -0.015448, 0.003134]
        }, {
            "a": [1, -4.5834, 11.8407, -19.6418, 23.2265, -19.4649, 11.6284, -4.4607, 0.96446],
            "b": [0.003134, -0.014364, 0.037145, -0.061769, 0.073319, -0.061769, 0.037145, -0.014364, 0.003134]
        }, {
            "a": [1, -4.2042, 10.5888, -17.134, 20.2325, -16.9706, 10.3878, -4.0851, 0.96239],
            "b": [0.0031341, -0.013172, 0.033202, -0.053858, 0.063849, -0.053858, 0.033202, -0.013172, 0.0031341]
        }, {
            "a": [1, -3.7879, 9.3385, -14.6426, 17.3312, -14.4947, 9.1508, -3.6742, 0.9602],
            "b": [0.0031344, -0.011865, 0.029266, -0.046003, 0.054673, -0.046003, 0.029266, -0.011865, 0.0031344]
        }, {
            "a": [1, -3.3321, 8.1187, -12.1981, 14.5864, -12.0676, 7.9459, -3.2262, 0.95788],
            "b": [0.003135, -0.010435, 0.025428, -0.038302, 0.045993, -0.038302, 0.025428, -0.010435, 0.003135]
        }, {
            "a": [1, -2.8346, 6.9655, -9.8277, 12.0693, -9.7164, 6.8085, -2.7393, 0.95543],
            "b": [0.0031359, -0.0088759, 0.021801, -0.030839, 0.038034, -0.030839, 0.021801, -0.0088759, 0.0031359]
        }, {
            "a": [1, -2.2938, 5.9224, -7.5501, 9.8576, -7.4595, 5.7811, -2.2122, 0.95285],
            "b": [0.0031371, -0.0071816, 0.018521, -0.023675, 0.031042, -0.023675, 0.018521, -0.0071816, 0.0031371]
        }, {
            "a": [1, -1.7085, 5.0406, -5.3693, 8.0363, -5.3011, 4.9133, -1.6442, 0.95012],
            "b": [0.0031388, -0.0053486, 0.015748, -0.016824, 0.025283, -0.016824, 0.015748, -0.0053486, 0.0031388]
        }, {
            "a": [1, -1.0781, 4.3784, -3.2672, 6.6973, -3.2232, 4.2613, -1.0352, 0.94723],
            "b": [0.0031409, -0.003375, 0.013664, -0.010229, 0.021047, -0.010229, 0.013664, -0.003375, 0.0031409]
        }, {
            "a": [1, -0.40328, 3.9998, -1.1958, 5.9422, -1.1788, 3.8866, -0.38627, 0.94418],
            "b": [0.0031436, -0.0012625, 0.012469, -0.0037405, 0.018652, -0.0037405, 0.012469, -0.0012625, 0.0031436]
        }, {
            "a": [1, 0.3142, 3.9719, 0.92956, 5.8839, 0.91553, 3.8529, 0.30018, 0.94096],
            "b": [0.003147, 0.00098373, 0.012371, 0.002905, 0.018452, 0.002905, 0.012371, 0.00098373, 0.003147]
        }, {
            "a": [1, 1.0707, 4.3608, 3.2348, 6.6503, 3.1831, 4.2225, 1.0202, 0.93756],
            "b": [0.003151, 0.0033531, 0.013576, 0.010101, 0.020846, 0.010101, 0.013576, 0.0033531, 0.003151]
        }, {
            "a": [1, 1.8607, 5.2249, 5.8848, 8.3857, 5.7852, 5.0495, 1.7677, 0.93398],
            "b": [0.0031559, 0.0058286, 0.016265, 0.01836, 0.026283, 0.01836, 0.016265, 0.0058286, 0.0031559]
        }, {
            "a": [1, 2.6757, 6.6071, 9.0724, 11.246, 8.9098, 6.3723, 2.5343, 0.93019],
            "b": [0.0031618, 0.0083854, 0.02057, 0.028285, 0.035248, 0.028285, 0.02057, 0.0083854, 0.0031618]
        }, {
            "a": [1, 3.5044, 8.5233, 12.9927, 15.3827, 12.7461, 8.2027, 3.3085, 0.9262],
            "b": [0.0031687, 0.010989, 0.026539, 0.04048, 0.048212, 0.04048, 0.026539, 0.010989, 0.0031687]
        }, {
            "a": [1, 4.3316, 10.9498, 17.8005, 20.9074, 17.4427, 10.514, 4.0756, 0.92198],
            "b": [0.0031769, 0.013593, 0.034098, 0.055424, 0.065518, 0.055424, 0.034098, 0.013593, 0.0031769]
        }, {
            "a": [1, 5.1381, 13.8095, 23.5502, 27.829, 23.049, 13.2279, 4.8169, 0.91754],
            "b": [0.0031866, 0.016139, 0.043005, 0.073281, 0.087184, 0.073281, 0.043005, 0.016139, 0.0031866]
        }, {
            "a": [1, 5.8998, 16.9581, 30.1217, 35.9635, 29.4429, 16.2023, 5.5098, 0.91286],
            "b": [0.0031978, 0.018554, 0.052809, 0.093667, 0.11263, 0.093667, 0.052809, 0.018554, 0.0031978]
        }, {
            "a": [1, 8.2557, 32.164, 77.3938, 126.9901, 148.234, 124.6042, 74.5129, 30.385, 7.6525, 0.90953],
            "b": [0.00093084, 0.006161, 0.018064, 0.029124, 0.024056, -1.2236e-16, -0.024056, -0.029124, -0.018064, -0.006161, -0.00093084]
        }, {
            "a": [1, 8.9837, 37.1804, 93.208, 156.5994, 184.1555, 153.4838, 89.5361, 35.0052, 8.2899, 0.90442],
            "b": [0.00098521, 0.0070935, 0.022094, 0.037119, 0.031405, -4.4627e-16, -0.031405, -0.037119, -0.022094, -0.0070935, -0.00098521]
        }, {
            "a": [1, -6.7002, 20.8129, -38.7907, 47.2943, -38.5809, 20.5885, -6.5921, 0.97855],
            "b": [0.0031384, -0.021051, 0.06549, -0.1223, 0.14948, -0.1223, 0.06549, -0.021051, 0.0031384]
        }, {
            "a": [1, -6.5475, 20.0528, -37.0719, 45.077, -36.8596, 19.8238, -6.4356, 0.97729],
            "b": [0.0031377, -0.020565, 0.063081, -0.11686, 0.14246, -0.11686, 0.063081, -0.020565, 0.0031377]
        }, {
            "a": [1, -6.3774, 19.2271, -35.2261, 42.7058, -35.0124, 18.9945, -6.262, 0.97595],
            "b": [0.0031369, -0.020025, 0.060466, -0.11102, 0.13496, -0.11102, 0.060466, -0.020025, 0.0031369]
        }, {
            "a": [1, -6.1882, 18.334, -33.2545, 40.1852, -33.0408, 18.0991, -6.0696, 0.97454],
            "b": [0.0031362, -0.019425, 0.05764, -0.10478, 0.12698, -0.10478, 0.05764, -0.019425, 0.0031362]
        }, {
            "a": [1, -5.9779, 17.373, -31.1616, 37.524, -30.9494, 17.1373, -5.8566, 0.97305],
            "b": [0.0031356, -0.01876, 0.054601, -0.098158, 0.11856, -0.098158, 0.054601, -0.01876, 0.0031356]
        }, {
            "a": [1, -5.7445, 16.3452, -28.9551, 34.7359, -28.7463, 16.1103, -5.6211, 0.97147],
            "b": [0.0031351, -0.018022, 0.051354, -0.091182, 0.10973, -0.091182, 0.051354, -0.018022, 0.0031351]
        }, {
            "a": [1, -5.4857, 15.2535, -26.647, 31.8407, -26.4434, 15.0214, -5.3609, 0.9698],
            "b": [0.0031346, -0.017205, 0.047907, -0.083888, 0.10057, -0.083888, 0.047907, -0.017205, 0.0031346]
        }, {
            "a": [1, -5.1992, 14.1038, -24.2536, 28.8648, -24.0573, 13.8766, -5.0741, 0.96803],
            "b": [0.0031342, -0.016302, 0.044279, -0.076328, 0.091157, -0.076328, 0.044279, -0.016302, 0.0031342]
        }, {
            "a": [1, -4.8827, 12.9051, -21.7957, 25.8419, -21.609, 12.6848, -4.7583, 0.96616],
            "b": [0.003134, -0.015306, 0.040499, -0.068567, 0.081593, -0.068567, 0.040499, -0.015306, 0.003134]
        }, {
            "a": [1, -4.5336, 11.6702, -19.2987, 22.8134, -19.1236, 11.4593, -4.4113, 0.96419],
            "b": [0.003134, -0.014208, 0.036607, -0.060687, 0.072013, -0.060687, 0.036607, -0.014208, 0.003134]
        }, {
            "a": [1, -4.1495, 10.417, -16.7914, 19.8286, -16.63, 10.2177, -4.031, 0.9621],
            "b": [0.0031341, -0.013001, 0.032661, -0.052778, 0.062572, -0.052778, 0.032661, -0.013001, 0.0031341]
        }, {
            "a": [1, -3.7279, 9.169, -14.3046, 16.9448, -14.1589, 8.9833, -3.6152, 0.95989],
            "b": [0.0031345, -0.011677, 0.028732, -0.044938, 0.053451, -0.044938, 0.028732, -0.011677, 0.0031345]
        }, {
            "a": [1, -3.2665, 7.9561, -11.8688, 14.2268, -11.7408, 7.7854, -3.1619, 0.95756],
            "b": [0.0031351, -0.01023, 0.024916, -0.037265, 0.044856, -0.037265, 0.024916, -0.01023, 0.0031351]
        }, {
            "a": [1, -2.7632, 6.8152, -9.5103, 11.7467, -9.4016, 6.6604, -2.6696, 0.95509],
            "b": [0.003136, -0.0086521, 0.021328, -0.02984, 0.037014, -0.02984, 0.021328, -0.0086521, 0.003136]
        }, {
            "a": [1, -2.2164, 5.7909, -7.2461, 9.5833, -7.1584, 5.6517, -2.1369, 0.95248],
            "b": [0.0031373, -0.006939, 0.018108, -0.02272, 0.030175, -0.02272, 0.018108, -0.006939, 0.0031373]
        }, {
            "a": [1, -1.6249, 4.9356, -5.0777, 7.8223, -5.0126, 4.81, -1.5632, 0.94973],
            "b": [0.0031391, -0.0050868, 0.015418, -0.015908, 0.024606, -0.015908, 0.015418, -0.0050868, 0.0031391]
        }, {
            "a": [1, -0.98837, 4.3083, -2.9834, 6.5571, -2.9429, 4.1922, -0.94868, 0.94682],
            "b": [0.0031413, -0.0030941, 0.013444, -0.0093389, 0.020603, -0.0093389, 0.013444, -0.0030941, 0.0031413]
        }, {
            "a": [1, -0.30754, 3.9737, -0.91052, 5.8903, -0.89744, 3.8604, -0.29447, 0.94375],
            "b": [0.0031441, -0.00096278, 0.012386, -0.0028477, 0.018487, -0.0028477, 0.012386, -0.00096278, 0.0031441]
        }, {
            "a": [1, 0.41554, 3.9991, 1.2311, 5.937, 1.2124, 3.8784, 0.39685, 0.94051],
            "b": [0.0031475, 0.001301, 0.012455, 0.003847, 0.018617, 0.003847, 0.012455, 0.001301, 0.0031475]
        }, {
            "a": [1, 1.177, 4.4498, 3.573, 6.8272, 3.5154, 4.3076, 1.121, 0.93708],
            "b": [0.0031517, 0.0036861, 0.013853, 0.011155, 0.021399, 0.011155, 0.013853, 0.0036861, 0.0031517]
        }, {
            "a": [1, 1.9709, 5.3828, 6.2849, 8.7072, 6.1776, 5.2007, 1.8717, 0.93347],
            "b": [0.0031567, 0.0061744, 0.016757, 0.019606, 0.02729, 0.019606, 0.016757, 0.0061744, 0.0031567]
        }, {
            "a": [1, 2.7886, 6.8378, 9.5616, 11.7336, 9.3888, 6.593, 2.6401, 0.92966],
            "b": [0.0031627, 0.0087399, 0.021289, 0.029807, 0.036776, 0.029807, 0.021289, 0.0087399, 0.0031627]
        }, {
            "a": [1, 3.6181, 8.8263, 13.5957, 16.0552, 13.3356, 8.4918, 3.4143, 0.92563],
            "b": [0.0031698, 0.011346, 0.027483, 0.042355, 0.050319, 0.042355, 0.027483, 0.011346, 0.0031698]
        }, {
            "a": [1, 4.4437, 11.3181, 18.5324, 21.7738, 18.1569, 10.8641, 4.179, 0.92139],
            "b": [0.0031782, 0.013947, 0.035245, 0.057698, 0.068231, 0.057698, 0.035245, 0.013947, 0.0031782]
        }, {
            "a": [1, 5.2456, 14.2275, 24.4064, 28.8779, 23.8829, 13.6236, 4.9152, 0.91692],
            "b": [0.003188, 0.016479, 0.044306, 0.075938, 0.090466, 0.075938, 0.044306, 0.016479, 0.003188]
        }]
    }
};


