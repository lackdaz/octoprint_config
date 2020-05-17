// JS assets for plugin BetterHeaterTimeout
(function () {
    try {
        // source: plugin/BetterHeaterTimeout/js/BetterHeaterTimeout.js
        $(function() {
            function BetterHeaterTimeoutViewModel(parameters) {
                var self = this;
        
        		self.onDataUpdaterPluginMessage = (plugin, { event, payload }) => {
        			if(plugin !== "BetterHeaterTimeout") return;
        
        			if(event === "HeaterTimeout")
        				return new PNotify({
        					title: "HeaterTimeout",
        					text: `Heater '${payload.heater}' disabled after ${payload.time_elapsed} seconds.`,
        				});
        		}
            }
        
            OCTOPRINT_VIEWMODELS.push({
                construct: BetterHeaterTimeoutViewModel,
                dependencies: [],
                elements: []
            });
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin BetterHeaterTimeout:", (error.stack || error));
    }
})();

// JS assets for plugin HeaterTimeout
(function () {
    try {
        // source: plugin/HeaterTimeout/js/HeaterTimeout.js
        /*
         *
         * Copyright 2017 Google Inc.
         *
         * Licensed under the Apache License, Version 2.0 (the "License");
         * you may not use this file except in compliance with the License.
         * You may obtain a copy of the License at
         *
         *     http://www.apache.org/licenses/LICENSE-2.0
         *
         * Unless required by applicable law or agreed to in writing, software
         * distributed under the License is distributed on an "AS IS" BASIS,
         * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
         * See the License for the specific language governing permissions and
         * limitations under the License.
         *
         */
        $(function() {
            function HeaterTimeoutViewModel(parameters) {
                var self = this;
                var msgTitle = "HeaterTimeout";
                var msgType = "error";
                var autoClose = false;
        
                self.settingsViewModel = parameters[0];
        
                self.onDataUpdaterPluginMessage = function(plugin, data) {
                    if (plugin != "HeaterTimeout") {
                        return;
                    }
        
                    if (data.type == "popup") {
                        new PNotify({
                            text: data.msg,
                            title: msgTitle,
                            type: msgType,
                            hide: autoClose
                        });
                    }
                }
            }
        
            ADDITIONAL_VIEWMODELS.push([
                HeaterTimeoutViewModel,
        
                // This is a list of dependencies to inject into the plugin, the order which you request
                // here is the order in which the dependencies will be injected into your view model upon
                // instantiation via the parameters argument
                [],
        
                // Finally, this is the list of selectors for all elements we want this view model to be bound to.
                []
            ]);
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin HeaterTimeout:", (error.stack || error));
    }
})();

// JS assets for plugin PrintTimeGenius
(function () {
    try {
        // source: plugin/PrintTimeGenius/js/PrintTimeGenius.js
        /*
         * View model for OctoPrint-PrintTimeGenius
         *
         * Author: Eyal
         * License: AGPLv3
         */
        $(function() {
          function PrintTimeGeniusViewModel(parameters) {
            var self = this;
        
            self.settingsViewModel = parameters[0];
            self.printerStateViewModel = parameters[1];
            self.filesViewModel = parameters[2];
            self.selectedGcodes = ko.observable();
            self.print_history = ko.observableArray();
            self.settings_visible = ko.observable(false);
            self.version = undefined;
        
            // Overwrite the printTimeLeftOriginString function
            ko.extenders.addGenius = function(target, option) {
              let result = ko.pureComputed(function () {
                let value = self.printerStateViewModel.printTimeLeftOrigin();
                switch (value) {
                  case "genius": {
                    return option;
                  }
                  default: {
                    return target();
                  }
                }
              })
              return result;
            };
            self.original_processProgressData = self.printerStateViewModel._processProgressData;
            self.printerStateViewModel._processProgressData = function(data) {
              self.original_processProgressData(data);
              if (data.printTimeLeft) {
                self.printerStateViewModel.progress(
                    (data.printTime||0) /
                      ((data.printTime||0) + (data.printTimeLeft))
                      * 100);
              }
            };
            self.printerStateViewModel.printTimeLeftOriginString =
                self.printerStateViewModel.printTimeLeftOriginString.extend({
                  addGenius: gettext("Based on a line-by-line preprocessing of the gcode (good accuracy)")});
        
            // Overwrite the printTimeLeftOriginClass function
            self.originalPrintTimeLeftOriginClass = self.printerStateViewModel.printTimeLeftOriginClass;
            self.printerStateViewModel.printTimeLeftOriginClass = ko.pureComputed(function() {
              let value = self.printerStateViewModel.printTimeLeftOrigin();
              switch (value) {
                case "genius": {
                  return "print-time-genius";
                }
                default: {
                  return self.originalPrintTimeLeftOriginClass();
                }
              }
            });
            self.printerStateViewModel.printTimeLeftOrigin.valueHasMutated();
        
            self.theFiles = function(items) {
            	let results = [];
            	let queue = [{children: items}];
        
            	while (queue.length > 0) {
            		item = queue.shift();
            		results.push(...item.children.filter(item => item["type"] == "machinecode"));
            		queue.push(...item.children.filter(item => "children" in item));
            	}
            	return results;
            };
        
            self.FileList = ko.pureComputed(function() {
                // only compute FileList when settings is visible
                if (!self.settings_visible()) {
                    return [];
                }
                return self.theFiles(self.filesViewModel.allItems())
                    .sort(function(a,b) {
                        if (_.has(a, "gcodeAnalysis.progress") != _.has(b, "gcodeAnalysis.progress")) {
                            return (_.has(a, "gcodeAnalysis.progress") - _.has(b, "gcodeAnalysis.progress"));
                        }
                        return a.path.localeCompare(b.path);
                    });
            });
        
            self.onSettingsShown = function() {
                self.settings_visible(true);
            };
        
            self.onSettingsHidden = function() {
                self.settings_visible(false);
            };
        
            self.analyzeCurrentFile = function () {
              let items = self.selectedGcodes();
              for (let item of items) {
                let gcode = item["origin"] + "/" + item["path"];
                url = OctoPrint.getBlueprintUrl("PrintTimeGenius") + "analyze/" + gcode;
                OctoPrint.get(url)
              }
            }
        
            self.onBeforeBinding = function() {
              let settings = self.settingsViewModel.settings;
              let printTimeGeniusSettings = settings.plugins.PrintTimeGenius;
              self.analyzers = printTimeGeniusSettings.analyzers;
              self.exactDurations = printTimeGeniusSettings.exactDurations;
              self.enableOctoPrintAnalyzer = printTimeGeniusSettings.enableOctoPrintAnalyzer;
              self.allowAnalysisWhilePrinting = printTimeGeniusSettings.allowAnalysisWhilePrinting;
              self.allowAnalysisWhileHeating = printTimeGeniusSettings.allowAnalysisWhileHeating;
              OctoPrint.get(OctoPrint.getBlueprintUrl("PrintTimeGenius") + "print_history")
                  .done(function (print_history) {
                    self.version = print_history['version'];
                    self.print_history(ko.mapping.fromJS(print_history['print_history'])());
                  });
              self.print_history.subscribe(function (newValue) {
                if (!newValue) {
                  return;
                }
                let to_write = {
                  'print_history': ko.mapping.toJS(newValue),
                  'version': self.version
                };
                OctoPrint.postJson(OctoPrint.getBlueprintUrl("PrintTimeGenius") + "print_history",
                                   to_write);
              });
              // Overwrite the formatFuzzyPrintTime as needed.
              self.originalFormatFuzzyPrintTime = formatFuzzyPrintTime;
              formatFuzzyPrintTime = function() {
                if (self.exactDurations()) {
                  return formatDuration.apply(null, arguments);
                } else {
                  return self.originalFormatFuzzyPrintTime.apply(null, arguments);
                }
              }
        
              self.exactDurations.subscribe(function (newValue) {
                self.printerStateViewModel.estimatedPrintTime.valueHasMutated();
                self.printerStateViewModel.lastPrintTime.valueHasMutated();
                self.printerStateViewModel.printTimeLeft.valueHasMutated();
              });
              // Force an update because this is called after the format function has already run.
              self.exactDurations.valueHasMutated();
              self.originalGetSuccessClass = self.filesViewModel.getSuccessClass;
              self.filesViewModel.getSuccessClass = function(data) {
                let additional_css = "";
                if (_.get(data, "gcodeAnalysis.analysisPending", false)) {
                  additional_css = " print-time-genius-pending";
                } else if (_.has(data, "gcodeAnalysis.progress")) {
                  additional_css = " print-time-genius-after";
                }
                return self.originalGetSuccessClass(data) + additional_css;
              };
              self.filesViewModel.requestData({force: true}); // So that the file list is updated with the changes above.
            }
        
            self.addAnalyzer = function() {
              self.analyzers.push({command: "", enabled: true});
            }
        
            self.removeAnalyzer = function(analyzer) {
              self.analyzers.remove(analyzer);
            }
            self.removePrintHistoryRow = function(row) {
              self.print_history.remove(row);
            }
            self.resetAnalyzersToDefault = function() {
              OctoPrint.get(OctoPrint.getBlueprintUrl("PrintTimeGenius") + "get_settings_defaults").done(
                  function (defaults) {
                    self.analyzers(defaults['analyzers']);
                  });
            }
          }
        
          /* view model class, parameters for constructor, container to bind to
           * Please see http://docs.octoprint.org/en/master/plugins/viewmodels.html#registering-custom-viewmodels for more details
           * and a full list of the available options.
           */
          OCTOPRINT_VIEWMODELS.push({
            construct: PrintTimeGeniusViewModel,
            // ViewModels your plugin depends on, e.g. loginStateViewModel, settingsViewModel, ...
            dependencies: ["settingsViewModel", "printerStateViewModel", "filesViewModel"],
            // Elements to bind to, e.g. #settings_plugin_PrintTimeGenius, #tab_plugin_PrintTimeGenius, ...
            elements: [ "#settings_plugin_PrintTimeGenius" ]
          });
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin PrintTimeGenius:", (error.stack || error));
    }
})();

// JS assets for plugin cost
(function () {
    try {
        // source: plugin/cost/js/cost.js
        /*
         * View model for OctoPrint-Cost
         *
         * Author: Jan Szumiec
         * License: MIT
         */
        $(function() {
            function CostViewModel(parameters) {
                var printerState = parameters[0];
                var settingsState = parameters[1];
                var filesState = parameters[2];
                var self = this;
        
                // There must be a nicer way of doing this.
        	
        	settingsState.check_cost = ko.observable(true);
        
        	settingsState.costPerWeight = ko.pureComputed(function() {
        	  var currency = settingsState.settings.plugins.cost.currency();
        	  var weight = settingsState.settings.plugins.cost.weight();
        	  return currency + '/' + weight;
        	});
        	settingsState.costPerLength = ko.pureComputed(function() {
        	  var currency = settingsState.settings.plugins.cost.currency();
        	  var length = settingsState.settings.plugins.cost.length();
        	  return currency + '/' + length;
        	});
        	settingsState.costPerTime = ko.pureComputed(function() {
        	  var currency = settingsState.settings.plugins.cost.currency();
        	  var time = settingsState.settings.plugins.cost.time();
        	  return currency + '/' + time;
        	});
        	
                printerState.costString = ko.pureComputed(function() {
                    if (settingsState.settings === undefined) return '-';
                    if (printerState.filament().length == 0) return '-';
        
                    var currency = settingsState.settings.plugins.cost.currency();
        	    var cost_per_length = settingsState.settings.plugins.cost.cost_per_length();
        	    var cost_per_weight = settingsState.settings.plugins.cost.cost_per_weight();
        	    var density_of_filament = settingsState.settings.plugins.cost.density_of_filament();
                    var cost_per_time = settingsState.settings.plugins.cost.cost_per_time();
        
                    var filament_used_length = printerState.filament()[0].data().length / 1000;
        	    var filament_used_volume = printerState.filament()[0].data().volume / 1000;
                    var expected_time = printerState.estimatedPrintTime() / 3600;
        
        	    if (settingsState.check_cost()) {
        	      var totalCost = cost_per_weight * filament_used_volume * density_of_filament + expected_time * cost_per_time;
        	    }
        	    else {
        	      var totalCost = cost_per_length * filament_used_length + expected_time * cost_per_time;
        	    }
        
                    return '' + currency + totalCost.toFixed(2);
                });
        
                var originalGetAdditionalData = filesState.getAdditionalData;
                filesState.getAdditionalData = function(data) {
                    var output = originalGetAdditionalData(data);
        
                    if (data.hasOwnProperty('gcodeAnalysis')) {
                        var gcode = data.gcodeAnalysis;
                        if (gcode.hasOwnProperty('filament') && gcode.filament.hasOwnProperty('tool0') && gcode.hasOwnProperty('estimatedPrintTime')) {
                            var currency = settingsState.settings.plugins.cost.currency();
        		    var cost_per_length = settingsState.settings.plugins.cost.cost_per_length();
                            var cost_per_weight = settingsState.settings.plugins.cost.cost_per_weight();
        		    var density_of_filament = settingsState.settings.plugins.cost.density_of_filament();
                            var cost_per_time = settingsState.settings.plugins.cost.cost_per_time();
        
                            var filament_used_length = gcode.filament.tool0.length / 1000;
        		    var filament_used_volume = gcode.filament.tool0.volume / 1000;
                            var expected_time = gcode.estimatedPrintTime / 3600;
        
        		    if (settingsState.check_cost()) {
        		      var totalCost = cost_per_weight * filament_used_volume * density_of_filament + expected_time * cost_per_time;
        		    }
        		    else {
        		      var totalCost = cost_per_length * filament_used_length + expected_time * cost_per_time;
        		    }
        
                            output += gettext("Cost") + ": " + currency + totalCost.toFixed(2);
                        }
                    }
        
                    return output;
                };
        
                self.onStartup = function() {
                    var element = $("#state").find(".accordion-inner .progress");
                    if (element.length) {
                        var text = gettext("Cost");
                        element.before(text + ": <strong data-bind='text: costString'></strong><br>");
                    }
                };
        
            }
        
            // view model class, parameters for constructor, container to bind to
            OCTOPRINT_VIEWMODELS.push([
                CostViewModel,
                ["printerStateViewModel", "settingsViewModel", "gcodeFilesViewModel"],
                []
            ]);
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin cost:", (error.stack || error));
    }
})();

// JS assets for plugin eeprom_MPSelectMini
(function () {
    try {
        // source: plugin/eeprom_MPSelectMini/js/eeprom_malyan.js
        /**
        * Created by Salandora on 27.07.2015.
        * Modified by Anderson Silva on 08.04.2017.
        * Modified by Brian Ruhmann on 08.06.2017
        */
        $(function() {
            function EepromMalyanViewModel(parameters) {
                var self = this;
        
                self.setRegExVars = function(version) {
                    self.eepromM92RegEx = /M92 ([X])(.*)[^0-9]([Y])(.*)[^0-9]([Z])(.*)[^0-9]([E])(.*)/;
                    self.eepromM203RegEx = /M203 ([X])(.*)[^0-9]([Y])(.*)[^0-9]([Z])(.*)[^0-9]([E])(.*)/;
                    self.eepromM201RegEx = /M201 ([X])(.*)[^0-9]([Y])(.*)[^0-9]([Z])(.*)[^0-9]([E])(.*)/;
                    self.eepromM206RegEx = /M206 ([X])(.*)[^0-9]([Y])(.*)[^0-9]([Z])(.*)/;
                    self.eepromM200RegEx = /M200 ([D])(.*)/;
                    self.eepromM304RegEx = /M304 ([P])(.*)[^0-9]([I])(.*)[^0-9]([D])(.*)/;
                    self.eepromM205RegEx = /M205 ([S])(.*)[^0-9]([T])(.*)[^0-9]([B])(.*)[^0-9]([X])(.*)[^0-9]([Z])(.*)[^0-9]([E])(.*)/;
                    self.eepromM204RegEx = /M204 ([P])(.*)[^0-9]([R])(.*)[^0-9]([T])(.*)/;
                    self.eepromM301RegEx = /M301 ([P])(.*)[^0-9]([I])(.*)[^0-9]([D])(.*)[^0-9]([C])(.*)[^0-9]([L])(.*)/;
                };
        
                self.control = parameters[0];
                self.connection = parameters[1];
                self.FIRMWARE_NAME = ko.observable("");
        
                self.firmwareRegEx = /NAME[:|.][\s]*([^\s]*)[\s]*VER:[\s]*([^\s]*)/i;
                self.malyanRegEx = /Malyan[^\s]*/i;
        
        	//So far, this has only been tested with Malyan 2.9 (although other versions will likely work)
        	self.testedVersionRegEx = /2.9|3.0|4.0/;
        
                self.setRegExVars('lastest');
        
                self.isMalyanFirmware = ko.observable(false);
        
        	//This is only used to display a warning if the version is untested
        	self.isTestedVersion = ko.observable(false);
        
                self.isConnected = ko.computed(function() {
                    return self.connection.isOperational() || self.connection.isPrinting() ||
                    self.connection.isReady() || self.connection.isPaused();
                });
        
                self.eepromData1 = ko.observableArray([]);
                self.eepromData2 = ko.observableArray([]);
                self.eepromDataSteps = ko.observableArray([]);
                self.eepromDataFRates = ko.observableArray([]);
                self.eepromDataMaxAccel = ko.observableArray([]);
                self.eepromDataAccel = ko.observableArray([]);
                self.eepromDataPID = ko.observableArray([]);
                self.eepromDataPIDB = ko.observableArray([]);
                self.eepromDataHoming = ko.observableArray([]);
                self.eepromDataFilament = ko.observableArray([]);
        
                self.onStartup = function() {
                    $('#settings_plugin_eeprom_MPSelectMini_link a').on('show', function(e) {
                        if (self.isConnected() && !self.isMalyanFirmware()) {
                            self._requestFirmwareInfo();
                        }
                    });
                };
        
                self.firmware_name = function() {
                    return self.FIRMWARE_NAME();
                };
        
                self.eepromFieldParse = function(line) {
                    // M92 steps per unit
                    var match = self.eepromM92RegEx.exec(line);
                    if (match) {
                        self.eepromDataSteps.push({
                            dataType: 'M92 X',
                            label: 'X axis',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm',
                            description: 'steps per unit'
                        });
        
                        self.eepromDataSteps.push({
                            dataType: 'M92 Y',
                            label: 'Y axis',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm',
                            description: 'steps per unit'
                        });
        
                        self.eepromDataSteps.push({
                            dataType: 'M92 Z',
                            label: 'Z axis',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm',
                            description: 'steps per unit'
                        });
        
                        self.eepromDataSteps.push({
                            dataType: 'M92 E',
                            label: 'Extruder',
                            origValue: match[8],
                            value: match[8],
                            unit: 'mm',
                            description: 'steps per unit'
                        });
                    }
        
                    // M203 feedrates
                    match = self.eepromM203RegEx.exec(line);
                    if (match) {
                        self.eepromDataFRates.push({
                            dataType: 'M203 X',
                            label: 'X axis',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm',
                            description: 'rate per unit'
                        });
        
                        self.eepromDataFRates.push({
                            dataType: 'M203 Y',
                            label: 'Y axis',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm',
                            description: 'rate per unit'
                        });
        
                        self.eepromDataFRates.push({
                            dataType: 'M203 Z',
                            label: 'Z axis',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm',
                            description: 'rate per unit'
                        });
        
                        self.eepromDataFRates.push({
                            dataType: 'M203 E',
                            label: 'Extruder',
                            origValue: match[8],
                            value: match[8],
                            unit: 'mm',
                            description: 'rate per unit'
                        });
                    }
        
                    // M201 Maximum Acceleration (mm/s2)
                    match = self.eepromM201RegEx.exec(line);
                    if (match) {
                        self.eepromDataMaxAccel.push({
                            dataType: 'M201 X',
                            label: 'X axis',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm/s2',
                            description: ''
                        });
        
                        self.eepromDataMaxAccel.push({
                            dataType: 'M201 Y',
                            label: 'Y axis',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm/s2',
                            description: ''
                        });
        
                        self.eepromDataMaxAccel.push({
                            dataType: 'M201 Z',
                            label: 'Z axis',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm/s2',
                            description: ''
                        });
        
                        self.eepromDataMaxAccel.push({
                            dataType: 'M201 E',
                            label: 'Extruder',
                            origValue: match[8],
                            value: match[8],
                            unit: 'mm/s2',
                            description: ''
                        });
                    }
        
                    // M206 Home offset
                    match = self.eepromM206RegEx.exec(line);
                    if (match) {
                        self.eepromDataHoming.push({
                            dataType: 'M206 X',
                            label: 'X axis',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm',
                            description: ''
                        });
        
                        self.eepromDataHoming.push({
                            dataType: 'M206 Y',
                            label: 'Y axis',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm',
                            description: ''
                        });
        
                        self.eepromDataHoming.push({
                            dataType: 'M206 Z',
                            label: 'Z axis',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm',
                            description: ''
                        });
                    }
        
        
        
                    // Filament diameter
                    match = self.eepromM200RegEx.exec(line);
                    if (match) {
                        if (self.eepromDataFilament().length === 0) {
                            self.eepromDataFilament.push({
                                dataType: 'M200 D',
                                label: 'Diameter',
                                origValue: match[2],
                                value: match[2],
                                unit: 'mm',
                                description: ''
                            });
                        }
                    }
        
                    // M304 PID settings
                    match = self.eepromM304RegEx.exec(line);
                    if (match) {
                        self.eepromDataPIDB.push({
                            dataType: 'M304 P',
                            label: 'Bed Kp',
                            origValue: match[2],
                            value: match[2],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPIDB.push({
                            dataType: 'M304 I',
                            label: 'Ki',
                            origValue: match[4],
                            value: match[4],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPIDB.push({
                            dataType: 'M304 D',
                            label: 'Kd',
                            origValue: match[6],
                            value: match[6],
                            unit: 'term',
                            description: ''
                        });
                    }
        
                    match = self.eepromM205RegEx.exec(line);
                    if (match) {
                        self.eepromData1.push({
                            dataType: 'M205 S',
                            label: 'Min feedrate',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm/s',
                            description: ''
                        });
                         self.eepromData1.push({
                            dataType: 'M205 T',
                            label: 'Min travel',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm/s',
                            description: ''
                        });
        
                        self.eepromData1.push({
                            dataType: 'M205 B',
                            label: 'Min segment',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm/s',
                            description: ''
                        });
        
                        self.eepromData2.push({
                            dataType: 'M205 X',
                            label: 'Max X jerk',
                            origValue: match[8],
                            value: match[8],
                            unit: 'mm/s',
                            description: ''
                        });
        
                        self.eepromData2.push({
                            dataType: 'M205 Y',
                            label: 'Max Y jerk',
                            origValue: match[8],
                            value: match[8],
                            unit: 'mm/s',
                            description: ''
                        });
        
                        self.eepromData2.push({
                            dataType: 'M205 Z',
                            label: 'Max Z jerk',
                            origValue: match[10],
                            value: match[10],
                            unit: 'mm/s',
                            description: ''
                        });
        
                        self.eepromData2.push({
                            dataType: 'M205 E',
                            label: 'Max E jerk',
                            origValue: match[12],
                            value: match[12],
                            unit: 'mm/s',
                            description: ''
                        });
                    }            
         
                    // M204 Acceleration
                    match = self.eepromM204RegEx.exec(line);
                    if (match) {
                        self.eepromDataAccel.push({
                            dataType: 'M204 P',
                            label: 'Printing moves',
                            origValue: match[2],
                            value: match[2],
                            unit: 'mm/s2',
                            description: ''
                        });
        
                        self.eepromDataAccel.push({
                            dataType: 'M204 R',
                            label: 'Retract',
                            origValue: match[4],
                            value: match[4],
                            unit: 'mm/s2',
                            description: ''
                        });
        
                        self.eepromDataAccel.push({
                            dataType: 'M204 T',
                            label: 'Travel',
                            origValue: match[6],
                            value: match[6],
                            unit: 'mm/s2',
                            description: ''
                        });
                    }
        
                    // M301 PID settings
                    match = self.eepromM301RegEx.exec(line);
                    if (match) {
                        self.eepromDataPID.push({
                            dataType: 'M301 P',
                            label: 'Hotend Kp',
                            origValue: match[2],
                            value: match[2],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPID.push({
                            dataType: 'M301 I',
                            label: 'Ki',
                            origValue: match[4],
                            value: match[4],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPID.push({
                            dataType: 'M301 D',
                            label: 'Kd',
                            origValue: match[6],
                            value: match[6],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPID.push({
                            dataType: 'M301 C',
                            label: 'Kc',
                            origValue: match[8],
                            value: match[8],
                            unit: 'term',
                            description: ''
                        });
        
                        self.eepromDataPID.push({
                            dataType: 'M301 L',
                            label: 'LPQ',
                            origValue: match[10],
                            value: match[10],
                            unit: 'len',
                            description: ''
                        });
                    }
        
                };
        
                self.fromHistoryData = function(data) {
                    _.each(data.logs, function(line) {
                        var match = self.firmwareRegEx.exec(line);
                        if (match !== null) {
                            self.FIRMWARE_NAME(match[1] + ' ' + match[2]);
                            self.setRegExVars(self.firmware_name());
                            console.debug('Firmware: ' + self.firmware_name());
                            if (self.malyanRegEx.exec(match[0])){
                                self.isMalyanFirmware(true);
                                if (self.testedVersionRegEx.exec(match[2]))
        			        self.isTestedVersion(true);
        		    }
                        }
                    });
                };
        
                self.fromCurrentData = function(data) {
                    if (!self.isMalyanFirmware()) {
                        _.each(data.logs, function (line) {
                            var match = self.firmwareRegEx.exec(line);
                            if (match) {
                                self.FIRMWARE_NAME(match[1] + ' ' + match[2]);
                                self.setRegExVars(self.firmware_name());
                                console.debug('Firmware: ' + self.firmware_name());
                                if (self.malyanRegEx.exec(match[0])){
                                    self.isMalyanFirmware(true);
        			    if (self.testedVersionRegEx.exec(match[2]))
        			        self.isTestedVersion(true);
        			}
                            }
                        });
                    }
                    else
                    {
                        _.each(data.logs, function (line) {
                            self.eepromFieldParse(line);
                        });
                    }
                };
        
                self.eepromDataCount = ko.computed(function() {
                    return (self.eepromData1().length + self.eepromData2().length) > 0;
                });
        
                self.eepromDataStepsCount = ko.computed(function() {
                    return self.eepromDataSteps().length > 0;
                });
        
                self.eepromDataFRatesCount = ko.computed(function() {
                    return self.eepromDataFRates().length > 0;
                });
        
                self.eepromDataMaxAccelCount = ko.computed(function() {
                    return self.eepromDataMaxAccel().length > 0;
                });
        
                self.eepromDataAccelCount = ko.computed(function() {
                    return self.eepromDataAccel().length > 0;
                });
        
                self.eepromDataPIDCount = ko.computed(function() {
                    return (self.eepromDataPID().length + self.eepromDataPIDB().length) > 0;
                });
        
                self.eepromDataHomingCount = ko.computed(function() {
                    return self.eepromDataHoming().length > 0;
                });
        
                self.eepromDataFilamentCount = ko.computed(function() {
                    return self.eepromDataFilament().length > 0;
                });
        
                self.onEventConnected = function() {
                    self._requestFirmwareInfo();
                    setTimeout(function() {self.loadEeprom(); }, 5000);
                };
        
                self.onStartupComplete = function() {
                    setTimeout(function() {self.loadEeprom(); }, 5000);
                };
        
                self.onEventDisconnected = function() {
                    self.isMalyanFirmware(false);
                };
        
                self.loadEeprom = function() {
                    self.eepromData1([]);
                    self.eepromData2([]);
                    self.eepromDataSteps([]);
                    self.eepromDataFRates([]);
                    self.eepromDataMaxAccel([]);
                    self.eepromDataAccel([]);
                    self.eepromDataPID([]);
                    self.eepromDataPIDB([]);
                    self.eepromDataHoming([]);
                    self.eepromDataFilament([]);
        
                    self._requestEepromData();
                };
        
                self.saveEeprom = function()  {
                    var cmd = 'M500';
                    var eepromData = self.eepromData1();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromData2();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataSteps();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataFRates();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataMaxAccel();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataAccel();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataPID();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataPIDB();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataHoming();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    eepromData = self.eepromDataFilament();
                    _.each(eepromData, function(data) {
                        if (data.origValue != data.value) {
                            self._requestSaveDataToEeprom(data.dataType, data.value);
                            data.origValue = data.value;
                        }
                    });
        
                    self.control.sendCustomCommand({ command: cmd });
        
                    alert('EEPROM data stored.');
                };
        
                self._requestFirmwareInfo = function() {
                    self.control.sendCustomCommand({ command: "M115" });
                };
        
                self._requestEepromData = function() {
                    self.control.sendCustomCommand({ command: "M503" });
                };
        
                self._requestSaveDataToEeprom = function(data_type, value) {
                    var cmd = data_type + value;
                    self.control.sendCustomCommand({ command: cmd });
                };
            }
        
            OCTOPRINT_VIEWMODELS.push([
                EepromMalyanViewModel,
                ["controlViewModel", "connectionViewModel"],
                "#settings_plugin_eeprom_MPSelectMini"
            ]);
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin eeprom_MPSelectMini:", (error.stack || error));
    }
})();

// JS assets for plugin firmwareupdater
(function () {
    try {
        // source: plugin/firmwareupdater/js/firmwareupdater.js
        $(function() {
            function FirmwareUpdaterViewModel(parameters) {
                var self = this;
        
                self.settingsViewModel = parameters[0];
                self.loginState = parameters[1];
                self.connection = parameters[2];
                self.printerState = parameters[3];
        
                // General settings
                self.configFlashMethod = ko.observable();
                self.showAdvancedConfig = ko.observable(false);
                self.showAvrdudeConfig = ko.observable(false);
                self.showBossacConfig = ko.observable(false);
                self.showLpc1768Config = ko.observable(false);
                self.showDfuConfig = ko.observable(false);
                self.showStm32flashConfig = ko.observable(false);
                self.showPostflashConfig = ko.observable(false);
                self.configEnablePostflashDelay = ko.observable();
                self.configPostflashDelay = ko.observable();
                self.configEnablePostflashGcode = ko.observable();
                self.configPostflashGcode = ko.observable();
                self.configDisableBootloaderCheck = ko.observable();
                self.configEnablePreflashCommandline = ko.observable();
                self.configPreflashCommandline = ko.observable();
                self.configEnablePostflashCommandline = ko.observable();
                self.configPostflashCommandline = ko.observable();
        
                // Config settings for avrdude
                self.configAvrdudeMcu = ko.observable();
                self.configAvrdudePath = ko.observable();
                self.configAvrdudeConfigFile = ko.observable();
                self.configAvrdudeProgrammer = ko.observable();
                self.configAvrdudeBaudRate = ko.observable();
                self.configAvrdudeDisableVerification = ko.observable();
                self.configAvrdudeCommandLine = ko.observable();
                self.avrdudePathBroken = ko.observable(false);
                self.avrdudePathOk = ko.observable(false);
                self.avrdudePathText = ko.observable();
                self.avrdudePathHelpVisible = ko.computed(function() {
                    return self.avrdudePathBroken() || self.avrdudePathOk();
                });
        
                self.avrdudeConfPathBroken = ko.observable(false);
                self.avrdudeConfPathOk = ko.observable(false);
                self.avrdudeConfPathText = ko.observable();
                self.avrdudeConfPathHelpVisible = ko.computed(function() {
                    return self.avrdudeConfPathBroken() || self.avrdudeConfPathOk();
                });
        
                // Config settings for bossac
                self.configBossacPath = ko.observable();
                self.configBossacDisableVerification = ko.observable()
                self.configBossacCommandLine = ko.observable();
        
                self.bossacPathBroken = ko.observable(false);
                self.bossacPathOk = ko.observable(false);
                self.bossacPathText = ko.observable();
                self.bossacPathHelpVisible = ko.computed(function() {
                    return self.bossacPathBroken() || self.bossacPathOk();
                });
        
                // Config settings for lpc1768
                self.configLpc1768Path = ko.observable();
                self.configLpc1768ResetBeforeFlash = ko.observable();
        
                self.lpc1768PathBroken = ko.observable(false);
                self.lpc1768PathOk = ko.observable(false);
                self.lpc1768PathText = ko.observable();
                self.lpc1768PathHelpVisible = ko.computed(function() {
                    return self.lpc1768PathBroken() || self.lpc1768PathOk();
                });
        
                // Config settings for dfu-programmer
                self.configDfuMcu = ko.observable();
                self.configDfuPath = ko.observable();
                self.configDfuCommandLine = ko.observable();
                self.configDfuEraseCommandLine = ko.observable();
                self.dfuPathBroken = ko.observable(false);
                self.dfuPathOk = ko.observable(false);
                self.dfuPathText = ko.observable();
                self.dfuPathHelpVisible = ko.computed(function() {
                    return self.dfuPathBroken() || self.dfuPathOk();
                });
        
                // Config settings for stm32flash
                self.configStm32flashPath = ko.observable();
                self.configStm32flashVerify = ko.observable(true);
                self.configStm32flashBoot0Pin = ko.observable();
                self.configStm32flashBoot0Low = ko.observable(true);
                self.configStm32flashResetPin = ko.observable();
                self.configStm32flashResetLow = ko.observable(true);
                self.configStm32flashExecute = ko.observable();
                self.configStm32flashExecuteAddress = ko.observable();
                self.configStm32flashReset = ko.observable(false);
                self.stm32flashPathBroken = ko.observable();
                self.stm32flashPathOk = ko.observable(false);
                self.stm32flashPathText = ko.observable();
                self.stm32flashPathHelpVisible = ko.computed(function() {
                    return self.stm32flashPathBroken() || self.stm32flashPathOk();
                });
        
                self.flashPort = ko.observable(undefined);
        
                self.firmwareFileName = ko.observable(undefined);
                self.firmwareFileURL = ko.observable(undefined);
        
                self.alertMessage = ko.observable("");
                self.alertType = ko.observable("alert-warning");
                self.showAlert = ko.observable(false);
                self.missingParamToFlash = ko.observable(false);
                self.progressBarText = ko.observable();
                self.isBusy = ko.observable(false);
                self.fileFlashButtonText = ko.observable("");
                self.urlFlashButtonText = ko.observable("");
        
                self.selectFilePath = undefined;
                self.configurationDialog = undefined;
        
                self.inSettingsDialog = false;
        
                self.connection.selectedPort.subscribe(function(value) {
                    if (value === undefined) return;
                    self.flashPort(value);
                });
        
                self.toggleAdvancedConfig = function(){
                    self.showAdvancedConfig(!self.showAdvancedConfig());
                }
        
                self.togglePostflashConfig = function(){
                    self.showPostflashConfig(!self.showPostflashConfig());
                }
        
                self.configFlashMethod.subscribe(function(value) {
                    if(value == 'avrdude') {
                        self.showAvrdudeConfig(true);
                        self.showBossacConfig(false);
                        self.showLpc1768Config(false);
                        self.showDfuConfig(false);
                        self.showStm32flashConfig(false);
                    } else if(value == 'bossac') {
                        self.showAvrdudeConfig(false);
                        self.showBossacConfig(true);
                        self.showLpc1768Config(false);
                        self.showDfuConfig(false);
                        self.showStm32flashConfig(false);
                    } else if(value == 'lpc1768'){
                        self.showAvrdudeConfig(false);
                        self.showBossacConfig(false);
                        self.showLpc1768Config(true);
                        self.showStm32flashConfig(false);
                        self.showDfuConfig(false);
                    } else if(value == 'dfuprogrammer'){
                        self.showAvrdudeConfig(false);
                        self.showBossacConfig(false);
                        self.showLpc1768Config(false);
                        self.showDfuConfig(true);
                        self.showStm32flashConfig(false);
                    } else if(value == 'stm32flash'){
                        self.showAvrdudeConfig(false);
                        self.showBossacConfig(false);
                        self.showLpc1768Config(false);
                        self.showDfuConfig(false);
                        self.showStm32flashConfig(true);
                    } else {
                        self.showAvrdudeConfig(false);
                        self.showBossacConfig(false);
                        self.showLpc1768Config(false);
                        self.showDfuConfig(false);
                        self.showStm32flashConfig(false);
                    }
                 });
        
                 self.firmwareFileName.subscribe(function(value) {
                    if (!self.settingsViewModel.settings.plugins.firmwareupdater.disable_bootloadercheck()) {
                        if (self._checkForBootloader(value)) {
                            self.bootloaderWarningDialog.modal();
                        }
                    }
                 });
        
                self.onStartup = function() {
                    self.selectFilePath = $("#settings_firmwareupdater_selectFilePath");
                    self.configurationDialog = $("#settings_plugin_firmwareupdater_configurationdialog");
                    self.bootloaderWarningDialog = $("#BootLoaderWarning");
        
                    self.selectFilePath.fileupload({
                        dataType: "hex",
                        maxNumberOfFiles: 1,
                        autoUpload: false,
                        add: function(e, data) {
                            if (data.files.length === 0) {
                                return false;
                            }
                            self.hexData = data;
                            self.firmwareFileName(data.files[0].name);
                        }
                    });
                };
        
                self._checkIfReadyToFlash = function(source) {
                    var alert = undefined;
        
                    if (!self.loginState.isAdmin()){
                        alert = gettext("You need administrator privileges to flash firmware.");
                    }
        
                    if (self.printerState.isPrinting() || self.printerState.isPaused()){
                        alert = gettext("Printer is printing. Please wait for the print to be finished.");
                    }
        
                    if (!self.settingsViewModel.settings.plugins.firmwareupdater.flash_method()){
                        alert = gettext("The flash method is not selected.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "avrdude" && !self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_avrmcu()) {
                        alert = gettext("The AVR MCU type is not selected.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "avrdude" && !self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_path()) {
                        alert = gettext("The avrdude path is not configured.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "avrdude" && !self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_programmer()) {
                        alert = gettext("The AVR programmer is not selected.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "bossac" && !self.settingsViewModel.settings.plugins.firmwareupdater.bossac_path()) {
                        alert = gettext("The bossac path is not configured.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "lpc1768" && !self.settingsViewModel.settings.plugins.firmwareupdater.lpc1768_path()) {
                        alert = gettext("The lpc1768 firmware folder path is not configured.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "dfuprogrammer" && !self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_path()) {
                        alert = gettext("The dfu-programmer path is not configured.");
                    }
        
                    if (self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "dfuprogrammer" && !self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_avrmcu()) {
                        alert = gettext("The AVR MCU type is not selected.");
                    }
        
                    if (!self.flashPort() &! self.settingsViewModel.settings.plugins.firmwareupdater.flash_method() == "dfuprogrammer") {
                        alert = gettext("The printer port is not selected.");
                    }
        
                    if (source === "file" && !self.firmwareFileName()) {
                        alert = gettext("Firmware file is not specified");
                    } else if (source === "url" && !self.firmwareFileURL()) {
                        alert = gettext("Firmware URL is not specified");
                    }
        
                    if (alert !== undefined) {
                        self.alertType("alert-warning");
                        self.alertMessage(alert);
                        self.showAlert(true);
                        return false;
                    } else {
                        self.alertMessage(undefined);
                        self.showAlert(false);
                    }
        
                    return true;
                };
        
                self._checkForBootloader = function(filename) {
                    if (filename.search(/bootloader/i) > -1) {
                        return true;
                    } else {
                        return false;
                    }
                }
        
                self.returnTrue = function() {
                    return true;
                }
        
                self.returnFalse = function() {
                    return false;
                }
        
                self.startFlashFromFile = function() {
                    if (!self._checkIfReadyToFlash("file")) {
                        return;
                    }
        
                    self.progressBarText("Flashing firmware...");
                    self.isBusy(true);
                    self.showAlert(false);
        
                    self.hexData.formData = {
                        port: self.flashPort()
                    };
                    self.hexData.submit();
                };
        
                self.startFlashFromURL = function() {
                    if (!self._checkIfReadyToFlash("url")) {
                        return;
                    }
        
                    self.isBusy(true);
                    self.showAlert(false);
                    self.progressBarText("Flashing firmware...");
        
                    $.ajax({
                        url: PLUGIN_BASEURL + "firmwareupdater/flash",
                        type: "POST",
                        dataType: "json",
                        data: JSON.stringify({
                            port: self.flashPort(),
                            url: self.firmwareFileURL()
                        }),
                        contentType: "application/json; charset=UTF-8"
                    })
                };
        
                self.onDataUpdaterPluginMessage = function(plugin, data) {
                    if (plugin !== "firmwareupdater") {
                        return;
                    }
        
                    var message;
        
                    if (data.type === "status") {
                        switch (data.status) {
                            case "flasherror": {
                                if (data.message) {
                                    message = gettext(data.message);
                                } else {
                                    message = gettext("Unknown error");
                                }
        
                                if (data.subtype) {
                                    switch (data.subtype) {
                                        case "busy": {
                                            message = gettext("Printer is busy.");
                                            break;
                                        }
                                        case "port": {
                                            message = gettext("Printer port is not available.");
                                            break;
                                        }
                                        case "method": {
                                            message = gettext("Flash method is not properly configured.");
                                            break;
                                        }
                                        case "hexfile": {
                                            message = gettext("Cannot read file to flash.");
                                            break;
                                        }
                                        case "already_flashing": {
                                            message = gettext("Already flashing.");
                                        }
                                    }
                                }
        
                                self.showPopup("error", gettext("Flashing failed"), message);
                                self.isBusy(false);
                                self.showAlert(false);
                                self.firmwareFileName("");
                                self.firmwareFileURL("");
                                break;
                            }
                            case "success": {
                                self.showPopup("success", gettext("Flashing successful"), "");
                                self.isBusy(false);
                                self.showAlert(false);
                                self.firmwareFileName("");
                                self.firmwareFileURL("");
                                break;
                            }
                            case "progress": {
                                if (data.subtype) {
                                    switch (data.subtype) {
                                        case "disconnecting": {
                                            message = gettext("Disconnecting printer...");
                                            break;
                                        }
                                        case "startingflash": {
                                            self.isBusy(true);
                                            message = gettext("Starting flash...");
                                            break;
                                        }
                                        case "waitforsd": {
                                            message = gettext("Waiting for SD card to mount on host...");
                                            break;
                                        }
                                        case "writing": {
                                            message = gettext("Writing memory...");
                                            break;
                                        }
                                        case "erasing": {
                                            message = gettext("Erasing memory...");
                                            break;
                                        }
                                        case "verifying": {
                                            message = gettext("Verifying memory...");
                                            break;
                                        }
                                        case "postflashdelay": {
                                            message = gettext("Post-flash delay...");
                                            break;
                                        }
                                        case "boardreset": {
                                                message = gettext("Resetting the board...");
                                                break;
                                        }
                                        case "reconnecting": {
                                            message = gettext("Reconnecting to printer...");
                                            break;
                                        }
                                    }
                                }
        
                                if (message) {
                                    self.progressBarText(message);
                                }
                                break;
                            }
                            case "info": {
                                self.alertType("alert-info");
                                self.alertMessage(data.status_description);
                                self.showAlert(true);
                                break;
                            }
                        }
                    }
                };
        
                self.showPluginConfig = function() {
                    // Load the general settings
                    self.configFlashMethod(self.settingsViewModel.settings.plugins.firmwareupdater.flash_method());
                    self.configPreflashCommandline(self.settingsViewModel.settings.plugins.firmwareupdater.preflash_commandline());
                    self.configPostflashCommandline(self.settingsViewModel.settings.plugins.firmwareupdater.postflash_commandline());
                    self.configPostflashDelay(self.settingsViewModel.settings.plugins.firmwareupdater.postflash_delay());
                    self.configPostflashGcode(self.settingsViewModel.settings.plugins.firmwareupdater.postflash_gcode());
        
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.enable_preflash_commandline() != 'false') {
                        self.configEnablePreflashCommandline(self.settingsViewModel.settings.plugins.firmwareupdater.enable_preflash_commandline());
                    }
        
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_commandline() != 'false') {
                        self.configEnablePostflashCommandline(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_commandline());
                    }
        
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_delay() != 'false') {
                        self.configEnablePostflashDelay(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_delay());
                    }
                    
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_gcode() != 'false') {
                        self.configEnablePostflashGcode(self.settingsViewModel.settings.plugins.firmwareupdater.enable_postflash_gcode());
                    }
                    
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.disable_bootloadercheck() != 'false') {
                        self.configDisableBootloaderCheck(self.settingsViewModel.settings.plugins.firmwareupdater.disable_bootloadercheck());
                    }
        
                    // Load the avrdude settings
                    self.configAvrdudePath(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_path());
                    self.configAvrdudeConfigFile(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_conf());
                    self.configAvrdudeMcu(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_avrmcu());
                    self.configAvrdudeProgrammer(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_programmer());
                    self.configAvrdudeBaudRate(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_baudrate());
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_disableverify() != 'false') {
                        self.configAvrdudeDisableVerification(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_disableverify());
                    }
                    self.configAvrdudeCommandLine(self.settingsViewModel.settings.plugins.firmwareupdater.avrdude_commandline());
        
                    // Load the bossac settings
                    self.configBossacPath(self.settingsViewModel.settings.plugins.firmwareupdater.bossac_path());
                    self.configBossacDisableVerification(self.settingsViewModel.settings.plugins.firmwareupdater.bossac_disableverify());
                    self.configBossacCommandLine(self.settingsViewModel.settings.plugins.firmwareupdater.bossac_commandline());
                    
                    // Load the dfu-programmer settings
                    self.configDfuPath(self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_path());
                    self.configDfuMcu(self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_avrmcu());
                    self.configDfuCommandLine(self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_commandline());
                    self.configDfuEraseCommandLine(self.settingsViewModel.settings.plugins.firmwareupdater.dfuprog_erasecommandline());
                    
                    // Load the lpc1768 settings
                    self.configLpc1768Path(self.settingsViewModel.settings.plugins.firmwareupdater.lpc1768_path());
                    if(self.settingsViewModel.settings.plugins.firmwareupdater.lpc1768_preflashreset() != 'false') {
                        self.configLpc1768ResetBeforeFlash(self.settingsViewModel.settings.plugins.firmwareupdater.lpc1768_preflashreset());
                    }
        
                    // Load the stm32flash settings
                    self.configStm32flashPath(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_path());
                    self.configStm32flashVerify(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_verify());
                    self.configStm32flashBoot0Pin(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_boot0pin());
                    self.configStm32flashBoot0Low(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_boot0low());
                    self.configStm32flashResetPin(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_resetpin());
                    self.configStm32flashResetLow(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_resetlow());
                    self.configStm32flashExecute(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_execute());
                    self.configStm32flashExecuteAddress(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_executeaddress());
                    self.configStm32flashReset(self.settingsViewModel.settings.plugins.firmwareupdater.stm32flash_reset());
                    self.configurationDialog.modal();
                };
        
                self.onConfigClose = function() {
                    self._saveConfig();
        
                    self.configurationDialog.modal("hide");
                    self.alertMessage(undefined);
                    self.showAlert(false);
                };
        
                self._saveConfig = function() {
                    var data = {
                        plugins: {
                            firmwareupdater: {
                                flash_method: self.configFlashMethod(),
                                avrdude_path: self.configAvrdudePath(),
                                avrdude_conf: self.configAvrdudeConfigFile(),
                                avrdude_avrmcu: self.configAvrdudeMcu(),
                                avrdude_programmer: self.configAvrdudeProgrammer(),
                                avrdude_baudrate: self.configAvrdudeBaudRate(),
                                avrdude_disableverify: self.configAvrdudeDisableVerification(),
                                avrdude_commandline: self.configAvrdudeCommandLine(),
                                bossac_path: self.configBossacPath(),
                                bossac_disableverify: self.configBossacDisableVerification(),
                                bossac_commandline: self.configBossacCommandLine(),
                                dfuprog_path: self.configDfuPath(),
                                dfuprog_avrmcu: self.configDfuMcu(),
                                dfuprog_commandline: self.configDfuCommandLine(),
                                dfuprog_erasecommandline: self.configDfuEraseCommandLine(),
                                stm32flash_path : self.configStm32flashPath(),
                                stm32flash_verify: self.configStm32flashVerify(),
                                stm32flash_boot0pin : self.configStm32flashBoot0Pin(),
                                stm32flash_boot0low : self.configStm32flashBoot0Low(),
                                stm32flash_resetpin : self.configStm32flashResetPin(),
                                stm32flash_resetlow : self.configStm32flashResetLow(),
                                stm32flash_execute : self.configStm32flashExecute(),
                                stm32flash_executeaddress : self.configStm32flashExecuteAddress(),
                                stm32flash_reset: self.configStm32flashReset(),
                                lpc1768_path: self.configLpc1768Path(),
                                lpc1768_preflashreset: self.configLpc1768ResetBeforeFlash(),
                                enable_preflash_commandline: self.configEnablePreflashCommandline(),
                                preflash_commandline: self.configPreflashCommandline(),
                                enable_postflash_commandline: self.configEnablePostflashCommandline(),
                                postflash_commandline: self.configPostflashCommandline(),
                                postflash_delay: self.configPostflashDelay(),
                                postflash_gcode: self.configPostflashGcode(),
                                enable_postflash_delay: self.configEnablePostflashDelay(),
                                enable_postflash_gcode: self.configEnablePostflashGcode(),
                                disable_bootloadercheck: self.configDisableBootloaderCheck()
                            }
                        }
                    };
                    self.settingsViewModel.saveData(data);
                };
        
                self.onConfigHidden = function() {
                    self.avrdudePathBroken(false);
                    self.avrdudePathOk(false);
                    self.avrdudePathText("");
                    self.bossacPathBroken(false);
                    self.bossacPathOk(false);
                    self.bossacPathText("");
                };
        
                self.testAvrdudePath = function() {
                    var filePathRegEx_Linux = new RegExp("^(\/[^\0/]+)+$");
                    var filePathRegEx_Windows = new RegExp("^[A-z]\:\\\\.+.exe$");
        
                    if ( !filePathRegEx_Linux.test(self.configAvrdudePath()) && !filePathRegEx_Windows.test(self.configAvrdudePath()) ) {
                        self.avrdudePathText(gettext("The path is not valid"));
                        self.avrdudePathOk(false);
                        self.avrdudePathBroken(true);
                    } else {
                        $.ajax({
                            url: API_BASEURL + "util/test",
                            type: "POST",
                            dataType: "json",
                            data: JSON.stringify({
                                command: "path",
                                path: self.configAvrdudePath(),
                                check_type: "file",
                                check_access: "x"
                            }),
                            contentType: "application/json; charset=UTF-8",
                            success: function(response) {
                                if (!response.result) {
                                    if (!response.exists) {
                                        self.avrdudePathText(gettext("The path doesn't exist"));
                                    } else if (!response.typeok) {
                                        self.avrdudePathText(gettext("The path is not a file"));
                                    } else if (!response.access) {
                                        self.avrdudePathText(gettext("The path is not an executable"));
                                    }
                                } else {
                                    self.avrdudePathText(gettext("The path is valid"));
                                }
                                self.avrdudePathOk(response.result);
                                self.avrdudePathBroken(!response.result);
                            }
                        })
                    }
                };
        
                self.resetAvrdudeCommandLine = function() {
                    self.configAvrdudeCommandLine("{avrdude} -v -q -p {mcu} -c {programmer} -P {port} -D -C {conffile} -b {baudrate} {disableverify} -U flash:w:{firmware}:i");
                };
        
                self.testBossacPath = function() {
                    var filePathRegEx_Linux = new RegExp("^(\/[^\0/]+)+$");
                    var filePathRegEx_Windows = new RegExp("^[A-z]\:\\\\.+.exe$");
        
                    if ( !filePathRegEx_Linux.test(self.configBossacPath()) && !filePathRegEx_Windows.test(self.configBossacPath()) ) {
                        self.bossacPathText(gettext("The path is not valid"));
                        self.bossacPathOk(false);
                        self.bossacPathBroken(true);
                    } else {
                        $.ajax({
                            url: API_BASEURL + "util/test",
                            type: "POST",
                            dataType: "json",
                            data: JSON.stringify({
                                command: "path",
                                path: self.configBossacPath(),
                                check_type: "file",
                                check_access: "x"
                            }),
                            contentType: "application/json; charset=UTF-8",
                            success: function(response) {
                                if (!response.result) {
                                    if (!response.exists) {
                                        self.bossacPathText(gettext("The path doesn't exist"));
                                    } else if (!response.typeok) {
                                        self.bossacPathText(gettext("The path is not a file"));
                                    } else if (!response.access) {
                                        self.bossacPathText(gettext("The path is not an executable"));
                                    }
                                } else {
                                    self.bossacPathText(gettext("The path is valid"));
                                }
                                self.bossacPathOk(response.result);
                                self.bossacPathBroken(!response.result);
                            }
                        })
                    }
                };
        
                self.resetBossacCommandLine = function() {
                    self.configBossacCommandLine("{bossac} -i -p {port} -U true -e -w {disableverify} -b {firmware} -R");
                };
        
                self.testDfuPath = function() {
                    var filePathRegEx = new RegExp("^(\/[^\0/]+)+$");
        
                    if (!filePathRegEx.test(self.configDfuPath())) {
                        self.dfuPathText(gettext("The path is not valid"));
                        self.dfuPathOk(false);
                        self.dfuPathBroken(true);
                    } else {
                        $.ajax({
                            url: API_BASEURL + "util/test",
                            type: "POST",
                            dataType: "json",
                            data: JSON.stringify({
                                command: "path",
                                path: self.configDfuPath(),
                                check_type: "file",
                                check_access: "x"
                            }),
                            contentType: "application/json; charset=UTF-8",
                            success: function(response) {
                                if (!response.result) {
                                    if (!response.exists) {
                                        self.dfuPathText(gettext("The path doesn't exist"));
                                    } else if (!response.typeok) {
                                        self.dfuPathText(gettext("The path is not a file"));
                                    } else if (!response.access) {
                                        self.dfuPathText(gettext("The path is not an executable"));
                                    }
                                } else {
                                    self.dfuPathText(gettext("The path is valid"));
                                }
                                self.dfuPathOk(response.result);
                                self.dfuPathBroken(!response.result);
                            }
                        })
                    }
                };
        
                self.resetDfuCommandLine = function() {
                    self.configDfuCommandLine("sudo {dfuprogrammer} {mcu} flash {firmware} --debug-level 10 --force");
                };
        
                self.resetDfuEraseCommandLine = function() {
                    self.configDfuEraseCommandLine("sudo {dfuprogrammer} {mcu} erase --debug-level 10");
                };
        
                self.testStm32flashPath = function() {
                    var filePathRegEx = new RegExp("^(\/[^\0/]+)+$");
        
                    if (!filePathRegEx.test(self.configStm32flashPath())) {
                        self.stm32flashPathText(gettext("The path is not valid"));
                        self.stm32flashPathOk(false);
                        self.stm32flashPathBroken(true);
                    } else {
                        $.ajax({
                            url: API_BASEURL + "util/test",
                            type: "POST",
                            dataType: "json",
                            data: JSON.stringify({
                                command: "path",
                                path: self.configStm32flashPath(),
                                check_type: "file",
                                check_access: "x"
                            }),
                            contentType: "application/json; charset=UTF-8",
                            success: function(response) {
                                if (!response.result) {
                                    if (!response.exists) {
                                        self.stm32flashPathText(gettext("The path doesn't exist"));
                                    } else if (!response.typeok) {
                                        self.stm32flashPathText(gettext("The path is not a file"));
                                    } else if (!response.access) {
                                        self.stm32flashPathText(gettext("The path is not an executable"));
                                    }
                                } else {
                                    self.stm32flashPathText(gettext("The path is valid"));
                                }
                                self.stm32flashPathOk(response.result);
                                self.stm32flashPathBroken(!response.result);
                            }
                        })
                    }
                };
        
                self.testAvrdudeConf = function() {
                    $.ajax({
                        url: API_BASEURL + "util/test",
                        type: "POST",
                        dataType: "json",
                        data: JSON.stringify({
                            command: "path",
                            path: self.configAvrdudeConfigFile(),
                            check_type: "file",
                            check_access: "r"
                        }),
                        contentType: "application/json; charset=UTF-8",
                        success: function(response) {
                            if (!response.result) {
                                if (!response.exists) {
                                    self.avrdudeConfPathText(gettext("The path doesn't exist"));
                                } else if (!response.typeok) {
                                    self.avrdudeConfPathText(gettext("The path is not a file"));
                                } else if (!response.access) {
                                    self.avrdudeConfPathText(gettext("The path is not readable"));
                                }
                            } else {
                                self.avrdudeConfPathText(gettext("The path is valid"));
                            }
                            self.avrdudeConfPathOk(response.result);
                            self.avrdudeConfPathBroken(!response.result);
                        }
                    })
                };
        
                self.testLpc1768Path = function() {
                    $.ajax({
                        url: API_BASEURL + "util/test",
                        type: "POST",
                        dataType: "json",
                        data: JSON.stringify({
                            command: "path",
                            path: self.configLpc1768Path(),
                            check_type: "dir",
                            check_writable_dir: "true"
                        }),
                        contentType: "application/json; charset=UTF-8",
                        success: function(response) {
                            if (!response.result) {
                                if (!response.exists) {
                                    self.lpc1768PathText(gettext("The path doesn't exist"));
                                } else if (!response.typeok) {
                                    self.lpc1768PathText(gettext("The path is not a folder"));
                                } else if (!response.access) {
                                    self.lpc1768PathText(gettext("The path is not writeable"));
                                }
                            } else {
                                self.lpc1768PathText(gettext("The path is valid"));
                            }
                            self.lpc1768PathOk(response.result);
                            self.lpc1768PathBroken(!response.result);
                        }
                    })
                };
        
                self.onSettingsShown = function() {
                    self.inSettingsDialog = true;
                };
        
                self.onSettingsHidden = function() {
                    self.inSettingsDialog = false;
                    self.showAlert(false);
                };
        
                // Popup Messages
        
                self.showPopup = function(message_type, title, text){
                    if (self.popup !== undefined){
                        self.closePopup();
                    }
                    self.popup = new PNotify({
                        title: gettext(title),
                        text: text,
                        type: message_type,
                        hide: false
                    });
                };
        
                self.closePopup = function() {
                    if (self.popup !== undefined) {
                        self.popup.remove();
                    }
                };
            }
        
            OCTOPRINT_VIEWMODELS.push([
                FirmwareUpdaterViewModel,
                ["settingsViewModel", "loginStateViewModel", "connectionViewModel", "printerStateViewModel"],
                [document.getElementById("settings_plugin_firmwareupdater")]
            ]);
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin firmwareupdater:", (error.stack || error));
    }
})();

// JS assets for plugin octolapse
(function () {
    try {
        // source: plugin/octolapse/js/jquery.minicolors.min.js
        //
        // jQuery MiniColors: A tiny color picker built on jQuery
        //
        // Developed by Cory LaViska for A Beautiful Site, LLC
        //
        // Licensed under the MIT license: http://opensource.org/licenses/MIT
        //
        !function(i){"function"==typeof define&&define.amd?define(["jquery"],i):"object"==typeof exports?module.exports=i(require("jquery")):i(jQuery)}(function(i){"use strict";function t(t,o){var s,a,n,e,r,l,h=i('<div class="minicolors" />'),d=i.minicolors.defaults;if(!t.data("minicolors-initialized")){if(o=i.extend(!0,{},d,o),h.addClass("minicolors-theme-"+o.theme).toggleClass("minicolors-with-opacity",o.opacity),void 0!==o.position&&i.each(o.position.split(" "),function(){h.addClass("minicolors-position-"+this)}),a="rgb"===o.format?o.opacity?"25":"20":o.keywords?"11":"7",t.addClass("minicolors-input").data("minicolors-initialized",!1).data("minicolors-settings",o).prop("size",a).wrap(h).after('<div class="minicolors-panel minicolors-slider-'+o.control+'"><div class="minicolors-slider minicolors-sprite"><div class="minicolors-picker"></div></div><div class="minicolors-opacity-slider minicolors-sprite"><div class="minicolors-picker"></div></div><div class="minicolors-grid minicolors-sprite"><div class="minicolors-grid-inner"></div><div class="minicolors-picker"><div></div></div></div></div>'),o.inline||(t.after('<span class="minicolors-swatch minicolors-sprite minicolors-input-swatch"><span class="minicolors-swatch-color"></span></span>'),t.next(".minicolors-input-swatch").on("click",function(i){i.preventDefault(),t.focus()})),r=t.parent().find(".minicolors-panel"),r.on("selectstart",function(){return!1}).end(),o.swatches&&0!==o.swatches.length)for(r.addClass("minicolors-with-swatches"),n=i('<ul class="minicolors-swatches"></ul>').appendTo(r),l=0;l<o.swatches.length;++l)"object"===i.type(o.swatches[l])?(s=o.swatches[l].name,e=o.swatches[l].color):(s="",e=o.swatches[l]),e=v(e)?g(e,!0):I(u(e,!0)),i('<li class="minicolors-swatch minicolors-sprite"><span class="minicolors-swatch-color" title="'+s+'"></span></li>').appendTo(n).data("swatch-color",o.swatches[l]).find(".minicolors-swatch-color").css({backgroundColor:C(e),opacity:e.a}),o.swatches[l]=e;o.inline&&t.parent().addClass("minicolors-inline"),c(t,!1),t.data("minicolors-initialized",!0)}}function o(i){var t=i.parent();i.removeData("minicolors-initialized").removeData("minicolors-settings").removeProp("size").removeClass("minicolors-input"),t.before(i).remove()}function s(i){var t=i.parent(),o=t.find(".minicolors-panel"),s=i.data("minicolors-settings");!i.data("minicolors-initialized")||i.prop("disabled")||t.hasClass("minicolors-inline")||t.hasClass("minicolors-focus")||(a(),t.addClass("minicolors-focus"),o.stop(!0,!0).fadeIn(s.showSpeed,function(){s.show&&s.show.call(i.get(0))}))}function a(){i(".minicolors-focus").each(function(){var t=i(this),o=t.find(".minicolors-input"),s=t.find(".minicolors-panel"),a=o.data("minicolors-settings");s.fadeOut(a.hideSpeed,function(){a.hide&&a.hide.call(o.get(0)),t.removeClass("minicolors-focus")})})}function n(i,t,o){var s,a,n,r,c=i.parents(".minicolors").find(".minicolors-input"),l=c.data("minicolors-settings"),h=i.find("[class$=-picker]"),d=i.offset().left,p=i.offset().top,u=Math.round(t.pageX-d),g=Math.round(t.pageY-p),m=o?l.animationSpeed:0;t.originalEvent.changedTouches&&(u=t.originalEvent.changedTouches[0].pageX-d,g=t.originalEvent.changedTouches[0].pageY-p),u<0&&(u=0),g<0&&(g=0),u>i.width()&&(u=i.width()),g>i.height()&&(g=i.height()),i.parent().is(".minicolors-slider-wheel")&&h.parent().is(".minicolors-grid")&&(s=75-u,a=75-g,n=Math.sqrt(s*s+a*a),r=Math.atan2(a,s),r<0&&(r+=2*Math.PI),n>75&&(n=75,u=75-75*Math.cos(r),g=75-75*Math.sin(r)),u=Math.round(u),g=Math.round(g)),i.is(".minicolors-grid")?h.stop(!0).animate({top:g+"px",left:u+"px"},m,l.animationEasing,function(){e(c,i)}):h.stop(!0).animate({top:g+"px"},m,l.animationEasing,function(){e(c,i)})}function e(i,t){function o(i,t){var o,s;return i.length&&t?(o=i.offset().left,s=i.offset().top,{x:o-t.offset().left+i.outerWidth()/2,y:s-t.offset().top+i.outerHeight()/2}):null}var s,a,n,e,c,h,d,p=i.val(),u=i.attr("data-opacity"),g=i.parent(),m=i.data("minicolors-settings"),v=g.find(".minicolors-input-swatch"),b=g.find(".minicolors-grid"),w=g.find(".minicolors-slider"),y=g.find(".minicolors-opacity-slider"),C=b.find("[class$=-picker]"),M=w.find("[class$=-picker]"),x=y.find("[class$=-picker]"),I=o(C,b),S=o(M,w),z=o(x,y);if(t.is(".minicolors-grid, .minicolors-slider, .minicolors-opacity-slider")){switch(m.control){case"wheel":e=b.width()/2-I.x,c=b.height()/2-I.y,h=Math.sqrt(e*e+c*c),d=Math.atan2(c,e),d<0&&(d+=2*Math.PI),h>75&&(h=75,I.x=69-75*Math.cos(d),I.y=69-75*Math.sin(d)),a=f(h/.75,0,100),s=f(180*d/Math.PI,0,360),n=f(100-Math.floor(S.y*(100/w.height())),0,100),p=k({h:s,s:a,b:n}),w.css("backgroundColor",k({h:s,s:a,b:100}));break;case"saturation":s=f(parseInt(I.x*(360/b.width()),10),0,360),a=f(100-Math.floor(S.y*(100/w.height())),0,100),n=f(100-Math.floor(I.y*(100/b.height())),0,100),p=k({h:s,s:a,b:n}),w.css("backgroundColor",k({h:s,s:100,b:n})),g.find(".minicolors-grid-inner").css("opacity",a/100);break;case"brightness":s=f(parseInt(I.x*(360/b.width()),10),0,360),a=f(100-Math.floor(I.y*(100/b.height())),0,100),n=f(100-Math.floor(S.y*(100/w.height())),0,100),p=k({h:s,s:a,b:n}),w.css("backgroundColor",k({h:s,s:a,b:100})),g.find(".minicolors-grid-inner").css("opacity",1-n/100);break;default:s=f(360-parseInt(S.y*(360/w.height()),10),0,360),a=f(Math.floor(I.x*(100/b.width())),0,100),n=f(100-Math.floor(I.y*(100/b.height())),0,100),p=k({h:s,s:a,b:n}),b.css("backgroundColor",k({h:s,s:100,b:100}))}u=m.opacity?parseFloat(1-z.y/y.height()).toFixed(2):1,r(i,p,u)}else v.find("span").css({backgroundColor:p,opacity:u}),l(i,p,u)}function r(i,t,o){var s,a=i.parent(),n=i.data("minicolors-settings"),e=a.find(".minicolors-input-swatch");n.opacity&&i.attr("data-opacity",o),"rgb"===n.format?(s=v(t)?g(t,!0):I(u(t,!0)),o=""===i.attr("data-opacity")?1:f(parseFloat(i.attr("data-opacity")).toFixed(2),0,1),!isNaN(o)&&n.opacity||(o=1),t=i.minicolors("rgbObject").a<=1&&s&&n.opacity?"rgba("+s.r+", "+s.g+", "+s.b+", "+parseFloat(o)+")":"rgb("+s.r+", "+s.g+", "+s.b+")"):(v(t)&&(t=y(t)),t=p(t,n.letterCase)),i.val(t),e.find("span").css({backgroundColor:t,opacity:o}),l(i,t,o)}function c(t,o){var s,a,n,e,r,c,h,d,w,C,x=t.parent(),I=t.data("minicolors-settings"),S=x.find(".minicolors-input-swatch"),z=x.find(".minicolors-grid"),F=x.find(".minicolors-slider"),T=x.find(".minicolors-opacity-slider"),j=z.find("[class$=-picker]"),D=F.find("[class$=-picker]"),q=T.find("[class$=-picker]");switch(v(t.val())?(s=y(t.val()),r=f(parseFloat(b(t.val())).toFixed(2),0,1),r&&t.attr("data-opacity",r)):s=p(u(t.val(),!0),I.letterCase),s||(s=p(m(I.defaultValue,!0),I.letterCase)),a=M(s),e=I.keywords?i.map(I.keywords.split(","),function(t){return i.trim(t.toLowerCase())}):[],c=""!==t.val()&&i.inArray(t.val().toLowerCase(),e)>-1?p(t.val()):v(t.val())?g(t.val()):s,o||t.val(c),I.opacity&&(n=""===t.attr("data-opacity")?1:f(parseFloat(t.attr("data-opacity")).toFixed(2),0,1),isNaN(n)&&(n=1),t.attr("data-opacity",n),S.find("span").css("opacity",n),d=f(T.height()-T.height()*n,0,T.height()),q.css("top",d+"px")),"transparent"===t.val().toLowerCase()&&S.find("span").css("opacity",0),S.find("span").css("backgroundColor",s),I.control){case"wheel":w=f(Math.ceil(.75*a.s),0,z.height()/2),C=a.h*Math.PI/180,h=f(75-Math.cos(C)*w,0,z.width()),d=f(75-Math.sin(C)*w,0,z.height()),j.css({top:d+"px",left:h+"px"}),d=150-a.b/(100/z.height()),""===s&&(d=0),D.css("top",d+"px"),F.css("backgroundColor",k({h:a.h,s:a.s,b:100}));break;case"saturation":h=f(5*a.h/12,0,150),d=f(z.height()-Math.ceil(a.b/(100/z.height())),0,z.height()),j.css({top:d+"px",left:h+"px"}),d=f(F.height()-a.s*(F.height()/100),0,F.height()),D.css("top",d+"px"),F.css("backgroundColor",k({h:a.h,s:100,b:a.b})),x.find(".minicolors-grid-inner").css("opacity",a.s/100);break;case"brightness":h=f(5*a.h/12,0,150),d=f(z.height()-Math.ceil(a.s/(100/z.height())),0,z.height()),j.css({top:d+"px",left:h+"px"}),d=f(F.height()-a.b*(F.height()/100),0,F.height()),D.css("top",d+"px"),F.css("backgroundColor",k({h:a.h,s:a.s,b:100})),x.find(".minicolors-grid-inner").css("opacity",1-a.b/100);break;default:h=f(Math.ceil(a.s/(100/z.width())),0,z.width()),d=f(z.height()-Math.ceil(a.b/(100/z.height())),0,z.height()),j.css({top:d+"px",left:h+"px"}),d=f(F.height()-a.h/(360/F.height()),0,F.height()),D.css("top",d+"px"),z.css("backgroundColor",k({h:a.h,s:100,b:100}))}t.data("minicolors-initialized")&&l(t,c,n)}function l(i,t,o){var s,a,n,e=i.data("minicolors-settings"),r=i.data("minicolors-lastChange");if(!r||r.value!==t||r.opacity!==o){if(i.data("minicolors-lastChange",{value:t,opacity:o}),e.swatches&&0!==e.swatches.length){for(s=v(t)?g(t,!0):I(t),a=-1,n=0;n<e.swatches.length;++n)if(s.r===e.swatches[n].r&&s.g===e.swatches[n].g&&s.b===e.swatches[n].b&&s.a===e.swatches[n].a){a=n;break}i.parent().find(".minicolors-swatches .minicolors-swatch").removeClass("selected"),a!==-1&&i.parent().find(".minicolors-swatches .minicolors-swatch").eq(n).addClass("selected")}e.change&&(e.changeDelay?(clearTimeout(i.data("minicolors-changeTimeout")),i.data("minicolors-changeTimeout",setTimeout(function(){e.change.call(i.get(0),t,o)},e.changeDelay))):e.change.call(i.get(0),t,o)),i.trigger("change").trigger("input")}}function h(t){var o,s=i(t).attr("data-opacity");if(v(i(t).val()))o=g(i(t).val(),!0);else{var a=u(i(t).val(),!0);o=I(a)}return o?(void 0!==s&&i.extend(o,{a:parseFloat(s)}),o):null}function d(t,o){var s,a=i(t).attr("data-opacity");if(v(i(t).val()))s=g(i(t).val(),!0);else{var n=u(i(t).val(),!0);s=I(n)}return s?(void 0===a&&(a=1),o?"rgba("+s.r+", "+s.g+", "+s.b+", "+parseFloat(a)+")":"rgb("+s.r+", "+s.g+", "+s.b+")"):null}function p(i,t){return"uppercase"===t?i.toUpperCase():i.toLowerCase()}function u(i,t){return i=i.replace(/^#/g,""),i.match(/^[A-F0-9]{3,6}/gi)?3!==i.length&&6!==i.length?"":(3===i.length&&t&&(i=i[0]+i[0]+i[1]+i[1]+i[2]+i[2]),"#"+i):""}function g(i,t){var o=i.replace(/[^\d,.]/g,""),s=o.split(",");return s[0]=f(parseInt(s[0],10),0,255),s[1]=f(parseInt(s[1],10),0,255),s[2]=f(parseInt(s[2],10),0,255),s[3]&&(s[3]=f(parseFloat(s[3],10),0,1)),t?s[3]?{r:s[0],g:s[1],b:s[2],a:s[3]}:{r:s[0],g:s[1],b:s[2]}:"undefined"!=typeof s[3]&&s[3]<=1?"rgba("+s[0]+", "+s[1]+", "+s[2]+", "+s[3]+")":"rgb("+s[0]+", "+s[1]+", "+s[2]+")"}function m(i,t){return v(i)?g(i):u(i,t)}function f(i,t,o){return i<t&&(i=t),i>o&&(i=o),i}function v(i){var t=i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i);return!(!t||4!==t.length)}function b(i){return i=i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+(\.\d{1,2})?|\.\d{1,2})[\s+]?/i),i&&6===i.length?i[4]:"1"}function w(i){var t={},o=Math.round(i.h),s=Math.round(255*i.s/100),a=Math.round(255*i.b/100);if(0===s)t.r=t.g=t.b=a;else{var n=a,e=(255-s)*a/255,r=(n-e)*(o%60)/60;360===o&&(o=0),o<60?(t.r=n,t.b=e,t.g=e+r):o<120?(t.g=n,t.b=e,t.r=n-r):o<180?(t.g=n,t.r=e,t.b=e+r):o<240?(t.b=n,t.r=e,t.g=n-r):o<300?(t.b=n,t.g=e,t.r=e+r):o<360?(t.r=n,t.g=e,t.b=n-r):(t.r=0,t.g=0,t.b=0)}return{r:Math.round(t.r),g:Math.round(t.g),b:Math.round(t.b)}}function y(i){return i=i.match(/^rgba?[\s+]?\([\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?,[\s+]?(\d+)[\s+]?/i),i&&4===i.length?"#"+("0"+parseInt(i[1],10).toString(16)).slice(-2)+("0"+parseInt(i[2],10).toString(16)).slice(-2)+("0"+parseInt(i[3],10).toString(16)).slice(-2):""}function C(t){var o=[t.r.toString(16),t.g.toString(16),t.b.toString(16)];return i.each(o,function(i,t){1===t.length&&(o[i]="0"+t)}),"#"+o.join("")}function k(i){return C(w(i))}function M(i){var t=x(I(i));return 0===t.s&&(t.h=360),t}function x(i){var t={h:0,s:0,b:0},o=Math.min(i.r,i.g,i.b),s=Math.max(i.r,i.g,i.b),a=s-o;return t.b=s,t.s=0!==s?255*a/s:0,0!==t.s?i.r===s?t.h=(i.g-i.b)/a:i.g===s?t.h=2+(i.b-i.r)/a:t.h=4+(i.r-i.g)/a:t.h=-1,t.h*=60,t.h<0&&(t.h+=360),t.s*=100/255,t.b*=100/255,t}function I(i){return i=parseInt(i.indexOf("#")>-1?i.substring(1):i,16),{r:i>>16,g:(65280&i)>>8,b:255&i}}i.minicolors={defaults:{animationSpeed:50,animationEasing:"swing",change:null,changeDelay:0,control:"hue",defaultValue:"",format:"hex",hide:null,hideSpeed:100,inline:!1,keywords:"",letterCase:"lowercase",opacity:!1,position:"bottom",show:null,showSpeed:100,theme:"default",swatches:[]}},i.extend(i.fn,{minicolors:function(n,e){switch(n){case"destroy":return i(this).each(function(){o(i(this))}),i(this);case"hide":return a(),i(this);case"opacity":return void 0===e?i(this).attr("data-opacity"):(i(this).each(function(){c(i(this).attr("data-opacity",e))}),i(this));case"rgbObject":return h(i(this),"rgbaObject"===n);case"rgbString":case"rgbaString":return d(i(this),"rgbaString"===n);case"settings":return void 0===e?i(this).data("minicolors-settings"):(i(this).each(function(){var t=i(this).data("minicolors-settings")||{};o(i(this)),i(this).minicolors(i.extend(!0,t,e))}),i(this));case"show":return s(i(this).eq(0)),i(this);case"value":return void 0===e?i(this).val():(i(this).each(function(){"object"==typeof e&&null!==e?(void 0!==e.opacity&&i(this).attr("data-opacity",f(e.opacity,0,1)),e.color&&i(this).val(e.color)):i(this).val(e),c(i(this))}),i(this));default:return"create"!==n&&(e=n),i(this).each(function(){t(i(this),e)}),i(this)}}}),i([document]).on("mousedown.minicolors touchstart.minicolors",function(t){i(t.target).parents().add(t.target).hasClass("minicolors")||a()}).on("mousedown.minicolors touchstart.minicolors",".minicolors-grid, .minicolors-slider, .minicolors-opacity-slider",function(t){var o=i(this);t.preventDefault(),i(t.delegateTarget).data("minicolors-target",o),n(o,t,!0)}).on("mousemove.minicolors touchmove.minicolors",function(t){var o=i(t.delegateTarget).data("minicolors-target");o&&n(o,t)}).on("mouseup.minicolors touchend.minicolors",function(){i(this).removeData("minicolors-target")}).on("click.minicolors",".minicolors-swatches li",function(t){t.preventDefault();var o=i(this),s=o.parents(".minicolors").find(".minicolors-input"),a=o.data("swatch-color");r(s,a,b(a)),c(s)}).on("mousedown.minicolors touchstart.minicolors",".minicolors-input-swatch",function(t){var o=i(this).parent().find(".minicolors-input");t.preventDefault(),s(o)}).on("focus.minicolors",".minicolors-input",function(){var t=i(this);t.data("minicolors-initialized")&&s(t)}).on("blur.minicolors",".minicolors-input",function(){var t,o,s,a,n,e=i(this),r=e.data("minicolors-settings");e.data("minicolors-initialized")&&(t=r.keywords?i.map(r.keywords.split(","),function(t){return i.trim(t.toLowerCase())}):[],""!==e.val()&&i.inArray(e.val().toLowerCase(),t)>-1?n=e.val():(v(e.val())?s=g(e.val(),!0):(o=u(e.val(),!0),s=o?I(o):null),n=null===s?r.defaultValue:"rgb"===r.format?g(r.opacity?"rgba("+s.r+","+s.g+","+s.b+","+e.attr("data-opacity")+")":"rgb("+s.r+","+s.g+","+s.b+")"):C(s)),a=r.opacity?e.attr("data-opacity"):1,"transparent"===n.toLowerCase()&&(a=0),e.closest(".minicolors").find(".minicolors-input-swatch > span").css("opacity",a),e.val(n),""===e.val()&&e.val(m(r.defaultValue,!0)),e.val(p(e.val(),r.letterCase)))}).on("keydown.minicolors",".minicolors-input",function(t){var o=i(this);if(o.data("minicolors-initialized"))switch(t.which){case 9:a();break;case 13:case 27:a(),o.blur()}}).on("keyup.minicolors",".minicolors-input",function(){var t=i(this);t.data("minicolors-initialized")&&c(t,!0)}).on("paste.minicolors",".minicolors-input",function(){var t=i(this);t.data("minicolors-initialized")&&setTimeout(function(){c(t,!0)},1)})});
        
        ;
        
        // source: plugin/octolapse/js/jquery.validate.min.js
        /*! jQuery Validation Plugin - v1.17.0 - 7/29/2017
         * https://jqueryvalidation.org/
         * Copyright (c) 2017 Jörn Zaefferer; Licensed MIT */
        !function(a){"function"==typeof define&&define.amd?define(["jquery"],a):"object"==typeof module&&module.exports?module.exports=a(require("jquery")):a(jQuery)}(function(a){a.extend(a.fn,{validate:function(b){if(!this.length)return void(b&&b.debug&&window.console&&console.warn("Nothing selected, can't validate, returning nothing."));var c=a.data(this[0],"validator");return c?c:(this.attr("novalidate","novalidate"),c=new a.validator(b,this[0]),a.data(this[0],"validator",c),c.settings.onsubmit&&(this.on("click.validate",":submit",function(b){c.submitButton=b.currentTarget,a(this).hasClass("cancel")&&(c.cancelSubmit=!0),void 0!==a(this).attr("formnovalidate")&&(c.cancelSubmit=!0)}),this.on("submit.validate",function(b){function d(){var d,e;return c.submitButton&&(c.settings.submitHandler||c.formSubmitted)&&(d=a("<input type='hidden'/>").attr("name",c.submitButton.name).val(a(c.submitButton).val()).appendTo(c.currentForm)),!c.settings.submitHandler||(e=c.settings.submitHandler.call(c,c.currentForm,b),d&&d.remove(),void 0!==e&&e)}return c.settings.debug&&b.preventDefault(),c.cancelSubmit?(c.cancelSubmit=!1,d()):c.form()?c.pendingRequest?(c.formSubmitted=!0,!1):d():(c.focusInvalid(),!1)})),c)},valid:function(){var b,c,d;return a(this[0]).is("form")?b=this.validate().form():(d=[],b=!0,c=a(this[0].form).validate(),this.each(function(){b=c.element(this)&&b,b||(d=d.concat(c.errorList))}),c.errorList=d),b},rules:function(b,c){var d,e,f,g,h,i,j=this[0];if(null!=j&&(!j.form&&j.hasAttribute("contenteditable")&&(j.form=this.closest("form")[0],j.name=this.attr("name")),null!=j.form)){if(b)switch(d=a.data(j.form,"validator").settings,e=d.rules,f=a.validator.staticRules(j),b){case"add":a.extend(f,a.validator.normalizeRule(c)),delete f.messages,e[j.name]=f,c.messages&&(d.messages[j.name]=a.extend(d.messages[j.name],c.messages));break;case"remove":return c?(i={},a.each(c.split(/\s/),function(a,b){i[b]=f[b],delete f[b]}),i):(delete e[j.name],f)}return g=a.validator.normalizeRules(a.extend({},a.validator.classRules(j),a.validator.attributeRules(j),a.validator.dataRules(j),a.validator.staticRules(j)),j),g.required&&(h=g.required,delete g.required,g=a.extend({required:h},g)),g.remote&&(h=g.remote,delete g.remote,g=a.extend(g,{remote:h})),g}}}),a.extend(a.expr.pseudos||a.expr[":"],{blank:function(b){return!a.trim(""+a(b).val())},filled:function(b){var c=a(b).val();return null!==c&&!!a.trim(""+c)},unchecked:function(b){return!a(b).prop("checked")}}),a.validator=function(b,c){this.settings=a.extend(!0,{},a.validator.defaults,b),this.currentForm=c,this.init()},a.validator.format=function(b,c){return 1===arguments.length?function(){var c=a.makeArray(arguments);return c.unshift(b),a.validator.format.apply(this,c)}:void 0===c?b:(arguments.length>2&&c.constructor!==Array&&(c=a.makeArray(arguments).slice(1)),c.constructor!==Array&&(c=[c]),a.each(c,function(a,c){b=b.replace(new RegExp("\\{"+a+"\\}","g"),function(){return c})}),b)},a.extend(a.validator,{defaults:{messages:{},groups:{},rules:{},errorClass:"error",pendingClass:"pending",validClass:"valid",errorElement:"label",focusCleanup:!1,focusInvalid:!0,errorContainer:a([]),errorLabelContainer:a([]),onsubmit:!0,ignore:":hidden",ignoreTitle:!1,onfocusin:function(a){this.lastActive=a,this.settings.focusCleanup&&(this.settings.unhighlight&&this.settings.unhighlight.call(this,a,this.settings.errorClass,this.settings.validClass),this.hideThese(this.errorsFor(a)))},onfocusout:function(a){this.checkable(a)||!(a.name in this.submitted)&&this.optional(a)||this.element(a)},onkeyup:function(b,c){var d=[16,17,18,20,35,36,37,38,39,40,45,144,225];9===c.which&&""===this.elementValue(b)||a.inArray(c.keyCode,d)!==-1||(b.name in this.submitted||b.name in this.invalid)&&this.element(b)},onclick:function(a){a.name in this.submitted?this.element(a):a.parentNode.name in this.submitted&&this.element(a.parentNode)},highlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).addClass(c).removeClass(d):a(b).addClass(c).removeClass(d)},unhighlight:function(b,c,d){"radio"===b.type?this.findByName(b.name).removeClass(c).addClass(d):a(b).removeClass(c).addClass(d)}},setDefaults:function(b){a.extend(a.validator.defaults,b)},messages:{required:"This field is required.",remote:"Please fix this field.",email:"Please enter a valid email address.",url:"Please enter a valid URL.",date:"Please enter a valid date.",dateISO:"Please enter a valid date (ISO).",number:"Please enter a valid number.",digits:"Please enter only digits.",equalTo:"Please enter the same value again.",maxlength:a.validator.format("Please enter no more than {0} characters."),minlength:a.validator.format("Please enter at least {0} characters."),rangelength:a.validator.format("Please enter a value between {0} and {1} characters long."),range:a.validator.format("Please enter a value between {0} and {1}."),max:a.validator.format("Please enter a value less than or equal to {0}."),min:a.validator.format("Please enter a value greater than or equal to {0}."),step:a.validator.format("Please enter a multiple of {0}.")},autoCreateRanges:!1,prototype:{init:function(){function b(b){!this.form&&this.hasAttribute("contenteditable")&&(this.form=a(this).closest("form")[0],this.name=a(this).attr("name"));var c=a.data(this.form,"validator"),d="on"+b.type.replace(/^validate/,""),e=c.settings;e[d]&&!a(this).is(e.ignore)&&e[d].call(c,this,b)}this.labelContainer=a(this.settings.errorLabelContainer),this.errorContext=this.labelContainer.length&&this.labelContainer||a(this.currentForm),this.containers=a(this.settings.errorContainer).add(this.settings.errorLabelContainer),this.submitted={},this.valueCache={},this.pendingRequest=0,this.pending={},this.invalid={},this.reset();var c,d=this.groups={};a.each(this.settings.groups,function(b,c){"string"==typeof c&&(c=c.split(/\s/)),a.each(c,function(a,c){d[c]=b})}),c=this.settings.rules,a.each(c,function(b,d){c[b]=a.validator.normalizeRule(d)}),a(this.currentForm).on("focusin.validate focusout.validate keyup.validate",":text, [type='password'], [type='file'], select, textarea, [type='number'], [type='search'], [type='tel'], [type='url'], [type='email'], [type='datetime'], [type='date'], [type='month'], [type='week'], [type='time'], [type='datetime-local'], [type='range'], [type='color'], [type='radio'], [type='checkbox'], [contenteditable], [type='button']",b).on("click.validate","select, option, [type='radio'], [type='checkbox']",b),this.settings.invalidHandler&&a(this.currentForm).on("invalid-form.validate",this.settings.invalidHandler)},form:function(){return this.checkForm(),a.extend(this.submitted,this.errorMap),this.invalid=a.extend({},this.errorMap),this.valid()||a(this.currentForm).triggerHandler("invalid-form",[this]),this.showErrors(),this.valid()},checkForm:function(){this.prepareForm();for(var a=0,b=this.currentElements=this.elements();b[a];a++)this.check(b[a]);return this.valid()},element:function(b){var c,d,e=this.clean(b),f=this.validationTargetFor(e),g=this,h=!0;return void 0===f?delete this.invalid[e.name]:(this.prepareElement(f),this.currentElements=a(f),d=this.groups[f.name],d&&a.each(this.groups,function(a,b){b===d&&a!==f.name&&(e=g.validationTargetFor(g.clean(g.findByName(a))),e&&e.name in g.invalid&&(g.currentElements.push(e),h=g.check(e)&&h))}),c=this.check(f)!==!1,h=h&&c,c?this.invalid[f.name]=!1:this.invalid[f.name]=!0,this.numberOfInvalids()||(this.toHide=this.toHide.add(this.containers)),this.showErrors(),a(b).attr("aria-invalid",!c)),h},showErrors:function(b){if(b){var c=this;a.extend(this.errorMap,b),this.errorList=a.map(this.errorMap,function(a,b){return{message:a,element:c.findByName(b)[0]}}),this.successList=a.grep(this.successList,function(a){return!(a.name in b)})}this.settings.showErrors?this.settings.showErrors.call(this,this.errorMap,this.errorList):this.defaultShowErrors()},resetForm:function(){a.fn.resetForm&&a(this.currentForm).resetForm(),this.invalid={},this.submitted={},this.prepareForm(),this.hideErrors();var b=this.elements().removeData("previousValue").removeAttr("aria-invalid");this.resetElements(b)},resetElements:function(a){var b;if(this.settings.unhighlight)for(b=0;a[b];b++)this.settings.unhighlight.call(this,a[b],this.settings.errorClass,""),this.findByName(a[b].name).removeClass(this.settings.validClass);else a.removeClass(this.settings.errorClass).removeClass(this.settings.validClass)},numberOfInvalids:function(){return this.objectLength(this.invalid)},objectLength:function(a){var b,c=0;for(b in a)void 0!==a[b]&&null!==a[b]&&a[b]!==!1&&c++;return c},hideErrors:function(){this.hideThese(this.toHide)},hideThese:function(a){a.not(this.containers).text(""),this.addWrapper(a).hide()},valid:function(){return 0===this.size()},size:function(){return this.errorList.length},focusInvalid:function(){if(this.settings.focusInvalid)try{a(this.findLastActive()||this.errorList.length&&this.errorList[0].element||[]).filter(":visible").focus().trigger("focusin")}catch(b){}},findLastActive:function(){var b=this.lastActive;return b&&1===a.grep(this.errorList,function(a){return a.element.name===b.name}).length&&b},elements:function(){var b=this,c={};return a(this.currentForm).find("input, select, textarea, [contenteditable]").not(":submit, :reset, :image, :disabled").not(this.settings.ignore).filter(function(){var d=this.name||a(this).attr("name");return!d&&b.settings.debug&&window.console&&console.error("%o has no name assigned",this),this.hasAttribute("contenteditable")&&(this.form=a(this).closest("form")[0],this.name=d),!(d in c||!b.objectLength(a(this).rules()))&&(c[d]=!0,!0)})},clean:function(b){return a(b)[0]},errors:function(){var b=this.settings.errorClass.split(" ").join(".");return a(this.settings.errorElement+"."+b,this.errorContext)},resetInternals:function(){this.successList=[],this.errorList=[],this.errorMap={},this.toShow=a([]),this.toHide=a([])},reset:function(){this.resetInternals(),this.currentElements=a([])},prepareForm:function(){this.reset(),this.toHide=this.errors().add(this.containers)},prepareElement:function(a){this.reset(),this.toHide=this.errorsFor(a)},elementValue:function(b){var c,d,e=a(b),f=b.type;return"radio"===f||"checkbox"===f?this.findByName(b.name).filter(":checked").val():"number"===f&&"undefined"!=typeof b.validity?b.validity.badInput?"NaN":e.val():(c=b.hasAttribute("contenteditable")?e.text():e.val(),"file"===f?"C:\\fakepath\\"===c.substr(0,12)?c.substr(12):(d=c.lastIndexOf("/"),d>=0?c.substr(d+1):(d=c.lastIndexOf("\\"),d>=0?c.substr(d+1):c)):"string"==typeof c?c.replace(/\r/g,""):c)},check:function(b){b=this.validationTargetFor(this.clean(b));var c,d,e,f,g=a(b).rules(),h=a.map(g,function(a,b){return b}).length,i=!1,j=this.elementValue(b);if("function"==typeof g.normalizer?f=g.normalizer:"function"==typeof this.settings.normalizer&&(f=this.settings.normalizer),f){if(j=f.call(b,j),"string"!=typeof j)throw new TypeError("The normalizer should return a string value.");delete g.normalizer}for(d in g){e={method:d,parameters:g[d]};try{if(c=a.validator.methods[d].call(this,j,b,e.parameters),"dependency-mismatch"===c&&1===h){i=!0;continue}if(i=!1,"pending"===c)return void(this.toHide=this.toHide.not(this.errorsFor(b)));if(!c)return this.formatAndAdd(b,e),!1}catch(k){throw this.settings.debug&&window.console&&console.log("Exception occurred when checking element "+b.id+", check the '"+e.method+"' method.",k),k instanceof TypeError&&(k.message+=".  Exception occurred when checking element "+b.id+", check the '"+e.method+"' method."),k}}if(!i)return this.objectLength(g)&&this.successList.push(b),!0},customDataMessage:function(b,c){return a(b).data("msg"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase())||a(b).data("msg")},customMessage:function(a,b){var c=this.settings.messages[a];return c&&(c.constructor===String?c:c[b])},findDefined:function(){for(var a=0;a<arguments.length;a++)if(void 0!==arguments[a])return arguments[a]},defaultMessage:function(b,c){"string"==typeof c&&(c={method:c});var d=this.findDefined(this.customMessage(b.name,c.method),this.customDataMessage(b,c.method),!this.settings.ignoreTitle&&b.title||void 0,a.validator.messages[c.method],"<strong>Warning: No message defined for "+b.name+"</strong>"),e=/\$?\{(\d+)\}/g;return"function"==typeof d?d=d.call(this,c.parameters,b):e.test(d)&&(d=a.validator.format(d.replace(e,"{$1}"),c.parameters)),d},formatAndAdd:function(a,b){var c=this.defaultMessage(a,b);this.errorList.push({message:c,element:a,method:b.method}),this.errorMap[a.name]=c,this.submitted[a.name]=c},addWrapper:function(a){return this.settings.wrapper&&(a=a.add(a.parent(this.settings.wrapper))),a},defaultShowErrors:function(){var a,b,c;for(a=0;this.errorList[a];a++)c=this.errorList[a],this.settings.highlight&&this.settings.highlight.call(this,c.element,this.settings.errorClass,this.settings.validClass),this.showLabel(c.element,c.message);if(this.errorList.length&&(this.toShow=this.toShow.add(this.containers)),this.settings.success)for(a=0;this.successList[a];a++)this.showLabel(this.successList[a]);if(this.settings.unhighlight)for(a=0,b=this.validElements();b[a];a++)this.settings.unhighlight.call(this,b[a],this.settings.errorClass,this.settings.validClass);this.toHide=this.toHide.not(this.toShow),this.hideErrors(),this.addWrapper(this.toShow).show()},validElements:function(){return this.currentElements.not(this.invalidElements())},invalidElements:function(){return a(this.errorList).map(function(){return this.element})},showLabel:function(b,c){var d,e,f,g,h=this.errorsFor(b),i=this.idOrName(b),j=a(b).attr("aria-describedby");h.length?(h.removeClass(this.settings.validClass).addClass(this.settings.errorClass),h.html(c)):(h=a("<"+this.settings.errorElement+">").attr("id",i+"-error").addClass(this.settings.errorClass).html(c||""),d=h,this.settings.wrapper&&(d=h.hide().show().wrap("<"+this.settings.wrapper+"/>").parent()),this.labelContainer.length?this.labelContainer.append(d):this.settings.errorPlacement?this.settings.errorPlacement.call(this,d,a(b)):d.insertAfter(b),h.is("label")?h.attr("for",i):0===h.parents("label[for='"+this.escapeCssMeta(i)+"']").length&&(f=h.attr("id"),j?j.match(new RegExp("\\b"+this.escapeCssMeta(f)+"\\b"))||(j+=" "+f):j=f,a(b).attr("aria-describedby",j),e=this.groups[b.name],e&&(g=this,a.each(g.groups,function(b,c){c===e&&a("[name='"+g.escapeCssMeta(b)+"']",g.currentForm).attr("aria-describedby",h.attr("id"))})))),!c&&this.settings.success&&(h.text(""),"string"==typeof this.settings.success?h.addClass(this.settings.success):this.settings.success(h,b)),this.toShow=this.toShow.add(h)},errorsFor:function(b){var c=this.escapeCssMeta(this.idOrName(b)),d=a(b).attr("aria-describedby"),e="label[for='"+c+"'], label[for='"+c+"'] *";return d&&(e=e+", #"+this.escapeCssMeta(d).replace(/\s+/g,", #")),this.errors().filter(e)},escapeCssMeta:function(a){return a.replace(/([\\!"#$%&'()*+,.\/:;<=>?@\[\]^`{|}~])/g,"\\$1")},idOrName:function(a){return this.groups[a.name]||(this.checkable(a)?a.name:a.id||a.name)},validationTargetFor:function(b){return this.checkable(b)&&(b=this.findByName(b.name)),a(b).not(this.settings.ignore)[0]},checkable:function(a){return/radio|checkbox/i.test(a.type)},findByName:function(b){return a(this.currentForm).find("[name='"+this.escapeCssMeta(b)+"']")},getLength:function(b,c){switch(c.nodeName.toLowerCase()){case"select":return a("option:selected",c).length;case"input":if(this.checkable(c))return this.findByName(c.name).filter(":checked").length}return b.length},depend:function(a,b){return!this.dependTypes[typeof a]||this.dependTypes[typeof a](a,b)},dependTypes:{"boolean":function(a){return a},string:function(b,c){return!!a(b,c.form).length},"function":function(a,b){return a(b)}},optional:function(b){var c=this.elementValue(b);return!a.validator.methods.required.call(this,c,b)&&"dependency-mismatch"},startRequest:function(b){this.pending[b.name]||(this.pendingRequest++,a(b).addClass(this.settings.pendingClass),this.pending[b.name]=!0)},stopRequest:function(b,c){this.pendingRequest--,this.pendingRequest<0&&(this.pendingRequest=0),delete this.pending[b.name],a(b).removeClass(this.settings.pendingClass),c&&0===this.pendingRequest&&this.formSubmitted&&this.form()?(a(this.currentForm).submit(),this.submitButton&&a("input:hidden[name='"+this.submitButton.name+"']",this.currentForm).remove(),this.formSubmitted=!1):!c&&0===this.pendingRequest&&this.formSubmitted&&(a(this.currentForm).triggerHandler("invalid-form",[this]),this.formSubmitted=!1)},previousValue:function(b,c){return c="string"==typeof c&&c||"remote",a.data(b,"previousValue")||a.data(b,"previousValue",{old:null,valid:!0,message:this.defaultMessage(b,{method:c})})},destroy:function(){this.resetForm(),a(this.currentForm).off(".validate").removeData("validator").find(".validate-equalTo-blur").off(".validate-equalTo").removeClass("validate-equalTo-blur")}},classRuleSettings:{required:{required:!0},email:{email:!0},url:{url:!0},date:{date:!0},dateISO:{dateISO:!0},number:{number:!0},digits:{digits:!0},creditcard:{creditcard:!0}},addClassRules:function(b,c){b.constructor===String?this.classRuleSettings[b]=c:a.extend(this.classRuleSettings,b)},classRules:function(b){var c={},d=a(b).attr("class");return d&&a.each(d.split(" "),function(){this in a.validator.classRuleSettings&&a.extend(c,a.validator.classRuleSettings[this])}),c},normalizeAttributeRule:function(a,b,c,d){/min|max|step/.test(c)&&(null===b||/number|range|text/.test(b))&&(d=Number(d),isNaN(d)&&(d=void 0)),d||0===d?a[c]=d:b===c&&"range"!==b&&(a[c]=!0)},attributeRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)"required"===c?(d=b.getAttribute(c),""===d&&(d=!0),d=!!d):d=f.attr(c),this.normalizeAttributeRule(e,g,c,d);return e.maxlength&&/-1|2147483647|524288/.test(e.maxlength)&&delete e.maxlength,e},dataRules:function(b){var c,d,e={},f=a(b),g=b.getAttribute("type");for(c in a.validator.methods)d=f.data("rule"+c.charAt(0).toUpperCase()+c.substring(1).toLowerCase()),this.normalizeAttributeRule(e,g,c,d);return e},staticRules:function(b){var c={},d=a.data(b.form,"validator");return d.settings.rules&&(c=a.validator.normalizeRule(d.settings.rules[b.name])||{}),c},normalizeRules:function(b,c){return a.each(b,function(d,e){if(e===!1)return void delete b[d];if(e.param||e.depends){var f=!0;switch(typeof e.depends){case"string":f=!!a(e.depends,c.form).length;break;case"function":f=e.depends.call(c,c)}f?b[d]=void 0===e.param||e.param:(a.data(c.form,"validator").resetElements(a(c)),delete b[d])}}),a.each(b,function(d,e){b[d]=a.isFunction(e)&&"normalizer"!==d?e(c):e}),a.each(["minlength","maxlength"],function(){b[this]&&(b[this]=Number(b[this]))}),a.each(["rangelength","range"],function(){var c;b[this]&&(a.isArray(b[this])?b[this]=[Number(b[this][0]),Number(b[this][1])]:"string"==typeof b[this]&&(c=b[this].replace(/[\[\]]/g,"").split(/[\s,]+/),b[this]=[Number(c[0]),Number(c[1])]))}),a.validator.autoCreateRanges&&(null!=b.min&&null!=b.max&&(b.range=[b.min,b.max],delete b.min,delete b.max),null!=b.minlength&&null!=b.maxlength&&(b.rangelength=[b.minlength,b.maxlength],delete b.minlength,delete b.maxlength)),b},normalizeRule:function(b){if("string"==typeof b){var c={};a.each(b.split(/\s/),function(){c[this]=!0}),b=c}return b},addMethod:function(b,c,d){a.validator.methods[b]=c,a.validator.messages[b]=void 0!==d?d:a.validator.messages[b],c.length<3&&a.validator.addClassRules(b,a.validator.normalizeRule(b))},methods:{required:function(b,c,d){if(!this.depend(d,c))return"dependency-mismatch";if("select"===c.nodeName.toLowerCase()){var e=a(c).val();return e&&e.length>0}return this.checkable(c)?this.getLength(b,c)>0:b.length>0},email:function(a,b){return this.optional(b)||/^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/.test(a)},url:function(a,b){return this.optional(b)||/^(?:(?:(?:https?|ftp):)?\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})).?)(?::\d{2,5})?(?:[\/?#]\S*)?$/i.test(a)},date:function(a,b){return this.optional(b)||!/Invalid|NaN/.test(new Date(a).toString())},dateISO:function(a,b){return this.optional(b)||/^\d{4}[\/\-](0?[1-9]|1[012])[\/\-](0?[1-9]|[12][0-9]|3[01])$/.test(a)},number:function(a,b){return this.optional(b)||/^(?:-?\d+|-?\d{1,3}(?:,\d{3})+)?(?:\.\d+)?$/.test(a)},digits:function(a,b){return this.optional(b)||/^\d+$/.test(a)},minlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d},maxlength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e<=d},rangelength:function(b,c,d){var e=a.isArray(b)?b.length:this.getLength(b,c);return this.optional(c)||e>=d[0]&&e<=d[1]},min:function(a,b,c){return this.optional(b)||a>=c},max:function(a,b,c){return this.optional(b)||a<=c},range:function(a,b,c){return this.optional(b)||a>=c[0]&&a<=c[1]},step:function(b,c,d){var e,f=a(c).attr("type"),g="Step attribute on input type "+f+" is not supported.",h=["text","number","range"],i=new RegExp("\\b"+f+"\\b"),j=f&&!i.test(h.join()),k=function(a){var b=(""+a).match(/(?:\.(\d+))?$/);return b&&b[1]?b[1].length:0},l=function(a){return Math.round(a*Math.pow(10,e))},m=!0;if(j)throw new Error(g);return e=k(d),(k(b)>e||l(b)%l(d)!==0)&&(m=!1),this.optional(c)||m},equalTo:function(b,c,d){var e=a(d);return this.settings.onfocusout&&e.not(".validate-equalTo-blur").length&&e.addClass("validate-equalTo-blur").on("blur.validate-equalTo",function(){a(c).valid()}),b===e.val()},remote:function(b,c,d,e){if(this.optional(c))return"dependency-mismatch";e="string"==typeof e&&e||"remote";var f,g,h,i=this.previousValue(c,e);return this.settings.messages[c.name]||(this.settings.messages[c.name]={}),i.originalMessage=i.originalMessage||this.settings.messages[c.name][e],this.settings.messages[c.name][e]=i.message,d="string"==typeof d&&{url:d}||d,h=a.param(a.extend({data:b},d.data)),i.old===h?i.valid:(i.old=h,f=this,this.startRequest(c),g={},g[c.name]=b,a.ajax(a.extend(!0,{mode:"abort",port:"validate"+c.name,dataType:"json",data:g,context:f.currentForm,success:function(a){var d,g,h,j=a===!0||"true"===a;f.settings.messages[c.name][e]=i.originalMessage,j?(h=f.formSubmitted,f.resetInternals(),f.toHide=f.errorsFor(c),f.formSubmitted=h,f.successList.push(c),f.invalid[c.name]=!1,f.showErrors()):(d={},g=a||f.defaultMessage(c,{method:e,parameters:b}),d[c.name]=i.message=g,f.invalid[c.name]=!0,f.showErrors(d)),i.valid=j,f.stopRequest(c,j)}},d)),"pending")}}});var b,c={};return a.ajaxPrefilter?a.ajaxPrefilter(function(a,b,d){var e=a.port;"abort"===a.mode&&(c[e]&&c[e].abort(),c[e]=d)}):(b=a.ajax,a.ajax=function(d){var e=("mode"in d?d:a.ajaxSettings).mode,f=("port"in d?d:a.ajaxSettings).port;return"abort"===e?(c[f]&&c[f].abort(),c[f]=b.apply(this,arguments),c[f]):b.apply(this,arguments)}),a});
        ;
        
        // source: plugin/octolapse/js/octolapse.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        Octolapse = {};
         Octolapse.Printers = { 'current_profile_guid': function () {return null;}}
        OctolapseViewModel = {};
        
        $(function () {
            // Finds the first index of an array with the matching predicate
            Octolapse.IsShowingSettingsChangedPopup = false;
        
            Octolapse.toggleContentFunction = function ($elm, options, updateObservable)
            {
        
                if(options.toggle_observable){
                    //console.log("Toggling element.");
                    if(updateObservable) {
                        options.toggle_observable(!options.toggle_observable());
                        //console.log("Observable updated - " + options.toggle_observable())
                    }
                    if (options.toggle_observable()) {
                        if (options.class_showing) {
                            $elm.children('[class^="icon-"]').addClass(options.class_showing);
                            $elm.children('[class^="fa"]').addClass(options.class_showing);
                        }
                        if (options.class_hiding) {
                            $elm.children('[class^="icon-"]').removeClass(options.class_hiding);
                            $elm.children('[class^="fa"]').removeClass(options.class_hiding);
                        }
                        if(options.container) {
                            if (options.parent) {
                                $elm.parents(options.parent).find(options.container).stop().slideDown('fast', options.onComplete);
                            } else {
                                $(options.container).stop().slideDown('fast', options.onComplete);
                            }
                        }
                    }
                    else
                     {
                         if (options.class_hiding) {
                             $elm.children('[class^="icon-"]').addClass(options.class_hiding);
                             $elm.children('[class^="fa"]').addClass(options.class_hiding);
                         }
                        if (options.class_showing) {
                            $elm.children('[class^="icon-"]').removeClass(options.class_showing);
                            $elm.children('[class^="fa"]').removeClass(options.class_showing);
                        }
                        if(options.container) {
                            if (options.parent) {
                                $elm.parents(options.parent).find(options.container).stop().slideUp('fast', options.onComplete);
                            } else {
                                $(options.container).stop().slideUp('fast', options.onComplete);
                            }
                        }
                    }
                }
                else {
                    if (options.class) {
                        $elm.children('[class^="icon-"]').toggleClass(options.class_hiding + ' ' + options.class_showing);
                        $elm.children('[class^="fa"]').toggleClass(options.class_hiding + ' ' + options.class_showing);
                    }
                    if (options.container) {
                        if (options.parent) {
                            $elm.parents(options.parent).find(options.container).stop().slideToggle('fast', options.onComplete);
                        } else {
                            $(options.container).stop().slideToggle('fast', options.onComplete);
                        }
                    }
                }
        
            };
        
            Octolapse.toggleContent = {
                    init: function(element, valueAccessor) {
                        var $elm = $(element),
                            options = $.extend({
                                class_showing: null,
                                class_hiding: null,
                                container: null,
                                parent: null,
                                toggle_observable: null,
                                onComplete: function() {
                                    $(document).trigger("slideCompleted");
                                }
                            }, valueAccessor());
        
                            if(options.toggle_observable) {
                                Octolapse.toggleContentFunction($elm, options, false);
                            }
        
        
                        $elm.on("click", function(e) {
                            e.preventDefault();
                            Octolapse.toggleContentFunction($elm,options, true);
        
                        });
                    }
                };
            ko.bindingHandlers.octolapseToggle = Octolapse.toggleContent ;
        
            Octolapse.arrayFirstIndexOf = function (array, predicate, predicateOwner) {
                for (var i = 0, j = array.length; i < j; i++) {
                    if (predicate.call(predicateOwner, array[i])) {
                        return i;
                    }
                }
                return -1;
            };
            // Creates a pseudo-guid
            Octolapse.guid = function () {
                function s4() {
                    return Math.floor((1 + Math.random()) * 0x10000)
                        .toString(16)
                        .substring(1);
                }
                return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
                    s4() + '-' + s4() + s4() + s4();
            };
            Octolapse.HasTakenFirstSnapshot = false;
            // Returns an observable sorted by name(), case insensitive
            Octolapse.nameSort = function (observable) {
                return observable().sort(
                    function (left, right) {
                        var leftName = left.name().toLowerCase();
                        var rightName = right.name().toLowerCase();
                        return leftName === rightName ? 0 : (leftName < rightName ? -1 : 1);
                    });
            };
            // Toggles an element based on the data-toggle attribute.  Expects list of elements containing a selector, onClass and offClass.
            // It will apply the on or off class to the result of each selector, which should return exactly one result.
            Octolapse.toggle = function (caller, args) {
                var elements = args.elements;
                elements.forEach(function (item) {
                    var element = $(item.selector);
                    var onClass = item.onClass;
                    var offClass = item.offClass;
                    if (element.hasClass(onClass)) {
                        element.removeClass(onClass);
                        element.addClass(offClass);
                    } else {
                        element.removeClass(offClass);
                        element.addClass(onClass);
                    }
                });
            };
        
            // Cookies (only for UI display purposes, not for any tracking
            Octolapse.COOKIE_EXPIRE_DAYS = 30;
        
            Octolapse.setLocalStorage = function (name, value) {
                localStorage.setItem("octolapse_"+name,value)
            }
            Octolapse.getLocalStorage = function (name, value) {
                return localStorage.getItem("octolapse_"+name)
            }
        
            Octolapse.displayPopup = function (options) {
                new PNotify(options);
            };
        
             // Create Helpers
            Octolapse.convertAxisSpeedUnit = function (speed, newUnit, previousUnit, tolerance, tolerance_unit){
                if (speed == null)
                    return null;
                if(tolerance_unit != newUnit)
                {
                    switch (newUnit){
                        case "mm-min":
                            tolerance = tolerance * 60.0;
                        case "mm-sec":
                            tolerance = tolerance / 60.0;
                    }
                }
                if(newUnit == previousUnit)
                    return Octolapse.roundToIncrement(speed, tolerance);
        
                switch (newUnit){
                    case "mm-min":
                        return Octolapse.roundToIncrement(speed*60.0, tolerance);
                    case "mm-sec":
                        return Octolapse.roundToIncrement(speed/60.0, tolerance);
                }
                return null;
            };
        
        
            // rounding to an increment
            Octolapse.roundToIncrement = function (num, increment) {
                if (increment == 0)
                    return 0;
                if (num == null)
                    return null;
        
                if (num != parseFloat(num))
                    return num;
        
                var div = Math.round(num / increment);
                var value = increment * div
        
                // Find the number of decimals in the increment
                var numDecimals = 0;
                if ((increment % 1) != 0)
                    numDecimals = increment.toString().split(".")[1].length;
        
                // tofixed can only support 20 decimals, reduce if necessary
                if(numDecimals > 20) {
                    //console.log("Too much precision for tofixed:" + numDecimals + " - Reducing to 20");
                    numDecimals = 20;
                }
                // truncate value to numDecimals decimals
                value = parseFloat(value.toFixed(numDecimals).toString())
        
                return value;
            }
        
            Octolapse.Popups = {};
            Octolapse.displayPopupForKey = function (options, key) {
                if (key in Octolapse.Popups) {
                    Octolapse.Popups[key].remove();
                }
                Octolapse.Popups[key] = new PNotify(options);
            };
        
            Octolapse.ConfirmDialogs = {};
            Octolapse.showConfirmDialog = function(key, title, text, onConfirm, onCancel)
            {
                if (key in Octolapse.ConfirmDialogs) {
                    Octolapse.ConfirmDialogs[key].remove();
                }
                Octolapse.ConfirmDialogs[key] = (
                    new PNotify({
                        title: title,
                        text: text,
                        icon: 'fa fa-question',
                        hide: false,
                        addclass: "octolapse",
                        confirm: {
                            confirm: true
                        },
                        buttons: {
                            closer: false,
                            sticker: false
                        },
                        history: {
                            history: false
                        }
                    })
                ).get().on('pnotify.confirm', onConfirm).on('pnotify.cancel', onCancel);
            };
        
            Octolapse.ToggleElement = function (element) {
                var args = $(this).attr("data-toggle");
                Octolapse.toggle(this, JSON.parse(args));
            };
        
            // Add custom validator for csv strings (no inner whitespace)
            $.validator.addMethod('csvString', function (value) {
                var csvStringRegex = /^(\s*[A-Z]\d+\s*(?:$|,))+$/gim;
                var csvStringComponentRegex = /[A-Z]\d+/gim;
                //console.log("Validating csvString: " + value);
                // We will allow 0 length trimmed strings
                if (value.length > 0) {
                    if (!value.match(csvStringRegex))
                        return false;
                    var values = value.split(",");
                    for (var index = 0; index < values.length; index++) {
                        if (!values[index].match(csvStringComponentRegex))
                            return false;
                    }
                }
                return true;
            }, 'Please enter a list of strings separated by commas.');
        
        
            $.validator.addMethod("check_one", function(value, elem, param)
                {
                    //console.log("Validating trigger checks");
                    $(param).val()
                        if($(param + ":checkbox:checked").length > 0){
                           return true;
                        }else {
                           return false;
                        }
                }
            );
        
            // Add custom validator for csv floats
            $.validator.addMethod('csvFloat', function (value) {
                return /^(\s*-?\d+(\.\d+)?)(\s*,\s*-?\d+(\.\d+)?)*\s*$/.test(value);
            }, 'Please enter a list of decimals separated by commas.');
            // Add a custom validator for csv floats between 0 and 100
            $.validator.addMethod('csvRelative', function (value) {
                return /^(\s*\d{0,2}(\.\d+)?|100(\.0+)?)(\s*,\s*\d{0,2}(\.\d+)?|100(\.0+)?)*\s*$/.test(value);
            }, 'Please enter a list of decimals between 0.0 and 100.0 separated by commas.');
            // Add a custom validator for integers
            $.validator.addMethod('integer',
                function (value) {
                    return /^-?\d+$/.test(value);
                }, 'Please enter an integer value.');
        
            Octolapse.isPercent = function(value){
        
                if(typeof value != 'string')
                    return false;
                if (!value)
                    return false;
                var value = value.trim();
                if(value.length > 1 && value[value.length-1] == "%")
                    value = value.substr(0,value.length-2);
                else
                    return false;
        
                return Octolapse.isFloat(value)
            };
            Octolapse.isFloat = function(value){
                if (!value)
                    return false;
                return !isNaN(parseFloat(value))
            };
        
            Octolapse.parseFloat = function(value){
                var ret = parseFloat(value);
                if(!isNaN(ret))
                    return ret;
                return null;
            };
        
            Octolapse.parsePercent = function(value){
                var value = value.trim();
                if(value.length > 1 && value[value.length-1] == "%")
                    value = value.substr(0,value.length-1);
                else
                    return null;
                return Octolapse.parseFloat(value)
            }
        
            $.validator.addMethod('slic3rPEFloatOrPercent',
                function (value) {
                    if (!value)
                        return true;
                    if(!Octolapse.isPercent(value) && !Octolapse.isFloat(value))
                    {
                        return false;
                    }
                    return true;
                }, 'Please enter a decimal or a percent.');
        
            $.validator.addMethod('slic3rPEFloatOrPercentSteps',
                function (value) {
                    if (!value)
                        return true;
                    if(Octolapse.isPercent(value))
                        value = Octolapse.parsePercent(value);
                    else if(Octolapse.isFloat(value))
                        value = Octolapse.parseFloat(value);
                    var rounded_value = Octolapse.roundToIncrement(value, 0.0001);
                    if (rounded_value == value)
                        return true;
                    return false
        
                }, 'Please enter a multiple of 0.0001.');
        
            // Add a custom validator for positive
            $.validator.addMethod('integerPositive',
                function (value) {
                    try {
                        var r = /^\d+$/.test(value); // Check the number against a regex to ensure it contains only digits.
                        var n = +value; // Try to convert to number.
                        return r && !isNaN(n) && n > 0 && n % 1 == 0;
                    } catch (e) {
                        return false;
                    }
                }, 'Please enter a positive integer value.');
            $.validator.addMethod('ffmpegBitRate',
                function (value) {
                    return /^\d+[KkMm]$/.test(value);
                }, 'Enter a bitrate, K for kBit/s and M for MBit/s.  Example: 1000K');
            $.validator.addMethod('lessThanOrEqual',
                function (value, element, param) {
                    var i = parseFloat(value);
                    var j = parseFloat($(param).val());
                    return (i <= j);
                });
            $.validator.addMethod('greaterThanOrEqual',
                function (value, element, param) {
                    var i = parseFloat(value);
                    var j = parseFloat($(param).val());
                    return (i >= j);
                });
            $.validator.addMethod('lessThan',
                function (value, element, param) {
                    var i = parseFloat(value);
                    var $target = $(param);
        
                    // I we didn't find a target, return true
                    if ($target.length === 0)
                        return true;
                    var j = parseFloat($target.val());
                    return (i < j);
                });
            $.validator.addMethod('greaterThan',
                function (value, element, param) {
                    var i = parseFloat(value);
                    var $target = $(param);
        
                    // I we didn't find a target, return true
                    if ($target.length === 0)
                        return true;
                    var j = parseFloat($target.val());
                    return (i > j);
                });
            $.validator.addMethod('octolapseSnapshotTemplate',
                function (value, element) {
                    var testUrl = value.toUpperCase().replace("{CAMERA_ADDRESS}", 'http://w.com/');
                    return jQuery.validator.methods.url.call(this, testUrl, element);
                });
            $.validator.addMethod('octolapseCameraRequestTemplate',
                function (value, element) {
                    var testUrl = value.toUpperCase().replace("{CAMERA_ADDRESS}", 'http://w.com/').replace("{value}", "1");
                    return jQuery.validator.methods.url.call(this, testUrl, element);
                });
            $.validator.addMethod('octolapseRenderingTemplate',
                function (value, element) {
                    var data = {"rendering_template":value};
                    $.ajax({
                        url: "./plugin/octolapse/validateRenderingTemplate",
                        type: "POST",
                        tryCount: 0,
                        retryLimit: 3,
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (result) {
                            if(result.success)
                                return true;
                            return false;
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            alert("Octolapse could not validate the rendering template.");
                            return false;
                        }
                    });
        
                });
        
            jQuery.extend(jQuery.validator.messages, {
                name: "Please enter a name.",
                required: "This field is required.",
                url: "Please enter a valid URL.",
                number: "Please enter a valid number.",
                equalTo: "Please enter the same value again.",
                maxlength: jQuery.validator.format("Please enter no more than {0} characters."),
                minlength: jQuery.validator.format("Please enter at least {0} characters."),
                rangelength: jQuery.validator.format("Please enter a value between {0} and {1} characters long."),
                range: jQuery.validator.format("Please enter a value between {0} and {1}."),
                max: jQuery.validator.format("Please enter a value less than or equal to {0}."),
                min: jQuery.validator.format("Please enter a value greater than or equal to {0}."),
                octolapseCameraRequestTemplate: "The value is not a url.  You may use {camera_address} or {value} tokens.",
                octolapseSnapshotTemplate: "The value is not a url.  You may use {camera_address} to refer to the web camera address."
            });
            // Knockout numeric binding
            Octolapse.NullNumericText = "none";
        
            Octolapse.round_axis_speed_unit = function (val, options) {
                var round_to_increment_mm_min = options.round_to_increment_mm_min;
                var round_to_increment_mm_sec = options.round_to_increment_mm_sec;
                var current_units_observable = options.current_units_observable;
                var round_to_percent = options.round_to_percent;
                var return_text = options.return_text || false;
        
                if (val == null)
                    return null;
        
                // Check to see if it is a percent
                var is_percent = Octolapse.isPercent(val)
                if(is_percent)
                {
                    if(round_to_percent)
                    {
                        val = Octolapse.parsePercent(val);
                    }
                    else
                        return null;
                }
                else
                    val = Octolapse.parseFloat(val)
        
                if (val == null || isNaN(val))
                    return null;
                try{
                    var round_to_increment = round_to_increment_mm_min;
                    if (is_percent) {
                        round_to_increment = round_to_percent
                    }
                    else if (current_units_observable() == 'mm-sec') {
                        round_to_increment = round_to_increment_mm_sec;
                    }
                    var rounded = Octolapse.roundToIncrement(val, round_to_increment);
                    if(is_percent && return_text)
                        return rounded.toString() + "%";
                    else if (return_text)
                        return rounded.toString();
                    return rounded;
                }
                catch (e){
                    console.log("Error rounding axis_speed_unit");
                }
        
            };
        
            ko.extenders.axis_speed_unit = function (target, options) {
                //console.log("rounding to axis speed units");
                var result = ko.pureComputed({
                    read: target,
                    write: function (newValue) {
                        var current = target();
                        var valueToWrite = Octolapse.round_axis_speed_unit(newValue, options);
                        //only write if it changed
                        if (valueToWrite !== current) {
                            target(valueToWrite);
                        } else {
                            //if the rounded value is the same, but a different value was written, force a notification for the current field
                            if (newValue !== current) {
                                target.notifySubscribers(valueToWrite);
                            }
                        }
        
                    }
                }).extend({ notify: 'always' });
        
                result(target());
        
                return result;
            };
        
            ko.extenders.round_to_increment = function (target, options) {
                //console.log("rounding to axis speed units");
                var round_to_increment = options.round_to_increment;
                var result = ko.pureComputed({
                    read: target,
                    write: function (newValue) {
                        var current = target();
                        var valueToWrite = Octolapse.roundToIncrement(newValue, round_to_increment);
                        //only write if it changed
                        if (valueToWrite !== current) {
                            target(valueToWrite);
                        } else {
                            //if the rounded value is the same, but a different value was written, force a notification for the current field
                            if (newValue !== current) {
                                target.notifySubscribers(valueToWrite);
                            }
                        }
        
                    }
                }).extend({ notify: 'always' });
        
                result(target());
        
                return result;
            };
        
            ko.extenders.numeric = function (target, precision) {
                var result = ko.dependentObservable({
                    read: function () {
                        var val = target();
                        val = Octolapse.parseFloat(val)
                        if (val == null)
                            return val;
                        try{
                            // safari doesn't seem to like toFixed with a precision > 20
                            if(precision > 20)
                                precision = 20;
                            return val.toFixed(precision);
                        }
                        catch (e){
                            console.log("Error converting toFixed");
                        }
        
                    },
                    write: target
                });
        
                result.raw = target;
                return result;
            };
            /**
             * @return {string}
             */
            Octolapse.ToTime = function (seconds) {
                if (val == null)
                    return Octolapse.NullTimeText;
                var utcSeconds = seconds;
                var d = new Date(0); // The 0 there is the key, which sets the date to the epoch
                d.setUTCSeconds(utcSeconds);
                return d.getHours() + ":"
                    + d.getMinutes() + ":"
                    + d.getSeconds();
            };
        
            /**
             * @return {string}
             */
            Octolapse.ToTimer = function (seconds) {
                if (seconds == null)
                    return "";
                if (seconds <= 0)
                    return "0:00";
        
                var hours = Math.floor(seconds / 3600);
                if (hours > 0) {
                    return ("" + hours).slice(-2) + " Hrs"
                }
        
                seconds %= 3600;
                var minutes = Math.floor(seconds / 60);
                seconds = seconds % 60;
                return ("0" + minutes).slice(-2) + ":" + ("0" + seconds).slice(-2);
            };
        
            Octolapse.ToCompactInt = function (value) {
                var newValue = value;
                if (value >= 1000) {
                    var suffixes = ["", "k", "m", "b", "t"];
                    var suffixNum = Math.floor(("" + value).length / 3);
                    var shortValue = '';
                    for (var precision = 2; precision >= 1; precision--) {
                        shortValue = parseFloat((suffixNum !== 0 ? (value / Math.pow(1000, suffixNum)) : value).toPrecision(precision));
                        var dotLessShortValue = (shortValue + '').replace(/[^a-zA-Z 0-9]+/g, '');
                        if (dotLessShortValue.length <= 2) { break; }
                    }
        
                    if (shortValue % 1 !== 0) shortValue = shortValue.toFixed(1);
        
                    newValue = shortValue + suffixes[suffixNum];
                }
                return newValue;
            };
        
        
            Octolapse.NullTimeText = "none";
            ko.extenders.time = function (target, options) {
                var result = ko.dependentObservable({
                    read: function () {
                        val = target();
                        return Octolapse.ToTime(val)
                    },
                    write: target
                });
        
                result.raw = target;
                return result;
            };
        
            OctolapseViewModel = function (parameters) {
                var self = this;
                Octolapse.Globals = self;
        
                self.loginState = parameters[0];
                Octolapse.PrinterStatus = parameters[1];
                // Global Values
                self.show_position_state_changes = ko.observable(false);
                self.show_position_changes = ko.observable(false);
                self.show_extruder_state_changes = ko.observable(false);
                self.show_trigger_state_changes = ko.observable(false);
                self.auto_reload_latest_snapshot = ko.observable(false);
                self.auto_reload_frames = ko.observable(5);
                self.is_admin = ko.observable(false);
                self.enabled = ko.observable(false);
                self.navbar_enabled = ko.observable(false);
                self.show_navbar_when_not_printing = ko.observable(false);
                self.show_real_snapshot_time = ko.observable(false);
                self.cancel_print_on_startup_error = ko.observable(true);
        
                self.version = ko.observable("unknown");
                // Create a guid to uniquely identify this client.
                self.client_id = Octolapse.guid();
                // Have we loaded the state yet?
                self.HasLoadedState = false;
        
        
                self.onBeforeBinding = function () {
                    self.is_admin(self.loginState.isAdmin());
                };
        
                self.startup_complete = false;
                self.onStartupComplete = function () {
                    //console.log("Startup Complete")
                    self.getInitialState();
                    self.startup_complete = true;
        
                };
                self.onDataUpdaterReconnect = function () {
                    //console.log("Reconnected Client")
                    self.getInitialState();
        
                };
        
                self.getInitialState = function(){
                    //console.log("Getting initial state");
                    if(!self.startup_complete && self.is_admin()) {
                        //console.log("octolapse.js - Loading settings for current user after startup.");
                        Octolapse.Settings.loadSettings();
                    }
                    self.loadState();
                    // reset snapshot error state
                    Octolapse.Status.snapshot_error(false);
                    //console.log("Finished loading initial state.");
        
                }
        
                self.loadState = function () {
                    //console.log("octolapse.js - Loading State");
                    $.ajax({
                        url: "./plugin/octolapse/loadState",
                        type: "POST",
                        tryCount: 0,
                        retryLimit: 3,
                        ccontentType: "application/json",
                        dataType: "json",
                        success: function (result) {
                            //console.log("The state has been loaded.  Waiting for message");
                            self.initial_state_loaded = true;
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
        
                            //console.log("Octolapse was unable to retrieve the current state, trying again in 5 seconds");
                            setTimeout(self.getInitialState, 5000);
                            // Todo:  update the UI to show we're waiting for our state!
                        }
                    });
                };
        
        
                self.onUserLoggedIn = function (user) {
                    self.is_admin(self.loginState.isAdmin());
                    if(self.is_admin() && self.startup_complete) {
                        //console.log("octolapse.js - User Logged In after startup - Loading settings.  User: " + user.name);
                        Octolapse.Settings.loadSettings();
                    }
                    //else
                    //    console.log("octolapse.js - User Logged In before startup - waiting to load settings.  User: " + user.name);
                };
        
                self.onUserLoggedOut = function () {
                    //console.log("octolapse.js - User Logged Out");
                    self.is_admin(false);
                    Octolapse.Settings.clearSettings();
                };
        
                self.updateState = function (state) {
                    //console.log(state);
                    if (state.Position != null) {
                        //console.log('octolapse.js - state-changed - Position');
                        Octolapse.Status.updatePosition(state.Position);
                    }
                    if (state.PositionState != null) {
                        //console.log('octolapse.js - state-changed - Position State');
                        Octolapse.Status.updatePositionState(state.PositionState);
                    }
                    if (state.Extruder != null) {
                        //console.log('octolapse.js - state-changed - Extruder State');
                        Octolapse.Status.updateExtruderState(state.Extruder);
                    }
                    if (state.TriggerState != null) {
                        //console.log('octolapse.js - state-changed - Trigger State');
                        Octolapse.Status.updateTriggerStates(state.TriggerState);
        
                    }
                    if (state.MainSettings != null) {
                        //console.log('octolapse.js - state-changed - Trigger State');
                        // Do not update the main settings unless they are saved.
                        //Octolapse.SettingsMain.update(state.MainSettings);
                        // detect changes to auto_reload_latest_snapshot
                        var cur_auto_reload_latest_snapshot = Octolapse.Globals.auto_reload_latest_snapshot();
        
                        Octolapse.Globals.update(state.MainSettings);
                        Octolapse.SettingsMain.setSettingsVisibility(Octolapse.Globals.enabled());
                        if (cur_auto_reload_latest_snapshot !== Octolapse.Globals.auto_reload_latest_snapshot()) {
                            //console.log('octolapse.js - Octolapse.Globals.auto_reload_latest_snapshot changed, erasing previous snapshot images');
                            Octolapse.Status.erasePreviousSnapshotImages('octolapse_snapshot_image_container');
                            Octolapse.Status.erasePreviousSnapshotImages('octolapse_snapshot_thumbnail_container');
                        }
        
                    }
                    if (state.Status != null) {
                        //console.log('octolapse.js - state-changed - Trigger State');
                        Octolapse.Status.update(state.Status);
                    }
                    if (!self.HasLoadedState) {
                        Octolapse.Status.updateLatestSnapshotImage(true);
                        Octolapse.Status.updateLatestSnapshotThumbnail(true);
                    }
        
                    self.HasLoadedState = true;
                };
        
                self.update = function (settings) {
                    // enabled
                    if (ko.isObservable(settings.is_octolapse_enabled))
                        self.enabled(settings.is_octolapse_enabled());
                    else
                        self.enabled(settings.is_octolapse_enabled);
        
                    if (ko.isObservable(settings.version))
                        self.version(settings.version());
                    else
                        self.version(settings.version);
        
                    // self.auto_reload_latest_snapshot
                    if (ko.isObservable(settings.auto_reload_latest_snapshot))
                        self.auto_reload_latest_snapshot(settings.auto_reload_latest_snapshot());
                    else
                        self.auto_reload_latest_snapshot(settings.auto_reload_latest_snapshot);
                    //auto_reload_frames
                    if (ko.isObservable(settings.auto_reload_frames))
                        self.auto_reload_frames(settings.auto_reload_frames());
                    else
                        self.auto_reload_frames(settings.auto_reload_frames);
                    // navbar_enabled
                    if (ko.isObservable(settings.show_navbar_icon))
                        self.navbar_enabled(settings.show_navbar_icon());
                    else
                        self.navbar_enabled(settings.show_navbar_icon);
        
                    if (ko.isObservable(settings.show_navbar_when_not_printing))
                        self.show_navbar_when_not_printing(settings.show_navbar_when_not_printing());
                    else
                        self.show_navbar_when_not_printing(settings.show_navbar_when_not_printing);
        
        
                    if (ko.isObservable(settings.show_position_state_changes))
                        self.show_position_state_changes(settings.show_position_state_changes());
                    else
                        self.show_position_state_changes(settings.show_position_state_changes);
        
                    if (ko.isObservable(settings.show_position_changes))
                        self.show_position_changes(settings.show_position_changes());
                    else
                        self.show_position_changes(settings.show_position_changes);
        
                    if (ko.isObservable(settings.show_extruder_state_changes))
                        self.show_extruder_state_changes(settings.show_extruder_state_changes());
                    else
                        self.show_extruder_state_changes(settings.show_extruder_state_changes);
        
                    if (ko.isObservable(settings.show_trigger_state_changes))
                        self.show_trigger_state_changes(settings.show_trigger_state_changes());
                    else
                        self.show_trigger_state_changes(settings.show_trigger_state_changes)
        
                    if (ko.isObservable(settings.show_real_snapshot_time))
                        self.show_real_snapshot_time(settings.show_real_snapshot_time());
                    else
                        self.show_real_snapshot_time(settings.show_real_snapshot_time)
        
                    if (ko.isObservable(settings.cancel_print_on_startup_error))
                        self.cancel_print_on_startup_error(settings.cancel_print_on_startup_error());
                    else
                        self.cancel_print_on_startup_error(settings.cancel_print_on_startup_error)
        
        
        
                };
        
                // Handle Plugin Messages from Server
                self.onDataUpdaterPluginMessage = function (plugin, data) {
                    if (plugin !== "octolapse") {
                        return;
                    }
                    switch (data.type) {
                        case "settings-changed":
                            {
                                // Was this from us?
                                if (self.client_id !== data.client_id && self.is_admin())
                                {
                                    Octolapse.showConfirmDialog(
                                        "reload-settings",
                                        "Reload Settings",
                                        "A settings change was detected from another client.  Reload settings?",
                                        function(){
                                            Octolapse.Settings.loadSettings();
                                        });
                                }
                                self.updateState(data);
                            }
                            break;
                        case "state-loaded":
                            {
                                //console.log('octolapse.js - state-loaded');
                                self.updateState(data);
                            }
                            break;
                        case "state-changed":
                            {
                                //console.log('octolapse.js - state-changed');
                                self.updateState(data);
                            }
                            break;
                        case "popup":
                            {
                                //console.log('octolapse.js - popup');
                                var options = {
                                    title: 'Octolapse Notice',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "popup-error":
                            {
                                //console.log('octolapse.js - popup-error');
                                self.updateState(data);
                                var options = {
                                    title: 'Error',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                                break;
                            }
                        case "print-start-error":
                            {
                                //console.log('octolapse.js - popup-error');
                                self.updateState(data);
                                var options = {
                                    title: 'Octolapse Startup Failed',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopupForKey(options,"print-start-error")
                                break;
                            }
                        case "timelapse-start":
                            {
                                //console.log('octolapse.js - timelapse-start');
                                // Erase any previous images
                                Octolapse.HasTakenFirstSnapshot = false;
                                // let the status tab know that a timelapse is starting
                                Octolapse.Status.onTimelapseStart();
                                self.updateState(data);
                                Octolapse.Status.snapshot_error(false);
                            }
                            break;
                        case "timelapse-complete":
                            {
                                //console.log('octolapse.js - timelapse-complete');
                                self.updateState(data)
                            }
                            break;
                        case "camera-settings-error":
                            // If only the camera image acquisition failed, use the camera error message
                            var options = {
                                title: 'Octolapse - Camera Settings Error',
                                text: data.msg,
                                type: 'error',
                                hide: false,
                                addclass: "octolapse"
                            };
                            Octolapse.displayPopupForKey(options, "snapshot_error");
                            break;
                        case "snapshot-start":
                            {
                                //console.log('octolapse.js - snapshot-start');
                                self.updateState(data);
                                Octolapse.Status.snapshot_error(false);
                            }
                            break;
                        case "snapshot-complete":
                            {
                                //console.log('octolapse.js - snapshot-complete');
                                //console.log(data);
                                self.updateState(data);
        
                                Octolapse.Status.snapshot_error(data.error || data.snapshot_error);
                                if(!data.snapshot_success)
                                {
                                    // If only the camera image acquisition failed, use the camera error message
                                    Octolapse.Status.snapshot_error(true);
                                    var options = {
                                        title: 'Octolapse - Camera Error',
                                        text: data.snapshot_error,
                                        type: 'error',
                                        hide: false,
                                        addclass: "octolapse"
                                    };
                                    Octolapse.displayPopupForKey(options, "snapshot_error")
                                }
                                else if(!data.success)
                                {
                                    var options = {
                                        title: 'Octolapse - Stabilization Error',
                                        text: data.error,
                                        type: 'error',
                                        hide: false,
                                        addclass: "octolapse"
                                    };
                                    Octolapse.displayPopupForKey(options, "stabilization_error")
                                }
        
                                if (!Octolapse.HasTakenFirstSnapshot) {
                                    Octolapse.HasTakenFirstSnapshot = true;
                                    Octolapse.Status.erasePreviousSnapshotImages('octolapse_snapshot_image_container',true);
                                    Octolapse.Status.erasePreviousSnapshotImages('octolapse_snapshot_thumbnail_container', true);
                                    Octolapse.Status.updateLatestSnapshotThumbnail(true);
                                    Octolapse.Status.updateLatestSnapshotImage();
                                }
                                else
                                {
                                    Octolapse.Status.updateLatestSnapshotThumbnail();
                                    Octolapse.Status.updateLatestSnapshotImage();
                                }
                            }
                            break;
                        case "render-start":
                            {
                                //console.log('octolapse.js - render-start');
                                self.updateState(data);
                                Octolapse.Status.snapshot_error(false);
        
                                var options = {
                                    title: 'Octolapse Rendering Started',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "render-failed":{
                                //console.log('octolapse.js - render-failed');
                                self.updateState(data);
                                var options = {
                                    title: 'Octolapse Rendering Failed',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                                break;
                        }
                        case "before-after-render-error": {
                            // If only the camera image acquisition failed, use the camera error message
                            var options = {
                                title: 'Octolapse - Before/After Render Script Error',
                                text: data.msg,
                                type: 'error',
                                hide: false,
                                addclass: "octolapse"
                            };
                            Octolapse.displayPopupForKey(options, "before_after_render_script_error");
                            break;
                        }
                        case "render-complete":
                            {
                                //console.log('octolapse.js - render-complete');
                            }
                            break;
                        case "render-end":
                            {
                                //console.log('octolapse.js - render-end');
                                self.updateState(data);
                                if (!data.is_synchronized) {
                                    // Make sure we aren't synchronized, else there's no reason to display a popup
                                    if (!data.is_synchronized && data.success) {
                                        var options = {
                                            title: 'Octolapse Rendering Complete',
                                            text: data.msg,
                                            type: 'success',
                                            hide: false,
                                            addclass: "octolapse",
                                            desktop: {
                                                desktop: true
                                            }
                                        };
                                        Octolapse.displayPopup(options);
                                    }
                                }
        
                            }
                            break;
                        case "synchronize-failed":
                            {
                                //console.log('octolapse.js - synchronize-failed');
                                var options = {
                                    title: 'Octolapse Synchronization Failed',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "timelapse-stopping":
                            {
                                //console.log('octolapse.js - timelapse-stoping');
                                Octolapse.Status.is_timelapse_active(false);
                                var options = {
                                    title: 'Octolapse Timelapse Stopping',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "timelapse-stopped":
                            {
                                //console.log('octolapse.js - timelapse-stopped');
                                Octolapse.Status.onTimelapseStop();
                                Octolapse.Status.snapshot_error(false);
                                var options = {
                                    title: 'Octolapse Timelapse Stopped',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "disabled-running":
                            {
                                var options = {
                                    title: 'Octolapse Disabled for Next Print',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse",
                                    desktop: {
                                        desktop: true
                                    }
                                };
                                Octolapse.displayPopup(options);
                            }
                        break;
                        case "timelapse-stopped-error":
                            {
                                //console.log('octolapse.js - timelapse-stopped-error');
                                Octolapse.Status.onTimelapseStop();
                                var options = {
                                    title: 'Octolapse Timelapse Stopped',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopup(options);
                            }
                            break;
                        case "out-of-bounds":
                            {
                                //console.log("An out-of-bounds snapshot position was detected.")
                                var options = {
                                    title: 'Octolapse - Out Of Bounds',
                                    text: data.msg ,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options,"out-of-bounds");
                            }
                            break;
                        case "position-error":
                            {
                                //console.log("An out-of-bounds snapshot position was detected.")
                                var options = {
                                    title: 'Octolapse - Position Error',
                                    text: data.msg,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options, "position-error");
                            }
                            break;
                        case "warning":
                            //console.log("A warning was sent to the plugin.")
                                var options = {
                                    title: 'Octolapse - Warning',
                                    text: data.msg,
                                    type: 'notice',
                                    hide: true,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopup(options, "warning");
                        default:
                            {
                                //console.log('Octolapse.js - passing on message from server.  DataType:' + data.type);
                            }
                    }
                };
        
        
            };
            OCTOPRINT_VIEWMODELS.push([
                OctolapseViewModel
                , ["loginStateViewModel", "printerStateViewModel"]
                , ["#octolapse"]
            ]);
        
        
        
        });
        
        ;
        
        // source: plugin/octolapse/js/octolapse.settings.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        
        $(function () {
        
        
            // Settings View Model
            Octolapse.SettingsViewModel = function (parameters) {
                // Create a reference to this object
                var self = this;
                // Add this object to our Octolapse namespace
                Octolapse.Settings = this;
                // Create an empty add/edit profile so that the initial binding to the empty template works without errors.
                Octolapse.Settings.AddEditProfile = ko.observable({
                    "templateName": "empty-template",
                    "profileObservable": ko.observable()
                });
                // Assign the Octoprint settings to our namespace
                Octolapse.Settings.global_settings = parameters[0];
        
                self.loginState = parameters[1];
        
        
                // Called before octoprint binds the viewmodel to the plugin
                self.onBeforeBinding = function () {
        
                    /*
                        Create our global settings
                    */
                    self.settings = self.global_settings.settings.plugins.octolapse;
                    var settings = ko.toJS(self.settings); // just get the values
        
                    /**
                     * Profiles - These are bound by octolapse.profiles.js
                     */
                    /*
                        Create our printers view model
                    */
                    var printerSettings =
                        {
                            'current_profile_guid': null
                            , 'profiles': []
                            , 'default_profile': null
                            , 'profileOptions': {}
                            , 'profileViewModelCreateFunction': Octolapse.PrinterProfileViewModel
                            , 'profileValidationRules': Octolapse.PrinterProfileValidationRules
                            , 'bindingElementId': 'octolapse_printer_tab'
                            , 'addEditTemplateName': 'printer-template'
                            , 'profileTypeName': 'Printer'
                            , 'addUpdatePath': 'addUpdateProfile'
                            , 'removeProfilePath': 'removeProfile'
                            , 'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.Printers = new Octolapse.ProfilesViewModel(printerSettings);
        
                    /*
                        Create our stabilizations view model
                    */
                    var stabilizationSettings =
                        {
                            'current_profile_guid': null
                            , 'profiles': []
                            , 'default_profile': null
                            , 'profileOptions': {}
                            , 'profileViewModelCreateFunction': Octolapse.StabilizationProfileViewModel
                            , 'profileValidationRules': Octolapse.StabilizationProfileValidationRules
                            , 'bindingElementId': 'octolapse_stabilization_tab'
                            , 'addEditTemplateName': 'stabilization-template'
                            , 'profileTypeName': 'Stabilization'
                            , 'addUpdatePath': 'addUpdateProfile'
                            , 'removeProfilePath': 'removeProfile'
                            , 'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.Stabilizations = new Octolapse.ProfilesViewModel(stabilizationSettings);
                    /*
                        Create our snapshots view model
                    */
                    var snapshotSettings =
                        {
                            'current_profile_guid': null,
                            'profiles': [],
                            'default_profile': null,
                            'profileOptions': {},
                            'profileViewModelCreateFunction': Octolapse.SnapshotProfileViewModel,
                            'profileValidationRules': Octolapse.SnapshotProfileValidationRules,
                            'bindingElementId': 'octolapse_snapshot_tab',
                            'addEditTemplateName': 'snapshot-template',
                            'profileTypeName': 'Snapshot',
                            'addUpdatePath': 'addUpdateProfile',
                            'removeProfilePath': 'removeProfile',
                            'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.Snapshots = new Octolapse.ProfilesViewModel(snapshotSettings);
                    /*
                        Create our rendering view model
                    */
                    var renderingSettings =
                        {
                            'current_profile_guid': null,
                             'profiles': [],
                             'default_profile': null,
                             'profileOptions': {},
                            'profileViewModelCreateFunction': Octolapse.RenderingProfileViewModel,
                            'profileValidationRules': Octolapse.RenderingProfileValidationRules,
                            'bindingElementId': 'octolapse_rendering_tab',
                            'addEditTemplateName': 'rendering-template',
                            'profileTypeName': 'Rendering',
                            'addUpdatePath': 'addUpdateProfile',
                            'removeProfilePath': 'removeProfile',
                            'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.Renderings = new Octolapse.ProfilesViewModel(renderingSettings);
                    /*
                        Create our camera view model
                    */
                    var cameraSettings =
                        {
                            'current_profile_guid': null,
                            'profiles': [],
                            'default_profile': null,
                            'profileOptions': {},
                            'profileViewModelCreateFunction': Octolapse.CameraProfileViewModel,
                            'profileValidationRules': Octolapse.CameraProfileValidationRules,
                            'bindingElementId': 'octolapse_camera_tab',
                            'addEditTemplateName': 'camera-template',
                            'profileTypeName': 'Camera',
                            'addUpdatePath': 'addUpdateProfile',
                            'removeProfilePath': 'removeProfile',
                            'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.Cameras = new Octolapse.ProfilesViewModel(cameraSettings);
        
                    /*
                        Create our debug view model
                    */
                    var debugSettings =
                        {
                            'current_profile_guid': null,
                            'profiles': [],
                            'default_profile': null,
                            'profileOptions': {},
                            'profileViewModelCreateFunction': Octolapse.DebugProfileViewModel,
                            'profileValidationRules': Octolapse.DebugProfileValidationRules,
                            'bindingElementId': 'octolapse_debug_tab',
                            'addEditTemplateName': 'debug-template',
                            'profileTypeName': 'Debug',
                            'addUpdatePath': 'addUpdateProfile',
                            'removeProfilePath': 'removeProfile',
                            'setCurrentProfilePath': 'setCurrentProfile'
                        };
                    Octolapse.DebugProfiles = new Octolapse.ProfilesViewModel(debugSettings);
        
                };
        
                // Update all octolapse settings
                self.updateSettings = function (settings) {
                    //console.log("Settings Received:");
                    //console.log(settings);
                    // SettingsMain
                    Octolapse.SettingsMain.update(settings);
        
                    // Printers
                    Octolapse.Printers.profiles([]);
                    Octolapse.Printers.default_profile(settings.default_printer_profile);
                    Octolapse.Printers.profileOptions = {
                        'slicer_type_options': settings.slicer_type_options,
                        'e_axis_default_mode_options': settings.e_axis_default_mode_options,
                        'g90_influences_extruder_options': settings.g90_influences_extruder_options,
                        'xyz_axes_default_mode_options': settings.xyz_axes_default_mode_options,
                        'units_default_options': settings.units_default_options,
                        'axis_speed_display_unit_options': settings.axis_speed_display_unit_options
                    };
                    Octolapse.Printers.current_profile_guid(settings.current_printer_profile_guid);
                    settings.printers.forEach(function (item, index) {
                        Octolapse.Printers.profiles.push(new Octolapse.PrinterProfileViewModel(item));
                    });
        
                    Octolapse.Stabilizations.profiles([]);
                    Octolapse.Stabilizations.default_profile(settings.default_stabilization_profile);
                    Octolapse.Stabilizations.profileOptions = {'stabilization_type_options': settings.stabilization_type_options}
                    Octolapse.Stabilizations.current_profile_guid(settings.current_stabilization_profile_guid);
                    settings.stabilizations.forEach(function (item, index) {
                        Octolapse.Stabilizations.profiles.push(new Octolapse.StabilizationProfileViewModel(item));
                    });
        
                    // Snapshots
                    Octolapse.Snapshots.profiles([]);
                    Octolapse.Snapshots.default_profile(settings.default_snapshot_profile);
                    Octolapse.Snapshots.profileOptions ={
                        'trigger_types': settings.trigger_types,
                        'snapshot_extruder_trigger_options': settings.snapshot_extruder_trigger_options,
                        'position_restriction_shapes': settings.position_restriction_shapes,
                        'position_restriction_types': settings.position_restriction_types
                    }
                    Octolapse.Snapshots.current_profile_guid(settings.current_snapshot_profile_guid);
                    settings.snapshots.forEach(function (item, index) {
                        Octolapse.Snapshots.profiles.push(new Octolapse.SnapshotProfileViewModel(item));
                    });
        
                    // Renderings
                    Octolapse.Renderings.profiles([]);
                    Octolapse.Renderings.default_profile(settings.default_rendering_profile);
                    Octolapse.Renderings.profileOptions = {
                        'rendering_fps_calculation_options': settings.rendering_fps_calculation_options,
                        'rendering_output_format_options': settings.rendering_output_format_options,
                        'rendering_file_templates': settings.rendering_file_templates,
                        'overlay_text_templates': settings.overlay_text_templates,
                        'overlay_text_alignment_options': settings.overlay_text_alignment_options,
                        'overlay_text_valign_options': settings.overlay_text_valign_options,
                        'overlay_text_halign_options': settings.overlay_text_halign_options,
                    }
                    Octolapse.Renderings.current_profile_guid(settings.current_rendering_profile_guid);
                    settings.renderings.forEach(function (item, index) {
                        var o = new Octolapse.RenderingProfileViewModel(item);
                        Octolapse.Renderings.profiles.push(o);
                    });
        
                    // Cameras
                    Octolapse.Cameras.profiles([]);
                    Octolapse.Cameras.default_profile(settings.default_camera_profile);
                    Octolapse.Cameras.profileOptions = {
                        'camera_powerline_frequency_options': settings.camera_powerline_frequency_options,
                        'camera_exposure_type_options': settings.camera_exposure_type_options,
                        'camera_led_1_mode_options': settings.camera_led_1_mode_options,
                        'snapshot_transpose_options': settings.snapshot_transpose_options,
                        'camera_type_options': settings.camera_type_options
        
                    }
        
                    settings.cameras.forEach(function (item, index) {
                        Octolapse.Cameras.profiles.push(new Octolapse.CameraProfileViewModel(item));
                    });
        
                    // Debug
                    Octolapse.DebugProfiles.profiles([]);
                    Octolapse.DebugProfiles.default_profile(settings.current_debug_profile_guid);
                    Octolapse.DebugProfiles.profileOptions = {'debug_profile_options': settings.debug_profile_options}
                    Octolapse.DebugProfiles.current_profile_guid(settings.current_debug_profile_guid);
                    settings.debug_profiles.forEach(function (item, index) {
                        Octolapse.DebugProfiles.profiles.push(new Octolapse.DebugProfileViewModel(item));
                    });
        
                };
        
                /*
                    reload the default settings
                */
                self.restoreDefaultSettings = function () {
                    Octolapse.showConfirmDialog(
                        "restore-defaults",
                        "Restore Default Settings",
                        "You will lose ALL of your octolapse settings by restoring the defaults!  Are you SURE?",
                        function(){
                            var data = {"client_id": Octolapse.Globals.client_id};
                            $.ajax({
                                url: "./plugin/octolapse/restoreDefaults",
                                type: "POST",
                                data: JSON.stringify(data),
                                contentType: "application/json",
                                dataType: "json",
                                success: function (newSettings) {
        
                                    self.updateSettings(newSettings);
                                    Octolapse.Globals.update(newSettings);
                                    alert("The default settings have been restored.  It is recommended that you restart the OctoPrint server now.");
                                },
                                error: function (XMLHttpRequest, textStatus, errorThrown) {
                                    alert("Unable to restore the default settings.  Status: " + textStatus + ".  Error: " + errorThrown);
                                }
                            });
                        }
                    );
                };
                /*
                    load all settings default settings
                */
                self.loadSettings = function () {
        
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    $.ajax({
                        url: "./plugin/octolapse/loadSettings",
                        type: "POST",
                        contentType: "application/json",
                        dataType: "json",
                        success: function (newSettings) {
                            self.updateSettings(newSettings);
                            //console.log("Settings have been loaded.");
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            alert("Octolapse was unable to load the current settings.  Status: " + textStatus + ".  Error: " + errorThrown);
                        }
                    });
        
                };
        
                self.clearSettings = function (){
                     // Printers
                    Octolapse.Printers.profiles([]);
                    Octolapse.Printers.default_profile(null);
                    Octolapse.Printers.current_profile_guid(null);
                    Octolapse.Printers.profileOptions = {};
                    // Stabilizations
                    Octolapse.Stabilizations.profiles([]);
                    Octolapse.Stabilizations.default_profile(null);
                    Octolapse.Stabilizations.current_profile_guid(null);
                    Octolapse.Stabilizations.profileOptions = {};
                    // Snapshots
                    Octolapse.Snapshots.profiles([]);
                    Octolapse.Snapshots.default_profile(null);
                    Octolapse.Snapshots.current_profile_guid(null);
                    Octolapse.Snapshots.profileOptions = {};
                    // Renderings
                    Octolapse.Renderings.profiles([]);
                    Octolapse.Renderings.default_profile(null);
                    Octolapse.Renderings.current_profile_guid(null);
                    Octolapse.Renderings.profileOptions = {};
                    // Cameras
                    Octolapse.Cameras.profiles([]);
                    Octolapse.Cameras.default_profile(null);
                    Octolapse.Cameras.current_profile_guid(null);
                    Octolapse.Cameras.profileOptions = {};
                    // Debugs
                    Octolapse.DebugProfiles.profiles([]);
                    Octolapse.DebugProfiles.default_profile(null);
                    Octolapse.DebugProfiles.current_profile_guid(null);
                    Octolapse.DebugProfiles.profileOptions = {};
                }
                /*
                    Profile Add/Update routine for showAddEditDialog
                */
                self.addUpdateProfile = function (profile) {
                    switch (profile.templateName) {
                        case "printer-template":
                            Octolapse.Printers.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        case "stabilization-template":
                            Octolapse.Stabilizations.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        case "snapshot-template":
                            Octolapse.Snapshots.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        case "rendering-template":
                            Octolapse.Renderings.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        case "camera-template":
                            Octolapse.Cameras.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        case "debug-template":
                            Octolapse.DebugProfiles.addUpdateProfile(profile.profileObservable, self.hideAddEditDialog());
                            break;
                        default:
                            alert("Cannot save the object, the template (" + profile.templateName + ") is unknown!");
                            break;
                    }
        
                };
        
                /*
                    Modal Dialog Functions
                */
                // hide the modal dialog
                self.hideAddEditDialog = function (sender, event) {
                    $("#octolapse_add_edit_profile_dialog").modal("hide");
                };
                // show the modal dialog
                self.showAddEditDialog = function (options, sender) {
                    // Create all the variables we want to store for callbacks
                    //console.log("octolapse.settings.js - Showing add edit dialog.");
                    var dialog = this;
                    dialog.sender = sender;
                    dialog.profileObservable = options.profileObservable;
                    dialog.templateName = options.templateName;
                    dialog.$addEditDialog = $("#octolapse_add_edit_profile_dialog");
                    dialog.$addEditForm = dialog.$addEditDialog.find("#octolapse_add_edit_profile_form");
                    dialog.$cancelButton = $("a.cancel", dialog.$addEditDialog);
                    dialog.$saveButton = $("a.save", dialog.$addEditDialog);
                    dialog.$defaultButton = $("a.set-defaults", dialog.$addEditDialog);
                    dialog.$dialogTitle = $("h3.modal-title", dialog.$addEditDialog);
                    dialog.$dialogWarningContainer = $("div.dialog-warning", dialog.$addEditDialog);
                    dialog.$dialogWarningText = $("span", dialog.$dialogWarningContainer);
                    dialog.$summary = dialog.$addEditForm.find("#add_edit_validation_summary");
                    dialog.$errorCount = dialog.$summary.find(".error-count");
                    dialog.$errorList = dialog.$summary.find("ul.error-list");
                    dialog.$modalBody = dialog.$addEditDialog.find(".modal-body");
        
                    // Create all of the validation rules
                    var rules = {
                        rules: options.validationRules.rules,
                        messages: options.validationRules.messages,
                        ignore: ".ignore_hidden_errors:hidden",
                        errorPlacement: function (error, element) {
                            var error_id = $(element).attr("id");
                            var $field_error = $(".error_label_container[data-error-for='" + error_id + "']");
                            //console.log("Placing Error, element:" + error_id + ", Error: " + $(error).html());
                            $field_error.html(error);
                        },
                        unhighlight: function (element, errorClass) {
                            //$(element).parent().parent().removeClass(errorClass);
                            var error_id = $(element).attr("id");
                            var $field_error = $(".error_label_container[data-error-for='" + error_id + "']");
                            //console.log("Unhighlighting error for element:" + error_id + ", ErrorClass: " + errorClass);
                            $field_error.addClass("checked");
                            $field_error.removeClass(errorClass);
                        },
                        highlight: function (element, errorClass) {
                            //$(element).parent().parent().addClass(errorClass);
                            var error_id = $(element).attr("id");
                            var $field_error = $(".error_label_container[data-error-for='" + error_id + "']");
                            //console.log("Highlighting error for element:" + error_id + ", ErrorClass: " + errorClass);
                            $field_error.removeClass("checked");
                            $field_error.addClass(errorClass);
                        },
                        invalidHandler: function () {
                            //console.log("Invalid!");
                            dialog.$errorCount.empty();
                            dialog.$summary.show();
                            var numErrors = dialog.validator.numberOfInvalids();
                            if (numErrors === 1)
                                dialog.$errorCount.text("1 field is invalid");
                            else
                                dialog.$errorCount.text(numErrors + " fields are invalid");
                        },
                        errorContainer: "#add_edit_validation_summary",
                        success: function (label) {
                            label.html("&nbsp;");
                            label.parent().addClass('checked');
                            $(label).parent().parent().parent().removeClass('error');
                        },
                        onfocusout: function (element, event) {
                            dialog.validator.form();
                            /*
                            return;
        
                            var also_validate = $(element).attr("data-also-validate");
                            if(also_validate)
                            {
                                var fields_to_validate = also_validate.split(" ");
                                fields_to_validate.forEach(function(item){
                                   $("#"+item).valid();
                                });
                            }
        
                            $.validator.defaults.onfocusout.call(this, element, event);
                            //
                            */
                        }
        
                    };
                    dialog.validator = null;
                    // configure the modal hidden event.  Isn't it funny that bootstrap's own shortenting of their name is BS?
                    dialog.$addEditDialog.on("hidden.bs.modal", function () {
                        // Clear out error summary
                        dialog.$errorCount.empty();
                        dialog.$errorList.empty();
                        dialog.$summary.hide();
                        // Destroy the validator if it exists, both to save on resources, and to clear out any leftover junk.
                        if (dialog.validator != null) {
                            dialog.validator.destroy();
                            dialog.validator = null;
                        }
                    });
                    // configure the dialog show event
                    dialog.$addEditDialog.on("show.bs.modal", function () {
                        Octolapse.Settings.AddEditProfile({
                            "profileObservable": dialog.profileObservable,
                            "templateName": dialog.templateName
                        });
                        // Adjust the margins, height and position
                        // Set title
                        dialog.$dialogTitle.text(options.title);
                        if(options.warning == null)
                        {
                            dialog.$dialogWarningContainer.hide();
                            dialog.$dialogWarningText.text("");
                        }
                        else
                        {
                            dialog.$dialogWarningText.text(options.warning);
                            dialog.$dialogWarningContainer.show();
        
                        }
        
                        dialog.$addEditDialog.css({
                            width: 'auto',
                            'margin-left': function () {
                                return -($(this).width() / 2);
                            }
                        });
        
                        // Initialize the profile.
                        var onShow = Octolapse.Settings.AddEditProfile().profileObservable().onShow;
                        if (typeof onShow == 'function') {
                            onShow();
                        }
                    });
                    // Configure the shown event
                    dialog.$addEditDialog.on("shown.bs.modal", function () {
                        dialog.validator = dialog.$addEditForm.validate(rules);
                        dialog.validator.form()
                        // Remove any click event bindings from the cancel button
                        dialog.$cancelButton.unbind("click");
                        // Called when the user clicks the cancel button in any add/update dialog
                        dialog.$cancelButton.bind("click", function () {
                            // Hide the dialog
                            self.hideAddEditDialog();
                        });
        
                        // remove any click event bindings from the defaults button
                        dialog.$defaultButton.unbind("click");
                        dialog.$defaultButton.bind("click", function () {
                            var newProfile = dialog.sender.getResetProfile(Octolapse.Settings.AddEditProfile().profileObservable());
                            Octolapse.Settings.AddEditProfile().profileObservable(newProfile);
        
                        });
        
                        // Remove any click event bindings from the save button
                        dialog.$saveButton.unbind("click");
                        // Called when a user clicks the save button on any add/update dialog.
                        dialog.$saveButton.bind("click", function () {
                            if (dialog.$addEditForm.valid()) {
                                // the form is valid, add or update the profile
                                self.addUpdateProfile(Octolapse.Settings.AddEditProfile());
                            }
                            else {
                                // Search for any hidden elements that are invalid
                                //console.log("Checking ofr hidden field error");
                                var $fieldErrors = dialog.$addEditForm.find('.error_label_container.error');
                                $fieldErrors.each(function (index, element) {
                                    // Check to make sure the field is hidden.  If it's not, don't bother showing the parent container.
                                    // This can happen if more than one field is invalid in a hidden form
                                    var $errorContainer = $(element);
                                    if (!$errorContainer.is(":visible")) {
                                        //console.log("Hidden error found, showing");
                                        var $collapsableContainer = $errorContainer.parents(".collapsible");
                                        if ($collapsableContainer.length > 0)
                                        // The containers may be nested, show each
                                            $collapsableContainer.each(function (index, container) {
                                                //console.log("Showing the collapsed container");
                                                $(container).show();
                                            });
                                    }
        
                                });
        
                                // The form is invalid, add a shake animation to inform the user
                                $(dialog.$addEditDialog).addClass('shake');
                                // set a timeout so the dialog stops shaking
                                setTimeout(function () {
                                    $(dialog.$addEditDialog).removeClass('shake');
                                }, 500);
                            }
        
                        });
                    });
                    // Open the add/edit profile dialog
                    dialog.$addEditDialog.modal();
                };
        
        
        
            };
            // Bind the settings view model to the plugin settings element
            OCTOPRINT_VIEWMODELS.push([
                Octolapse.SettingsViewModel
                , ["settingsViewModel", "loginStateViewModel"]
                , ["#octolapse_plugin_settings", "#octolapse_settings_nav", "#octolapse_about_tab"]
            ]);
        
        
        });
        
        
        
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.settings.main.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function () {
        
            Octolapse.MainSettingsViewModel = function (parameters) {
                // Create a reference to this object
                var self = this;
        
                // Add this object to our Octolapse namespace
                Octolapse.SettingsMain = this;
                // Assign the Octoprint settings to our namespace
                self.global_settings = parameters[0];
        
                // Settings values
                self.is_octolapse_enabled = ko.observable();
                self.auto_reload_latest_snapshot = ko.observable();
                self.auto_reload_frames = ko.observable();
                self.show_navbar_icon = ko.observable();
                self.show_navbar_when_not_printing = ko.observable();
                self.show_real_snapshot_time = ko.observable();
                self.cancel_print_on_startup_error = ko.observable();
                self.show_position_state_changes = ko.observable();
                self.show_position_changes = ko.observable();
                self.show_extruder_state_changes = ko.observable();
                self.show_trigger_state_changes = ko.observable();
        
        
                // Informational Values
                self.platform = ko.observable();
        
        
                self.onBeforeBinding = function () {
        
                };
                // Get the dialog element
                self.onAfterBinding = function () {
        
        
        
                };
                /*
                    Show and hide the settings tabs based on the enabled parameter
                */
                self.setSettingsVisibility = function (isVisible) {
        
                    var octolapseSettings = $('#octolapse_settings');
        
                    if (isVisible) {
                        //console.log("Showing Settings")
                    }
        
                    else {
                        //console.log("Hiding settings")
                        octolapseSettings.find('div.tab-content .hide-disabled').each(function (index, element) {
                            // Clear any active tabs
                            $(element).removeClass('active');
                        });
                    }
                    octolapseSettings.find('ul.nav .hide-disabled').each(function (index, element) {
                        if (isVisible)
                            $(element).show();
                        else
                            $(element).hide();
                        $(element).removeClass('active');
                    });
        
                };
        
                self.update = function (settings) {
                    self.is_octolapse_enabled(settings.is_octolapse_enabled);
                    self.auto_reload_latest_snapshot(settings.auto_reload_latest_snapshot);
                    self.auto_reload_frames(settings.auto_reload_frames);
                    self.show_navbar_icon(settings.show_navbar_icon);
                    self.show_navbar_when_not_printing(settings.show_navbar_when_not_printing);
                    self.show_position_state_changes(settings.show_position_state_changes);
                    self.show_position_changes(settings.show_position_changes);
                    self.show_extruder_state_changes(settings.show_extruder_state_changes);
                    self.show_trigger_state_changes(settings.show_trigger_state_changes);
                    self.show_real_snapshot_time(settings.show_real_snapshot_time);
                    self.cancel_print_on_startup_error(settings.cancel_print_on_startup_error);
                    //self.platform(settings.platform());
        
        
                    // Set the tab-button/tab visibility
                    self.setSettingsVisibility(settings.is_octolapse_enabled);
                };
        
                self.toggleOctolapse = function(){
        
                    var previousEnabledValue = !Octolapse.Globals.enabled();
                    var data = {
                        "is_octolapse_enabled": Octolapse.Globals.enabled()
                    };
                    //console.log("Toggling octolapse.")
                    $.ajax({
                        url: "./plugin/octolapse/setEnabled",
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function () {
        
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            alert("Unable to enable/disable Octolapse.  Status: " + textStatus + ".  Error: " + errorThrown);
                            Octolapse.Globals.enabled(previousEnabledValue);
                        }
                    });
                    return true;
                }
        
                self.showEditMainSettingsPopup = function () {
                    //console.log("showing main settings")
                    self.is_octolapse_enabled(Octolapse.Globals.enabled());
                    self.auto_reload_latest_snapshot(Octolapse.Globals.auto_reload_latest_snapshot());
                    self.auto_reload_frames(Octolapse.Globals.auto_reload_frames());
                    self.show_navbar_icon(Octolapse.Globals.navbar_enabled());
                    self.show_navbar_when_not_printing(Octolapse.Globals.show_navbar_when_not_printing());
                    self.show_position_state_changes(Octolapse.Globals.show_position_state_changes());
                    self.show_position_changes(Octolapse.Globals.show_position_changes());
                    self.show_extruder_state_changes(Octolapse.Globals.show_extruder_state_changes());
                    self.show_trigger_state_changes(Octolapse.Globals.show_trigger_state_changes());
                    self.show_real_snapshot_time(Octolapse.Globals.show_real_snapshot_time());
                    self.cancel_print_on_startup_error(Octolapse.Globals.cancel_print_on_startup_error())
                    var dialog = this;
                    dialog.$editDialog = $("#octolapse_edit_settings_main_dialog");
                    dialog.$editForm = $("#octolapse_edit_main_settings_form");
                    dialog.$cancelButton = $("a.cancel", dialog.$addEditDialog);
                    dialog.$saveButton = $("a.save", dialog.$addEditDialog);
                    dialog.$defaultButton = $("a.set-defaults", dialog.$addEditDialog);
                    dialog.$summary = dialog.$editForm.find("#edit_validation_summary");
                    dialog.$errorCount = dialog.$summary.find(".error-count");
                    dialog.$errorList = dialog.$summary.find("ul.error-list");
                    dialog.$modalBody = dialog.$editDialog.find(".modal-body");
                    dialog.rules = {
                        rules: Octolapse.MainSettingsValidationRules.rules,
                        messages: Octolapse.MainSettingsValidationRules.messages,
                        ignore: ".ignore_hidden_errors:hidden",
                        errorPlacement: function (error, element) {
                            var $field_error = $(element).parent().parent().find(".error_label_container");
                            $field_error.html(error);
                            $field_error.removeClass("checked");
        
                        },
                        highlight: function (element, errorClass) {
                            //$(element).parent().parent().addClass(errorClass);
                            var $field_error = $(element).parent().parent().find(".error_label_container");
                            $field_error.removeClass("checked");
                            $field_error.addClass(errorClass);
                        },
                        unhighlight: function (element, errorClass) {
                            //$(element).parent().parent().removeClass(errorClass);
                            var $field_error = $(element).parent().parent().find(".error_label_container");
                            $field_error.addClass("checked");
                            $field_error.removeClass(errorClass);
                        },
                        invalidHandler: function () {
                            dialog.$errorCount.empty();
                            dialog.$summary.show();
                            var numErrors = dialog.validator.numberOfInvalids();
                            if (numErrors === 1)
                                dialog.$errorCount.text("1 field is invalid");
                            else
                                dialog.$errorCount.text(numErrors + " fields are invalid");
                        },
                        errorContainer: "#edit_validation_summary",
                        success: function (label) {
                            label.html("&nbsp;");
                            label.parent().addClass('checked');
                            $(label).parent().parent().parent().removeClass('error');
                        },
                        onfocusout: function (element, event) {
                            dialog.validator.form();
                        }
                    };
                    dialog.validator = null;
                    //console.log("Adding validator to main setting dialog.")
                    dialog.$editDialog.on("hidden.bs.modal", function () {
                        // Clear out error summary
                        dialog.$errorCount.empty();
                        dialog.$errorList.empty();
                        dialog.$summary.hide();
                        // Destroy the validator if it exists, both to save on resources, and to clear out any leftover junk.
                        if (dialog.validator != null) {
                            dialog.validator.destroy();
                            dialog.validator = null;
                        }
                    });
                    dialog.$editDialog.on("shown.bs.modal", function () {
                        // Create all of the validation rules
        
                        dialog.validator = dialog.$editForm.validate(dialog.rules);
        
                        // Remove any click event bindings from the cancel button
                        dialog.$cancelButton.unbind("click");
                        // Called when the user clicks the cancel button in any add/update dialog
                        dialog.$cancelButton.bind("click", function () {
                            // Hide the dialog
                            self.$editDialog.modal("hide");
                        });
        
                        // remove any click event bindings from the defaults button
                        dialog.$defaultButton.unbind("click");
                        dialog.$defaultButton.bind("click", function () {
                            // Set the options to the current settings
                            self.is_octolapse_enabled(true);
                            self.auto_reload_latest_snapshot(true);
                            self.auto_reload_frames(5);
                            self.show_navbar_icon(true);
                            self.show_navbar_when_not_printing(false);
                            self.show_position_state_changes(false);
                            self.show_position_changes(false);
                            self.show_extruder_state_changes(false);
                            self.show_trigger_state_changes(false);
        
                        });
        
                        // Remove any click event bindings from the save button
                        dialog.$saveButton.unbind("click");
                        // Called when a user clicks the save button on any add/update dialog.
                        dialog.$saveButton.bind("click", function ()
                        {
                            if (dialog.$editForm.valid()) {
                                // the form is valid, add or update the profile
                                var data = {
                                    "is_octolapse_enabled": self.is_octolapse_enabled()
                                    , "auto_reload_latest_snapshot": self.auto_reload_latest_snapshot()
                                    , "auto_reload_frames": self.auto_reload_frames()
                                    , "show_navbar_icon": self.show_navbar_icon()
                                    , "show_navbar_when_not_printing": self.show_navbar_when_not_printing()
                                    , "show_position_state_changes": self.show_position_state_changes()
                                    , "show_position_changes": self.show_position_changes()
                                    , "show_extruder_state_changes": self.show_extruder_state_changes()
                                    , "show_trigger_state_changes": self.show_trigger_state_changes()
                                    , "show_real_snapshot_time": self.show_real_snapshot_time()
                                    , "cancel_print_on_startup_error": self.cancel_print_on_startup_error()
                                    , "client_id": Octolapse.Globals.client_id
                                };
                                //console.log("Saving main settings.")
                                $.ajax({
                                    url: "./plugin/octolapse/saveMainSettings",
                                    type: "POST",
                                    data: JSON.stringify(data),
                                    contentType: "application/json",
                                    dataType: "json",
                                    success: function () {
                                        self.$editDialog.modal("hide");
                                    },
                                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                                        alert("Unable to save the main settings.  Status: " + textStatus + ".  Error: " + errorThrown);
                                    }
                                });
                            }
                            else
                            {
                                // Search for any hidden elements that are invalid
                                //console.log("Checking ofr hidden field error");
                                var $fieldErrors = dialog.$editForm.find('.error_label_container.error');
                                $fieldErrors.each(function (index, element) {
                                    // Check to make sure the field is hidden.  If it's not, don't bother showing the parent container.
                                    // This can happen if more than one field is invalid in a hidden form
                                    var $errorContainer = $(element);
                                    if (!$errorContainer.is(":visible")) {
                                        //console.log("Hidden error found, showing");
                                        var $collapsableContainer = $errorContainer.parents(".collapsible");
                                        if ($collapsableContainer.length > 0)
                                            // The containers may be nested, show each
                                            $collapsableContainer.each(function (index, container) {
                                                //console.log("Showing the collapsed container");
                                                $(container).show();
                                            });
                                    }
        
                                });
        
                                // The form is invalid, add a shake animation to inform the user
                                $(dialog.$editDialog).addClass('shake');
                                // set a timeout so the dialog stops shaking
                                setTimeout(function () { $(dialog.$editDialog).removeClass('shake'); }, 500);
                            }
        
                        });
                    });
        
        
                    dialog.$editDialog.modal();
                };
        
                Octolapse.MainSettingsValidationRules = {
                    rules: {
        
                    },
                    messages: {
        
                    }
                };
            };
            // Bind the settings view model to the plugin settings element
            OCTOPRINT_VIEWMODELS.push([
                Octolapse.MainSettingsViewModel
                , ["settingsViewModel"]
                , ["#octolapse_main_tab"]
            ]);
        });
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            Octolapse.ProfilesViewModel = function(settings) {
                // Create all observables and a reference to this instance for event handlers.
                var self = this;
        
                self.profiles = ko.observableArray();
                self.profileTypeName = ko.observable(settings.profileTypeName);
                self.default_profile = ko.observable();
                self.current_profile_guid = ko.observable();
                self.profileOptions = null;
                self.profileViewModelCreate = settings.profileViewModelCreateFunction;
                self.addEditTemplateName = settings.addEditTemplateName;
                self.profileValidationRules = settings.profileValidationRules;
                self.bindingElementId = settings.bindingElementId;
                self.addUpdatePath = settings.addUpdatePath;
                self.removeProfilePath = settings.removeProfilePath;
                self.setCurrentProfilePath = settings.setCurrentProfilePath;
        
                // Specialty function to return true if at least one camera is enabled
                self.hasOneEnabled = ko.pureComputed(function () {
                    for (var i = 0; i < self.profiles().length; i++)
                    {
                        if(self.profiles()[i].enabled())
                            return true;
                    }
                    return false;
        
                }, Octolapse.Cameras);
        
                // Add a helper function to show a flag if the current profile is not configured
                self.currentProfileConfigured = ko.pureComputed(function () {
                    if(self.profileTypeName == 'Printer')
                    {
                        var current_printer = self.currentProfile();
                        if(current_printer!=null && !current_printer.saved_by_user_flag())
                            return false;
                        return true;
                    }
                    return true;
                });
        
                // Created a sorted observable
                self.profiles_sorted = ko.computed(function() { return Octolapse.nameSort(self.profiles) });
        
                /*
                    Octoprint Viewmodel Events
                */
                // Adds or updats a profile via ajax
                self.addUpdateProfile = function(profile, onSuccess) {
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    //console.log("add/update profile")
                    var isNewProfile = profile().guid() === "";
                    var profile_js = null;
                    if(profile().toJS)
                        profile_js = profile().toJS();
                    else
                        profile_js = ko.toJS(profile);
        
                    var data = { "client_id": Octolapse.Globals.client_id, 'profile': profile_js, 'profileType': self.profileTypeName() };
                    $.ajax({
                        url: "./plugin/octolapse/" + self.addUpdatePath,
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (newProfile) {
        
                            newProfile = new self.profileViewModelCreate(newProfile); // Create our profile viewmodel
                            if (isNewProfile) {
                                //console.log("Adding new profile");
                                if (self.profiles().length === 0)
                                    self.current_profile_guid(newProfile.guid());
                                self.profiles.push(newProfile); // Since it's new, just add it.
                                // If there is only one profile, it's been set as the default profile
                                //console.log("There are currently " + self.profiles().length.toString() + " profiles.");
                            }
                            else {
                                // Since this is an existing element, we must replace the original with the  new one.
                                // First get the original one
                                var currentProfile = self.getProfileByGuid(newProfile.guid());
                                // Now replace with the new one!
                                self.profiles.replace(currentProfile, newProfile);
        
                            }
                            // Initiate the onSuccess callback.  Typically this would close an edit/add dialog, but
                            // maybe later we will want to do something else?  This will make it easier.
                            if (onSuccess != null) {
                                onSuccess(this, { "newProfile": newProfile });
                            }
        
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown) {
                            alert("Unable to add/update the " + self.profileTypeName() +" profile!.  Status: " + textStatus + ".  Error: " + errorThrown);
                        }
                    });
                };
                //Remove an existing profile from the server settings, then if successful remove it from the observable array.
                self.removeProfile = function (guid) {
                    var currentProfile = self.getProfileByGuid(guid)
                    if (confirm("Are you sure you want to permanently erase the profile:'" + currentProfile.name() + "'?")) {
                        var data = { "client_id": Octolapse.Globals.client_id,'guid': ko.toJS(guid), 'profileType': self.profileTypeName() };
                        $.ajax({
                            url: "./plugin/octolapse/" + self.removeProfilePath,
                            type: "POST",
                            data: JSON.stringify(data),
                            contentType: "application/json",
                            dataType: "json",
                            success: function (returnValue) {
                                if(returnValue.success)
                                    self.profiles.remove(self.getProfileByGuid(guid));
                                else
                                    alert("Unable to remove the " + currentProfile.name() +" profile!.  Error: " + returnValue.error);
        
                                // close modal dialog.
        
                            },
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                alert("Unable to remove the " + currentProfile.name() + " profile!.  Status: " + textStatus + ".  Error: " + errorThrown);
                            }
                        });
                    }
                };
                //Mark a profile as the current profile.
                self.setCurrentProfile = function(guid) {
                    var currentProfile = self.getProfileByGuid(guid)
                    var data = { "client_id" : Octolapse.Globals.client_id,'guid': ko.toJS(guid), 'profileType': self.profileTypeName() };
                    $.ajax({
                        url: "./plugin/octolapse/" + self.setCurrentProfilePath,
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function(result) {
                            // Set the current profile guid observable.  This will cause the UI to react to the change.
                            //console.log("current profile guid updated: " + result.guid)
                            self.current_profile_guid(result.guid);
                        },
                        error: function(XMLHttpRequest, textStatus, errorThrown) {
                            alert("Unable to set the current " + currentProfile.name() +" profile!.  Status: " + textStatus + ".  Error: " + errorThrown);
                        }
                    });
                };
                /*
                    Profile Create/Retrieve
                */
                // Creates a copy of an existing profile from the supplied guid.  If no guid is supplied (null or empty), it returns a new profile based on the default_profile settings
                self.getNewProfile = function(guid) {
                    var newProfile = null;
                    if (guid == null) {
                        newProfile = new self.profileViewModelCreate(ko.toJS(self.default_profile())); // Create our profile viewmodel
                    }
                    else {
                        var current_profile = ko.toJS(self.getProfileByGuid(guid))
                        if(current_profile == null)
                            return null;
        
                        newProfile = new self.profileViewModelCreate(ko.toJS(current_profile)); // Create our profile viewmodel
                    }
                    return newProfile;
                };
                // retrieves a profile fome the profiles array by GUID.
                // This isn't a particularly fast thing, so don't do it too often.
                self.getProfileByGuid = function(guid) {
                    var index = Octolapse.arrayFirstIndexOf(self.profiles(),
                        function(item) {
                            var itemGuid = item.guid();
                            return itemGuid === guid
                        }
                    );
                    if (index < 0) {
                        alert("Could not find a " + self.profileTypeName() +" profile with the guid:" + guid + "!");
                        return null;
                    }
                    return self.profiles()[index];
                };
                // Returns the current profile (the one with current_profile_guid = guid)
                self.currentProfile = function() {
                    var guid = self.current_profile_guid();
                    var index = Octolapse.arrayFirstIndexOf(self.profiles(),
                        function(item) {
                            var itemGuid = item.guid();
                            var matchFound = itemGuid === guid;
                            if (matchFound)
                                return matchFound
                        }
                    );
                    if (index < 0) {
                        return null;
                    }
                    return self.profiles()[index];
                };
        
                self.currentProfileName = function() {
                    var profile =self.currentProfile();
                    if(profile == null)
                        return "No default profile selected";
                    return profile.name();
                };
        
                self.getResetProfile = function(currentProfile) {
                    var defaultProfileClone = new self.profileViewModelCreate(ko.toJS(self.default_profile));
                    defaultProfileClone.name(currentProfile.name());
                    defaultProfileClone.guid(currentProfile.guid());
                    return defaultProfileClone;
                };
        
                self.toggle = Octolapse.Toggle;
        
                self.showAddEditDialog = function(guid, isCopy) {
                    //console.log("octolapse.profiles.js - Showing add edit dialog.")
                    isCopy = isCopy || false;
                    var title = null;
                    var addEditObservable = ko.observable();
                    var warning = null;
                    // get and configure the  profile
                    if (guid == null) {
                        title = "Add New " + settings.profileTypeName +" Profile";
                        newProfile = self.getNewProfile();
                        newProfile.name("New " + self.profileTypeName());
                        newProfile.guid("");
                    }
                    else {
                        var newProfile = self.getNewProfile(guid);
                        // If we don't find a profile, just return.  Something is messed up.
                        if (newProfile == null)
                            return;
                        if (isCopy === true)
                        {
                            newProfile.guid("");
                            newProfile.name(newProfile.name() + " - Copy");
                            title = _.sprintf("New " + settings.profileTypeName + " \"%(name)s\"", { name: newProfile.name() });
                        }
                        else
                        {
                            title = _.sprintf("Edit " + settings.profileTypeName + " \"%(name)s\"", { name: newProfile.name() });
                        }
                        //console.log("Checking for active timelapse")
                        warning = null;
                        if(Octolapse.Status.is_timelapse_active())
                        {
                             if(newProfile.profileTypeName() == 'Debug')
                             {
                                warning = "A timelapse is active.  All debug settings will IMMEDIATELY take effect, except for 'Test Mode' which will not take effect until the next print.";
                             }
                             else
                                warning = "A timelapse is active.  Any changes made here will NOT take effect until the next print.";
                        }
                    }
        
                    // Save the model into the addEditObservable
                    addEditObservable(newProfile);
        
                    Octolapse.Settings.showAddEditDialog({ "profileObservable": addEditObservable, "title": title, "templateName": self.addEditTemplateName, "validationRules": JSON.parse(JSON.stringify(self.profileValidationRules)), 'warning':warning },this);
                };
                /*
                    Set data prior to bindings
                */
                ko.applyBindings(self, document.getElementById(self.bindingElementId));
            };
        
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.printer.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            Octolapse.PrinterProfileValidationRules = {
                rules: {
                    min_x: { lessThanOrEqual: "#octolapse_printer_max_x" },
                    max_x: { greaterThanOrEqual: "#octolapse_printer_min_x"},
                    min_y: { lessThanOrEqual: "#octolapse_printer_max_y" },
                    max_y: { greaterThanOrEqual: "#octolapse_printer_min_y" },
                    min_z: { lessThanOrEqual: "#octolapse_printer_max_z" },
                    max_z: { greaterThanOrEqual: "#octolapse_printer_min_z" },
                    auto_position_detection_commands: { csvString: true },
                    printer_profile_other_slicer_retract_length: {required: true},
                    printer_profile_slicer_other_z_hop: {required: true},
                    slicer_slic3r_pe_small_perimeter_speed: {slic3rPEFloatOrPercent: true, slic3rPEFloatOrPercentSteps: true},
                    slicer_slic3r_pe_external_perimeter_speed: {slic3rPEFloatOrPercent: true, slic3rPEFloatOrPercentSteps: true},
                    slicer_slic3r_pe_solid_infill_speed: {slic3rPEFloatOrPercent: true, slic3rPEFloatOrPercentSteps: true},
                    slicer_slic3r_pe_top_solid_infill_speed: {slic3rPEFloatOrPercent: true, slic3rPEFloatOrPercentSteps: true},
                    slicer_slic3r_pe_first_layer_speed: {slic3rPEFloatOrPercent: true, slic3rPEFloatOrPercentSteps: true}
                },
                messages: {
                    name: "Please enter a name for your profile",
                    min_x : { lessThanOrEqual: "Must be less than or equal to the 'X - Width Max' field." },
                    max_x : { greaterThanOrEqual: "Must be greater than or equal to the ''X - Width Min'' field." },
                    min_y : { lessThanOrEqual: "Must be less than or equal to the 'Y - Width Max' field." },
                    max_y : { greaterThanOrEqual: "Must be greater than or equal to the ''Y - Width Min'' field." },
                    min_z : { lessThanOrEqual: "Must be less than or equal to the 'Z - Width Max' field." },
                    max_z: { greaterThanOrEqual: "Must be greater than or equal to the ''Z - Width Min'' field." },
                    auto_position_detection_commands: { csvString:"Please enter a series of gcode commands (without parameters) separated by commas, or leave this field blank." }
                }
            };
        
            Octolapse.PrinterProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Printer")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.description = ko.observable(values.description);
                // Saved by user flag, sent from server
                self.saved_by_user_flag = ko.observable(values.has_been_saved_by_user);
                // has_been_saved_by_user profile setting, computed and always returns true
                // This will switch has_been_saved_by_user from false to true
                // after any user save
                self.has_been_saved_by_user = ko.observable(true);
                self.slicer_type = ko.observable(values.slicer_type);
                self.snapshot_command = ko.observable(values.snapshot_command);
                self.printer_position_confirmation_tolerance = ko.observable(values.printer_position_confirmation_tolerance);
                self.auto_detect_position = ko.observable(values.auto_detect_position);
                self.auto_position_detection_commands = ko.observable(values.auto_position_detection_commands);
                self.origin_x = ko.observable(values.origin_x);
                self.origin_y = ko.observable(values.origin_y);
                self.origin_z = ko.observable(values.origin_z);
                self.abort_out_of_bounds = ko.observable(values.abort_out_of_bounds);
                self.override_octoprint_print_volume = ko.observable(values.override_octoprint_print_volume);
                self.min_x = ko.observable(values.min_x);
                self.max_x = ko.observable(values.max_x);
                self.min_y = ko.observable(values.min_y);
                self.max_y = ko.observable(values.max_y);
                self.min_z = ko.observable(values.min_z);
                self.max_z = ko.observable(values.max_z);
                self.priming_height = ko.observable(values.priming_height);
                self.e_axis_default_mode = ko.observable(values.e_axis_default_mode);
                self.g90_influences_extruder = ko.observable(values.g90_influences_extruder);
                self.xyz_axes_default_mode = ko.observable(values.xyz_axes_default_mode);
                self.units_default = ko.observable(values.units_default);
                self.axis_speed_display_units = ko.observable(values.axis_speed_display_units);
                self.default_firmware_retractions = ko.observable(values.default_firmware_retractions);
                self.default_firmware_retractions_zhop = ko.observable(values.default_firmware_retractions_zhop);
                self.suppress_snapshot_command_always = ko.observable(values.suppress_snapshot_command_always);
        
                self.create_helpers = function(values){
                    var self = this;
                    self.other_slicer_viewmodel = new Octolapse.create_other_slicer_viewmodel(values);
                    self.slic3r_pe_viewmodel = new Octolapse.create_slic3r_pe_viewmodel(values);
                    self.cura_viewmodel = new Octolapse.create_cura_viewmodel(values);
                    self.simplify_3d_viewmodel = new Octolapse.create_simplify_3d_viewmodel(values);
                };
                self.helpers = new self.create_helpers(values);
                /*
                    Create a computed for each profile variable (settings.py - printer class)
                */
                self.retract_length = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_retract_length();
                });
                self.retract_speed = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_retract_speed();
                });
                self.detract_speed = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_detract_speed();
                });
                self.movement_speed = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_movement_speed();
                });
                self.z_hop = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_z_hop();
                });
                self.z_hop_speed = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_z_hop_speed();
                });
                self.maximum_z_speed = ko.pureComputed(function(){
                   var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_maximum_z_speed !== undefined)
                        return slicer.get_maximum_z_speed();
                    return null;
                });
                self.print_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_print_speed !== undefined)
                        return slicer.get_print_speed();
                    return null;
                });
                self.perimeter_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_perimeter_speed !== undefined)
                        return slicer.get_perimeter_speed();
                    return null;
                });
                self.small_perimeter_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_small_perimeter_speed !== undefined)
                        return slicer.get_small_perimeter_speed();
                    return null;
                });
                self.external_perimeter_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_external_perimeter_speed !== undefined)
                        return slicer.get_external_perimeter_speed();
                    return null;
                });
                self.infill_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_infill_speed !== undefined)
                        return slicer.get_infill_speed();
                    return null;
                });
                self.solid_infill_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_solid_infill_speed !== undefined)
                        return slicer.get_solid_infill_speed();
                    return null;
                });
                self.top_solid_infill_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_top_solid_infill_speed !== undefined)
                        return slicer.get_top_solid_infill_speed();
                    return null;
                });
                self.support_speed = ko.pureComputed(function(){
                   var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_support_speed !== undefined)
                        return slicer.get_support_speed();
                    return null;
                });
                self.bridge_speed = ko.pureComputed(function(){
                   var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_bridge_speed !== undefined)
                        return slicer.get_bridge_speed();
                    return null;
                });
                self.gap_fill_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_gap_fill_speed !== undefined)
                        return slicer.get_gap_fill_speed();
                    return null;
                });
                self.first_layer_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_first_layer_speed !== undefined)
                        return slicer.get_first_layer_speed();
                    return null;
                });
                self.first_layer_travel_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_first_layer_travel_speed !== undefined)
                        return slicer.get_first_layer_travel_speed();
                    return null;
                });
                self.skirt_brim_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_skirt_brim_speed !== undefined)
                        return slicer.get_skirt_brim_speed();
                    return null;
                });
                self.above_raft_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_above_raft_speed !== undefined)
                        return slicer.get_above_raft_speed();
                    return null;
                });
                self.ooze_shield_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_ooze_shield_speed !== undefined)
                        return slicer.get_ooze_shield_speed();
                    return null;
                });
                self.prime_pillar_speed = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_prime_pillar_speed !== undefined)
                        return slicer.get_prime_pillar_speed();
                    return null;
                });
                self.speed_tolerance = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_speed_tolerance();
                });
                self.axis_speed_display_units = ko.pureComputed(function(){
                   return self.getCurrentSlicerVariables(self.slicer_type()).get_axis_speed_display_units();
                });
                self.first_layer_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_first_layer_speed_multiplier !== undefined)
                        return slicer.get_first_layer_speed_multiplier();
                    return null;
                });
                self.above_raft_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_above_raft_speed_multiplier !== undefined)
                        return slicer.get_above_raft_speed_multiplier();
                    return null;
                });
                self.prime_pillar_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_prime_pillar_speed_multiplier !== undefined)
                        return slicer.get_prime_pillar_speed_multiplier();
                    return null;
                });
                self.ooze_shield_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_ooze_shield_speed_multiplier !== undefined)
                        return slicer.get_ooze_shield_speed_multiplier();
                    return null;
                });
                self.outline_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_outline_speed_multiplier !== undefined)
                        return slicer.get_outline_speed_multiplier();
                    return null;
                });
                self.solid_infill_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_solid_infill_speed_multiplier !== undefined)
                        return slicer.get_solid_infill_speed_multiplier();
                    return null;
                });
                self.support_structure_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_support_structure_speed_multiplier !== undefined)
                        return slicer.get_support_structure_speed_multiplier();
                    return null;
                });
                self.bridging_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_bridging_speed_multiplier !== undefined)
                        return slicer.get_bridging_speed_multiplier();
                    return null;
                });
                self.small_perimeter_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_small_perimeter_speed_multiplier !== undefined)
                        return slicer.get_small_perimeter_speed_multiplier();
                    return null;
                });
                self.external_perimeter_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_external_perimeter_speed_multiplier !== undefined)
                        return slicer.get_external_perimeter_speed_multiplier();
                    return null;
                });
                self.top_solid_infill_speed_multiplier = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_top_solid_infill_speed_multiplier !== undefined)
                        return slicer.get_top_solid_infill_speed_multiplier();
                    return null;
                });
                self.small_perimeter_speed_text = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_small_perimeter_speed_text !== undefined)
                        return slicer.get_small_perimeter_speed_text();
                    return null;
                });
                self.external_perimeter_speed_text = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_external_perimeter_speed_text !== undefined)
                        return slicer.get_external_perimeter_speed_text();
                    return null;
                });
                self.solid_infill_speed_text = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_solid_infill_speed_text !== undefined)
                        return slicer.get_solid_infill_speed_text();
                    return null;
                });
                self.top_solid_infill_speed_text = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_top_solid_infill_speed_text !== undefined)
                        return slicer.get_top_solid_infill_speed_text();
                    return null;
                });
                self.first_layer_speed_text = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_first_layer_speed_text !== undefined)
                        return slicer.get_first_layer_speed_text();
                    return null;
                });
                self.slicer_speed_list = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.getSlicerSpeedList !== undefined)
                        return slicer.getSlicerSpeedList();
                    return [];
                });
                self.num_slow_layers = ko.pureComputed(function(){
                    var slicer = self.getCurrentSlicerVariables(self.slicer_type());
                    if (slicer.get_num_slow_layers !== undefined)
                        return slicer.get_num_slow_layers();
                    return null;
                });
                self.getNonUniqueSpeeds = ko.pureComputed(function () {
                    // Add all speeds to an array
                    var duplicate_map = {};
        
                    var speed_array = self.slicer_speed_list();
        
                    for (var index = 0, size = speed_array.length; index < size; index++) {
                        var cur_speed = speed_array[index];
                        if(cur_speed.speed != 0 && !cur_speed.speed)
                            continue;
                        if(duplicate_map[cur_speed.speed])
                            duplicate_map[cur_speed.speed].push(cur_speed.type);
                        else
                            duplicate_map[cur_speed.speed] = [cur_speed.type];
                    }
                    var output = []
                    for (var key in duplicate_map) {
                        var dup_item = duplicate_map[key];
                        var is_first = true;
                        var num_items = dup_item.length
                        if(num_items > 1) {
                            if(key == 0)
                                key = "(previous axis speed) 0 ";
                            var cur_output_string = key.toString() + " mm-min: ";
        
                            for (var index = 0; index < num_items; index ++) {
                                if (!is_first)
                                    cur_output_string += ", ";
                                cur_output_string += dup_item[index];
                                is_first = false;
                            }
                            cur_output_string += "";
                            output.push(cur_output_string);
                        }
                    }
                    return output;
                });
                self.getMissingSpeedsList = ko.pureComputed(function () {
                            // Add all speeds to an array
                    var missingSpeeds = [];
        
                    var speed_array = self.slicer_speed_list();
                    for (var index = 0, size = speed_array.length; index < size; index++) {
                        var cur_speed = speed_array[index];
                        if(cur_speed.speed != 0 && !cur_speed.speed)
                            missingSpeeds.push(cur_speed.type);
                    }
        
                    return missingSpeeds;
                });
                self.getCurrentSlicerVariables = function() {
                    switch(self.slicer_type())
                    {
                        case 'other':
                            return self.helpers.other_slicer_viewmodel;
                        case 'slic3r-pe':
                            return self.helpers.slic3r_pe_viewmodel;
                        case 'cura':
                            return self.helpers.cura_viewmodel;
                        case 'simplify-3d':
                            return self.helpers.simplify_3d_viewmodel;
                    }
                }
                self.toJS = function()
                {
                    var copy = ko.toJS(self);
                    delete copy.helpers;
                    return copy;
                };
        
            };
        
        
        });
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.printer.slicer.cura.js
        Octolapse.create_cura_viewmodel = function (profile_observables) {
            var self = this;
            self.get_axis_speed_display_units = function () {
                return 'mm-sec';
            };
            self.get_speed_tolerance = function () {
                // tolerance of 0.1 mm/min / 2
                return 0.1 / 60.0 / 2;
            };
        
            self.round_to_increment_mm_min = 0.00000166667;
            self.round_to_increment_mm_sec = 0.0001;
            self.round_to_increment_length = 0.0001;
            self.round_to_increment_num_layers = 1;
        
            self.rounding_extender_options = {
                axis_speed_unit:{
                    round_to_increment_mm_min: self.round_to_increment_mm_min,
                    round_to_increment_mm_sec:self.round_to_increment_mm_sec,
                    current_units_observable: self.get_axis_speed_display_units}};
            // Options for the round_to_increment extender for lengths
            self.round_to_increment_options_lengths = {
                round_to_increment:{round_to_increment: self.round_to_increment_length}
            };
            self.round_to_increment_options_num_layers = {
                round_to_increment:{round_to_increment: self.round_to_increment_num_layers}
            };
        
        
            // Initialize profile variables from observables
            self.retraction_distance = ko.observable(profile_observables.retract_length).extend(self.round_to_increment_options_lengths);
            self.z_hop_height = ko.observable(profile_observables.z_hop).extend(self.round_to_increment_options_lengths);
        
            self.retraction_retract_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.retract_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
        
            self.retraction_prime_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.detract_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.travel_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.movement_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.inner_wall_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.perimeter_speed,self.get_axis_speed_display_units(),profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.outer_wall_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.external_perimeter_speed,self.get_axis_speed_display_units(),profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.top_bottom_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.top_solid_infill_speed,self.get_axis_speed_display_units(),profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.infill_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.infill_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.print_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.print_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.initial_layer_print_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.first_layer_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.initial_layer_travel_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.first_layer_travel_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.skirt_brim_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.skirt_brim_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.maximum_z_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(profile_observables.maximum_z_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
        
            self.num_slow_layers = ko.observable(profile_observables.num_slow_layers).extend(self.round_to_increment_options_num_layers);
            /*
                Create a getter for each profile variable (settings.py - printer class)
            */
            self.get_retract_length = function () {
                return self.retraction_distance();
            };
            self.get_retract_speed = function () {
                return self.retraction_retract_speed();
            };
            self.get_detract_speed = function () {
                return self.retraction_prime_speed();
            };
            self.get_movement_speed = function () {
                return self.travel_speed();
            };
            self.get_z_hop = function () {
                return self.z_hop_height();
            };
            self.get_z_hop_speed = function () {
                var maximum_z_speed = self.maximum_z_speed()
                if ((maximum_z_speed || 0) == 0 || maximum_z_speed > self.travel_speed())
                    return self.travel_speed();
        
                return maximum_z_speed;
            };
            self.get_maximum_z_speed = function () {
                return self.maximum_z_speed();
            };
            self.get_print_speed = function () {
                return self.print_speed();
            };
            self.get_perimeter_speed = function () {
                return self.inner_wall_speed();
            };
            self.get_small_perimeter_speed = function () {
                return self.inner_wall_speed();
            };
            self.get_external_perimeter_speed = function () {
                return self.outer_wall_speed();
            };
            self.get_infill_speed = function () {
                return self.infill_speed();
            };
            self.get_solid_infill_speed = function () {
                return self.infill_speed();
            };
            self.get_top_solid_infill_speed = function () {
                return self.top_bottom_speed();
            };
            self.get_support_speed = function () {
                return self.print_speed();
            };
            self.get_bridge_speed = function () {
                return self.outer_wall_speed();
            };
            self.get_gap_fill_speed = function () {
                return self.print_speed();
            };
            self.get_print_speed = function () {
                return self.print_speed();
            }
            self.get_first_layer_speed = function () {
                return self.initial_layer_print_speed();
            };
            self.get_first_layer_travel_speed = function () {
                return self.initial_layer_travel_speed();
            };
            self.get_skirt_brim_speed = function () {
                return self.skirt_brim_speed();
            };
            self.get_num_slow_layers = function () {
                return self.num_slow_layers();
            }
            // Get a list of speeds for use with feature detection
            self.getSlicerSpeedList = function () {
                return [
                    {speed: Octolapse.roundToIncrement(self.print_speed() * 60.0, 0.1), type: "Normal Print"},
                    {speed: Octolapse.roundToIncrement(self.retraction_retract_speed() * 60.0, 0.1), type: "Retract"},
                    {speed: Octolapse.roundToIncrement(self.retraction_prime_speed() * 60.0, 0.1), type: "Prime"},
                    {speed: Octolapse.roundToIncrement(self.infill_speed() * 60.0, 0.1), type: "Infill"},
                    {speed: Octolapse.roundToIncrement(self.outer_wall_speed() * 60.0, 0.1), type: "Outer Wall"},
                    {speed: Octolapse.roundToIncrement(self.inner_wall_speed() * 60.0, 0.1), type: "Inner Wall"},
                    {speed: Octolapse.roundToIncrement(self.top_bottom_speed() * 60.0, 0.1), type: "Top/Bottom"},
                    {speed: Octolapse.roundToIncrement(self.travel_speed() * 60.0, 0.1), type: "Travel"},
                    {speed: Octolapse.roundToIncrement(self.initial_layer_print_speed() * 60.0, 0.1), type: "Initial Layer"},
                    {
                        speed: Octolapse.roundToIncrement(self.initial_layer_travel_speed() * 60.0, 0.1),
                        type: "Initial Layer Travel"
                    },
                    {speed: Octolapse.roundToIncrement(self.skirt_brim_speed() * 60.0, 0.1), type: "Skirt/Brim"},
                    {speed: Octolapse.roundToIncrement(self.get_z_hop_speed() * 60.0, 0.1), type: "Z Travel"},
                ];
            };
        
        };
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.printer.slicer.other.js
        Octolapse.create_other_slicer_viewmodel = function (profile_observables) {
            var self = this;
            self.round_to_increment_mm_min = 0.001;
            self.round_to_increment_mm_sec = 0.000001;
        
            self.axis_speed_display_units = ko.observable(profile_observables.axis_speed_display_units);
            self.retract_length = ko.observable(profile_observables.retract_length).extend({numeric: 4});
        
            self.z_hop = ko.observable(profile_observables.z_hop).extend({numeric: 4});
        
            self.rounding_extender_options = {axis_speed_unit:{round_to_increment_mm_min: self.round_to_increment_mm_min,round_to_increment_mm_sec:self.round_to_increment_mm_sec,current_units_observable: self.axis_speed_display_units}};
            self.speed_tolerance = ko.observable(profile_observables.speed_tolerance).extend(self.rounding_extender_options);
            self.movement_speed = ko.observable(profile_observables.movement_speed).extend(self.rounding_extender_options);
            self.retract_speed = ko.observable(profile_observables.retract_speed).extend(self.rounding_extender_options);
            self.detract_speed = ko.observable(profile_observables.detract_speed).extend(self.rounding_extender_options);
            self.print_speed = ko.observable(profile_observables.print_speed).extend(self.rounding_extender_options);
            self.z_hop_speed = ko.observable(profile_observables.z_hop_speed).extend(self.rounding_extender_options);
            self.perimeter_speed = ko.observable(profile_observables.perimeter_speed).extend(self.rounding_extender_options);
            self.small_perimeter_speed = ko.observable(profile_observables.small_perimeter_speed).extend(self.rounding_extender_options);
            self.external_perimeter_speed = ko.observable(profile_observables.external_perimeter_speed).extend(self.rounding_extender_options);
            self.infill_speed = ko.observable(profile_observables.infill_speed).extend(self.rounding_extender_options);
            self.solid_infill_speed = ko.observable(profile_observables.solid_infill_speed).extend(self.rounding_extender_options);
            self.top_solid_infill_speed = ko.observable(profile_observables.top_solid_infill_speed).extend(self.rounding_extender_options);
            self.support_speed = ko.observable(profile_observables.support_speed).extend(self.rounding_extender_options);
            self.bridge_speed = ko.observable(profile_observables.bridge_speed).extend(self.rounding_extender_options);
            self.gap_fill_speed = ko.observable(profile_observables.gap_fill_speed).extend(self.rounding_extender_options);
            self.first_layer_speed = ko.observable(profile_observables.first_layer_speed).extend(self.rounding_extender_options);
            self.first_layer_travel_speed = ko.observable(profile_observables.first_layer_travel_speed).extend(self.rounding_extender_options);
            self.skirt_brim_speed = ko.observable(profile_observables.skirt_brim_speed).extend(self.rounding_extender_options);
            self.above_raft_speed = ko.observable(profile_observables.above_raft_speed).extend(self.rounding_extender_options);
            self.ooze_shield_speed = ko.observable(profile_observables.ooze_shield_speed).extend(self.rounding_extender_options);
            self.prime_pillar_speed = ko.observable(profile_observables.prime_pillar_speed).extend(self.rounding_extender_options);
        
            /*
                Create a getter for each profile variable (settings.py - printer class)
            */
            self.get_retract_length = function () {
                return self.retract_length();
            };
            self.get_retract_speed = function () {
                return self.retract_speed();
            };
            self.get_detract_speed = function () {
                return self.detract_speed();
            };
            self.get_movement_speed = function () {
                return self.movement_speed();
            };
            self.get_z_hop = function () {
                return self.z_hop();
            };
            self.get_z_hop_speed = function () {
                return self.z_hop_speed();
            };
            self.get_maximum_z_speed = function () {
                return null;
            };
            self.get_print_speed = function () {
                return self.print_speed();
            };
            self.get_perimeter_speed = function () {
                return self.perimeter_speed();
            };
            self.get_small_perimeter_speed = function () {
                return self.small_perimeter_speed();
            };
            self.get_external_perimeter_speed = function () {
                return self.external_perimeter_speed();
            };
            self.get_infill_speed = function () {
                return self.infill_speed();
            };
            self.get_solid_infill_speed = function () {
                return self.solid_infill_speed();
            };
            self.get_top_solid_infill_speed = function () {
                return self.top_solid_infill_speed();
            };
            self.get_support_speed = function () {
                return self.support_speed();
            };
            self.get_bridge_speed = function () {
                return self.bridge_speed();
            };
            self.get_gap_fill_speed = function () {
                return self.gap_fill_speed();
            };
            self.get_first_layer_speed = function () {
                return self.first_layer_speed();
            };
            self.get_first_layer_travel_speed = function () {
                return self.first_layer_travel_speed();
            };
            self.get_skirt_brim_speed = function () {
                return self.skirt_brim_speed();
            };
            self.get_above_raft_speed = function () {
                return self.above_raft_speed();
            };
            self.get_ooze_shield_speed = function () {
                return self.ooze_shield_speed();
            };
            self.get_prime_pillar_speed = function () {
                return self.prime_pillar_speed();
            };
            self.get_speed_tolerance = function () {
                return self.speed_tolerance();
            };
            self.get_axis_speed_display_units = function () {
                return self.axis_speed_display_units();
            };
            // get the time component of the axis speed units (min/mm)
            self.getAxisSpeedTimeUnit = ko.pureComputed(function () {
                if (self.axis_speed_display_units() === "mm-min")
                    return 'min';
                if (self.axis_speed_display_units() === "mm-sec")
                    return 'sec';
                return '?';
            }, self);
            self.get_num_slow_layers = function () {
                return 0;
            }
            // Get a list of speeds for use with feature detection
            self.getSlicerSpeedList = function () {
                var conv = 1;
                if (self.axis_speed_display_units() === "mm-sec")
                    conv = 60;
        
                var speedTolerance = self.get_speed_tolerance()
        
                return [
                    {speed: Octolapse.roundToIncrement(self.movement_speed() * conv, self.get_speed_tolerance() * conv), type: "Movement"},
                    {speed: Octolapse.roundToIncrement(self.z_hop_speed() * conv, self.get_speed_tolerance() * conv), type: "Z Movement"},
                    {speed: Octolapse.roundToIncrement(self.retract_speed() * conv, self.get_speed_tolerance() * conv), type: "Retraction"},
                    {speed: Octolapse.roundToIncrement(self.detract_speed() * conv, self.get_speed_tolerance() * conv), type: "Detraction"},
                    {speed: Octolapse.roundToIncrement(self.print_speed() * conv, self.get_speed_tolerance() * conv), type: "Print"},
                    {speed: Octolapse.roundToIncrement(self.perimeter_speed() * conv, self.get_speed_tolerance() * conv), type: "Perimeter"},
                    {speed: Octolapse.roundToIncrement(self.small_perimeter_speed() * conv, self.get_speed_tolerance() * conv), type: "Small Perimeter"},
                    {speed: Octolapse.roundToIncrement(self.external_perimeter_speed() * conv, self.get_speed_tolerance() * conv), type: "External Perimeter"},
                    {speed: Octolapse.roundToIncrement(self.infill_speed() * conv, self.get_speed_tolerance() * conv), type: "Infill"},
                    {speed: Octolapse.roundToIncrement(self.solid_infill_speed() * conv, self.get_speed_tolerance() * conv), type: "Solid Infill"},
                    {speed: Octolapse.roundToIncrement(self.top_solid_infill_speed() * conv, self.get_speed_tolerance() * conv), type: "Top Solid Infill"},
                    {speed: Octolapse.roundToIncrement(self.support_speed() * conv, self.get_speed_tolerance() * conv), type: "Support"},
                    {speed: Octolapse.roundToIncrement(self.bridge_speed() * conv, self.get_speed_tolerance() * conv), type: "Bridge"},
                    {speed: Octolapse.roundToIncrement(self.gap_fill_speed() * conv, self.get_speed_tolerance() * conv), type: "Gap Fill"},
                    {speed: Octolapse.roundToIncrement(self.first_layer_speed() * conv, self.get_speed_tolerance() * conv), type: "First Layer"},
                    {speed: Octolapse.roundToIncrement(self.first_layer_travel_speed() * conv, self.get_speed_tolerance() * conv), type: "First Layer Travel"},
                    {speed: Octolapse.roundToIncrement(self.above_raft_speed() * conv, self.get_speed_tolerance() * conv), type: "Above Raft"},
                    {speed: Octolapse.roundToIncrement(self.ooze_shield_speed() * conv, self.get_speed_tolerance() * conv), type: "Ooze Shield"},
                    {speed: Octolapse.roundToIncrement(self.prime_pillar_speed() * conv, self.get_speed_tolerance() * conv), type: "Prime Pillar"},
                    {speed: Octolapse.roundToIncrement(self.skirt_brim_speed() * conv, self.get_speed_tolerance() * conv), type: "Skirt/Brim"}
        
                ];
            };
            self.axisSpeedDisplayUnitsChanged = function (obj, event) {
        
                if (Octolapse.Globals.is_admin()) {
                    if (event.originalEvent) {
                        // Get the current guid
                        var newUnit = $("#octolapse_axis_speed_display_unit_options").val();
                        var previousUnit = self.get_axis_speed_display_units();
                        if (newUnit === previousUnit) {
                            //console.log("Axis speed display units, no change detected!")
                            return false;
        
                        }
                        //console.log("Changing axis speed from " + previousUnit + " to " + newUnit)
                        // in case we want to have more units in the future, check all cases
                        // Convert all from mm-min to mm-sec
        
                        var axis_speed_round_to_increment = 0.000001;
                        var axis_speed_round_to_unit = 'mm-sec';
                        self.speed_tolerance(Octolapse.convertAxisSpeedUnit(self.get_speed_tolerance(), newUnit, previousUnit, axis_speed_round_to_increment, axis_speed_round_to_unit));
        
                        self.retract_speed(Octolapse.convertAxisSpeedUnit(self.get_retract_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.detract_speed(Octolapse.convertAxisSpeedUnit(self.get_detract_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.movement_speed(Octolapse.convertAxisSpeedUnit(self.get_movement_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.z_hop_speed(Octolapse.convertAxisSpeedUnit(self.get_z_hop_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
        
                        // Optional values
                        self.print_speed(Octolapse.convertAxisSpeedUnit(self.get_print_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.perimeter_speed(Octolapse.convertAxisSpeedUnit(self.get_perimeter_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.small_perimeter_speed(Octolapse.convertAxisSpeedUnit(self.get_small_perimeter_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.external_perimeter_speed(Octolapse.convertAxisSpeedUnit(self.get_external_perimeter_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.infill_speed(Octolapse.convertAxisSpeedUnit(self.get_infill_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.solid_infill_speed(Octolapse.convertAxisSpeedUnit(self.get_solid_infill_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.top_solid_infill_speed(Octolapse.convertAxisSpeedUnit(self.get_top_solid_infill_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.support_speed(Octolapse.convertAxisSpeedUnit(self.get_support_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.bridge_speed(Octolapse.convertAxisSpeedUnit(self.get_bridge_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
        
                        self.gap_fill_speed(Octolapse.convertAxisSpeedUnit(self.get_gap_fill_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.first_layer_speed(Octolapse.convertAxisSpeedUnit(self.get_first_layer_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.first_layer_travel_speed(Octolapse.convertAxisSpeedUnit(self.get_first_layer_travel_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.skirt_brim_speed(Octolapse.convertAxisSpeedUnit(self.get_skirt_brim_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
        
                        self.above_raft_speed(Octolapse.convertAxisSpeedUnit(self.get_above_raft_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.ooze_shield_speed(Octolapse.convertAxisSpeedUnit(self.get_ooze_shield_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        self.prime_pillar_speed(Octolapse.convertAxisSpeedUnit(self.get_prime_pillar_speed(), newUnit, previousUnit, self.round_to_increment_mm_min, previousUnit));
                        return true;
                    }
                }
            };
        };
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.printer.slicer.simplify_3d.js
        Octolapse.create_simplify_3d_viewmodel = function (profile_observables) {
            var self = this;
            self.get_axis_speed_display_units = function () {
                return 'mm-min';
            };
            self.get_speed_tolerance = function () {
                return 1;
            };
        
            self.round_to_increment_percent = 1;
            self.round_to_increment_speed_mm_min = 0.1;
            self.round_to_increment_length = 0.01;
            self.percent_value_default = 100.0;
        
            // Options for the round_to_increment extender for lengths
            self.round_to_increment_options_length = {
                round_to_increment:{round_to_increment: self.round_to_increment_length}
            };
            // Options for the round_to_increment extender for percents
            self.round_to_increment_options_percent = {
                round_to_increment:{round_to_increment: self.round_to_increment_percent}
            };
            // Options for the round_to_increment extender for speeds
            self.rounding_extender_options_speed = {
                axis_speed_unit:{
                    round_to_increment_mm_min: self.round_to_increment_speed_mm_min,
                    round_to_increment_mm_sec: self.round_to_increment_speed_mm_min/60,
                    current_units_observable: self.get_axis_speed_display_units}};
        
            // Initialize profile variables from observables
            // Lengths
            self.retraction_distance = ko.observable(Octolapse.roundToIncrement(profile_observables.retract_length, self.round_to_increment_length))
                .extend(self.round_to_increment_options_length);
            self.retraction_vertical_lift = ko.observable(Octolapse.roundToIncrement(profile_observables.z_hop, self.round_to_increment_length))
                .extend(self.round_to_increment_options_length);
            // Speeds
            self.retraction_retract_speed = ko.observable(Octolapse.convertAxisSpeedUnit(profile_observables.retract_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_speed_mm_min, 'mm-min'))
                .extend(self.rounding_extender_options_speed);
            self.default_printing_speed = ko.observable(Octolapse.convertAxisSpeedUnit(profile_observables.print_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_speed_mm_min, 'mm-min'))
                .extend(self.rounding_extender_options_speed);
            self.xy_axis_movement_speed = ko.observable(Octolapse.convertAxisSpeedUnit(profile_observables.movement_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_speed_mm_min, 'mm-min'))
                .extend(self.rounding_extender_options_speed);
            self.z_axis_movement_speed = ko.observable(Octolapse.convertAxisSpeedUnit(profile_observables.z_hop_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_speed_mm_min, 'mm-min'))
                .extend(self.rounding_extender_options_speed);
            // Percents
            self.first_layer_speed_multiplier = ko.observable(profile_observables.first_layer_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.above_raft_speed_multiplier = ko.observable(profile_observables.above_raft_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.prime_pillar_speed_multiplier = ko.observable(profile_observables.prime_pillar_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.ooze_shield_speed_multiplier = ko.observable(profile_observables.ooze_shield_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.outline_speed_multiplier = ko.observable(profile_observables.outline_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.solid_infill_speed_multiplier = ko.observable(profile_observables.solid_infill_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.support_structure_speed_multiplier = ko.observable(profile_observables.support_structure_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
            self.bridging_speed_multiplier = ko.observable(profile_observables.bridging_speed_multiplier || self.percent_value_default).extend(self.round_to_increment_options_percent);
        
            /*
                Create a getter for each profile variable (settings.py - printer class)
            */
            self.get_retract_length = function () {
                return self.retraction_distance();
            };
            self.get_retract_speed = function () {
                return self.retraction_retract_speed();
            };
            self.get_detract_speed = function () {
                return self.retraction_retract_speed();
            };
            self.get_movement_speed = function () {
                return self.xy_axis_movement_speed();
            };
            self.get_z_hop = function () {
                return self.retraction_vertical_lift();
            };
            self.get_z_hop_speed = function () {
                return self.z_axis_movement_speed();
            };
            self.get_print_speed = function () {
                return self.default_printing_speed();
            };
            self.get_perimeter_speed = function () {
                if (self.default_printing_speed() == null || self.outline_speed_multiplier() == null)
                    return null;
                var perimeter_speed_multiplier = 100.0 - ((100 - self.outline_speed_multiplier()) / 2.0)
                return Octolapse.roundToIncrement(self.default_printing_speed() * (perimeter_speed_multiplier / 100.0), self.get_speed_tolerance());
            };
            self.get_small_perimeter_speed = function () {
                if (self.default_printing_speed() == null || self.outline_speed_multiplier() == null)
                    return null;
                var perimeter_speed_multiplier = 100.0 - ((100 - self.outline_speed_multiplier()) / 2.0)
                return Octolapse.roundToIncrement(self.default_printing_speed() * (perimeter_speed_multiplier / 100.0), self.get_speed_tolerance());
            };
            self.get_external_perimeter_speed = function () {
                if (self.default_printing_speed() == null || self.outline_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.outline_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_infill_speed = function () {
                return self.default_printing_speed();
            };
            self.get_solid_infill_speed = function () {
                if (self.default_printing_speed() == null || self.solid_infill_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.solid_infill_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_top_solid_infill_speed = function () {
                if (self.default_printing_speed() == null || self.solid_infill_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.solid_infill_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_support_speed = function () {
                if (self.default_printing_speed() == null || self.support_structure_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.support_structure_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_bridge_speed = function () {
                if (self.default_printing_speed() == null || self.bridging_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.bridging_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_gap_fill_speed = function () {
                return self.default_printing_speed();
            };
            self.get_print_speed = function () {
                return self.default_printing_speed();
            }
            self.get_first_layer_speed = function () {
                if (self.default_printing_speed() == null || self.first_layer_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.first_layer_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_first_layer_travel_speed = function () {
                return self.xy_axis_movement_speed();
            };
            self.get_skirt_brim_speed = function () {
                return self.default_printing_speed();
            };
            self.get_first_layer_speed_multiplier = function () {
                return self.first_layer_speed_multiplier();
            };
            self.get_above_raft_speed_multiplier = function () {
                return self.above_raft_speed_multiplier();
            };
            self.get_prime_pillar_speed_multiplier = function () {
                return self.prime_pillar_speed_multiplier();
            };
            self.get_ooze_shield_speed_multiplier = function () {
                return self.ooze_shield_speed_multiplier();
            };
            self.get_outline_speed_multiplier = function () {
                return self.outline_speed_multiplier();
            };
            self.get_solid_infill_speed_multiplier = function () {
                return self.solid_infill_speed_multiplier();
            };
            self.get_support_structure_speed_multiplier = function () {
                return self.support_structure_speed_multiplier();
            };
            self.get_bridging_speed_multiplier = function () {
                return self.bridging_speed_multiplier();
            };
        
            self.get_above_raft_speed = function () {
                if (self.default_printing_speed() == null || self.above_raft_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.above_raft_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_ooze_shield_speed = function () {
                if (self.default_printing_speed() == null || self.ooze_shield_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.ooze_shield_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
            self.get_prime_pillar_speed = function () {
                if (self.default_printing_speed() == null || self.prime_pillar_speed_multiplier() == null)
                    return null;
                return Octolapse.roundToIncrement(self.default_printing_speed() * (self.prime_pillar_speed_multiplier() / 100.0), self.get_speed_tolerance());
            };
        
            self.get_num_slow_layers = function () {
                return 1;
            }
        
            self.roundSpeedForUniqueCheck = function (speed) {
                if (speed == null)
                    return null;
                speed -= 0.1;
                var rounded_value = Octolapse.roundToIncrement(speed, 1);
                return rounded_value;
            }
            // Get a list of speeds for use with feature detection
            self.getSlicerSpeedList = function () {
                return [
                    {speed: self.roundSpeedForUniqueCheck(self.get_retract_speed()), type: "Retraction"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_first_layer_speed()), type: "First Layer"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_above_raft_speed()), type: "Above Raft"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_prime_pillar_speed()), type: "Prime Pillar"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_ooze_shield_speed()), type: "Ooze Shield"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_print_speed()), type: "Default Printing"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_external_perimeter_speed()), type: "Exterior Outlines"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_perimeter_speed()), type: "Interior Outlines"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_solid_infill_speed()), type: "Solid Infill"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_support_speed()), type: "Support Structure"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_movement_speed()), type: "X/Y Movement"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_z_hop_speed()), type: "Z Movement"},
                    {speed: self.roundSpeedForUniqueCheck(self.get_bridge_speed()), type: "Bridging"},
        
                ];
            };
        
        };
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.printer.slicer.slic3r_pe.js
        Octolapse.create_slic3r_pe_viewmodel = function (profile_observables) {
            var self = this;
            self.get_axis_speed_display_units = function () {
                return "mm-sec"
            };
            self.get_speed_tolerance = function () {
                // 0.005 mm/min in mm-sec
                return 0.01 / 60.0 / 2.0;
            };
        
            self.round_to_increment_mm_min = 0.00000166667;
            self.round_to_increment_mm_sec = 0.0001;
            self.round_to_percent = 0.0001;
            self.round_to_increment_retraction_length = 0.000001;
            self.round_to_increment_lift_z = 0.0001;
        
            // Options for the round_to_increment extender for lengths
            self.round_to_increment_options_retraction_length = {
                round_to_increment:{round_to_increment: self.round_to_increment_retraction_length}
            };
        
            // Options for the round_to_increment extender for lengths
            self.round_to_increment_options_lift_z = {
                round_to_increment:{round_to_increment: self.round_to_increment_lift_z}
            };
            self.rounding_extender_options = {
                axis_speed_unit:{
                    round_to_increment_mm_min: self.round_to_increment_mm_min,
                    round_to_increment_mm_sec:self.round_to_increment_mm_sec,
                    current_units_observable: self.get_axis_speed_display_units}};
        
            self.rounding_extender_percent_options = {
                axis_speed_unit:{
                    round_to_increment_mm_min: self.round_to_increment_mm_min,
                    round_to_increment_mm_sec:self.round_to_increment_mm_sec,
                    current_units_observable: self.get_axis_speed_display_units,
                    round_to_percent: self.round_to_percent,
                    return_text: true}};
        
            // Initialize profile variables from observables
            // Lengths
            self.retract_length = ko.observable(profile_observables.retract_length).extend(self.round_to_increment_options_retraction_length);
            self.z_hop = ko.observable(profile_observables.z_hop).extend(self.round_to_increment_options_lift_z);
        
            // Speeds
            self.retract_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.retract_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.detract_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.detract_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.movement_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.movement_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.perimeter_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.perimeter_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.infill_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.infill_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.support_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.support_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.bridge_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.bridge_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
            self.gap_fill_speed = ko.observable(
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.gap_fill_speed, self.get_axis_speed_display_units(), profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)).extend(self.rounding_extender_options);
        
            // Speeds/Percents
            var small_perimeter_speed = profile_observables.small_perimeter_speed_text || (
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.small_perimeter_speed,
                    self.get_axis_speed_display_units(),
                    profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)
            );
            self.small_perimeter_speed_text = ko.observable((small_perimeter_speed || "").toString()).extend(self.rounding_extender_percent_options);
        
            var external_perimeter_speed = profile_observables.external_perimeter_speed_text || (
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.external_perimeter_speed,
                    self.get_axis_speed_display_units(),
                    profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)
            );
            self.external_perimeter_speed_text = ko.observable((external_perimeter_speed || "").toString()).extend(self.rounding_extender_percent_options);
        
            var solid_infill_speed = profile_observables.solid_infill_speed_text || (
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.solid_infill_speed,
                    self.get_axis_speed_display_units(),
                    profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)
            );
            self.solid_infill_speed_text = ko.observable((solid_infill_speed || "").toString()).extend(self.rounding_extender_percent_options);
        
            var top_solid_infill_speed = profile_observables.top_solid_infill_speed_text || (
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.top_solid_infill_speed,
                    self.get_axis_speed_display_units(),
                    profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)
            );
            self.top_solid_infill_speed_text = ko.observable((top_solid_infill_speed || "").toString()).extend(self.rounding_extender_percent_options);
        
            var first_layer_speed = profile_observables.first_layer_speed_text || (
                Octolapse.convertAxisSpeedUnit(
                    profile_observables.first_layer_speed,
                    self.get_axis_speed_display_units(),
                    profile_observables.axis_speed_display_units, self.round_to_increment_mm_sec)
            );
            self.first_layer_speed_text = ko.observable((first_layer_speed || "").toString()).extend(self.rounding_extender_percent_options);
            /*
                Create a getter for each profile variable (settings.py - printer class)
            */
            self.get_retract_length = function () {
                return self.retract_length();
            };
            self.get_retract_speed = function () {
                return self.retract_speed();
            };
            self.get_detract_speed = function () {
                if(self.detract_speed() === 0)
                    return self.retract_speed();
        
                return self.detract_speed();
            };
            self.get_movement_speed = function () {
                return self.movement_speed();
            };
            self.get_z_hop = function () {
                return self.z_hop();
            };
            self.get_z_hop_speed = function () {
                return self.movement_speed();
            };
            self.get_maximum_z_speed = function () {
                return null;
            };
            self.get_print_speed = function () {
                return null;
            };
            self.get_perimeter_speed = function () {
                return self.perimeter_speed();
            };
            self.get_small_perimeter_speed = function () {
                var value = self.small_perimeter_speed_text();
                if (Octolapse.isPercent(value)) {
                    var percent = Octolapse.parsePercent(value);
                    if (percent != null && self.perimeter_speed() != null)
                        return self.perimeter_speed() * percent / 100.0;
                }
                else {
                    return Octolapse.parseFloat(value);
                }
                return null;
            };
            self.get_small_perimeter_speed_multiplier = function () {
                var value = self.small_perimeter_speed_text();
                if (!Octolapse.isPercent(value))
                    return null;
                return Octolapse.parsePercent(value);
            }
            self.get_external_perimeter_speed = function () {
                var value = self.external_perimeter_speed_text();
                if (Octolapse.isPercent(value)) {
                    var percent = Octolapse.parsePercent(value);
                    if (percent != null && self.perimeter_speed() != null)
                        return self.perimeter_speed() * percent / 100.0;
                }
                else {
                    return Octolapse.parseFloat(value);
                }
                return null;
            };
            self.get_external_perimeter_speed_multiplier = function () {
                var value = self.external_perimeter_speed_text();
                if (!Octolapse.isPercent(value))
                    return null;
                return Octolapse.parsePercent(value);
            }
        
            self.get_infill_speed = function () {
                return self.infill_speed();
            };
            self.get_solid_infill_speed = function () {
                var value = self.solid_infill_speed_text();
                if (Octolapse.isPercent(value)) {
                    var percent = Octolapse.parsePercent(value);
                    if (percent != null && self.infill_speed() != null)
                        return self.infill_speed() * percent / 100.0;
                }
                else {
                    return Octolapse.parseFloat(value);
                }
                return null;
            };
            self.get_solid_infill_speed_multiplier = function () {
                var value = self.solid_infill_speed_text();
                if (!Octolapse.isPercent(value))
                    return null;
                return Octolapse.parsePercent(value);
            }
            self.get_top_solid_infill_speed = function () {
                var value = self.top_solid_infill_speed_text();
                if (Octolapse.isPercent(value)) {
                    var percent = Octolapse.parsePercent(value);
                    if (percent != null && self.get_solid_infill_speed() != null)
                        return self.get_solid_infill_speed() * percent / 100.0;
                }
                else {
                    return Octolapse.parseFloat(value);
                }
                return null;
            };
            self.get_top_solid_infill_speed_multiplier = function () {
                var value = self.top_solid_infill_speed_text();
                if (!Octolapse.isPercent(value))
                    return null;
                return Octolapse.parsePercent(value);
            }
        
            self.get_support_speed = function () {
                return self.support_speed();
            };
            self.get_bridge_speed = function () {
                return self.bridge_speed();
            };
            self.get_gap_fill_speed = function () {
                return self.gap_fill_speed();
            };
            self.get_first_layer_speed = function () {
                var value = self.first_layer_speed_text();
                if (Octolapse.isPercent(value))
                    return null;
        
                return Octolapse.parseFloat(value);
            };
            self.get_first_layer_speed_multiplier = function () {
                var value = self.first_layer_speed_text();
                if (!Octolapse.isPercent(value))
                    return null;
                return Octolapse.parsePercent(value);
            };
        
            self.get_first_layer_travel_speed = function () {
                return self.movement_speed();
            };
        
            self.get_small_perimeter_speed_text = function () {
                return self.small_perimeter_speed_text();
            };
            self.get_external_perimeter_speed_text = function () {
                return self.external_perimeter_speed_text();
            };
            self.get_solid_infill_speed_text = function () {
                return self.solid_infill_speed_text();
            };
            self.get_top_solid_infill_speed_text = function () {
                return self.top_solid_infill_speed_text();
            };
            self.get_first_layer_speed_text = function () {
                return self.first_layer_speed_text();
            };
        
            self.get_num_slow_layers = function () {
                return 1;
            }
            // Get a list of speeds for use with feature detection
        
            self.getSlicerSpeedList = function () {
                var inc = 0.01;
                var ret_det_inc = 1;
                var speed_list = [
                    {speed: Octolapse.roundToIncrement(self.get_retract_speed(), ret_det_inc) * 60, type: "Retraction"},
                    {speed: Octolapse.roundToIncrement(self.get_detract_speed(), ret_det_inc) * 60, type: "Detraction"},
                    {speed: Octolapse.roundToIncrement(self.get_perimeter_speed() * 60, inc), type: "Perimeters"},
                    {speed: Octolapse.roundToIncrement(self.get_small_perimeter_speed() * 60, inc), type: "Small Perimeters"},
                    {
                        speed: Octolapse.roundToIncrement(self.get_external_perimeter_speed() * 60, inc),
                        type: "External Perimeters"
                    },
                    {speed: Octolapse.roundToIncrement(self.get_infill_speed() * 60, inc), type: "Infill"},
                    {speed: Octolapse.roundToIncrement(self.get_solid_infill_speed() * 60, inc), type: "Solid Infill"},
                    {speed: Octolapse.roundToIncrement(self.get_top_solid_infill_speed() * 60, inc), type: "Top Solid Infill"},
                    {speed: Octolapse.roundToIncrement(self.get_support_speed() * 60, inc), type: "Supports"},
                    {speed: Octolapse.roundToIncrement(self.get_bridge_speed() * 60, inc), type: "Bridges"},
                    {speed: Octolapse.roundToIncrement(self.get_gap_fill_speed() * 60, inc), type: "Gaps"},
                    {speed: Octolapse.roundToIncrement(self.get_movement_speed() * 60, inc), type: "Movement"}
                ];
        
                if (self.get_first_layer_speed_multiplier() == null)
                    speed_list.push({speed: self.get_first_layer_speed(), type: "First Layer"})
                else {
                    Array.prototype.push.apply(speed_list, [
                        {
                            speed: Octolapse.roundToIncrement(self.get_perimeter_speed() * self.get_first_layer_speed_multiplier() / 100.0 * 60, inc),
                            type: "First Layer Perimeters"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_small_perimeter_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Small Perimeters"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_external_perimeter_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer External Perimeters"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_infill_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Infill"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_solid_infill_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Solid Infill"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_top_solid_infill_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Top Solid Infill"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_support_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Supports"
                        },
                        {
                            speed: Octolapse.roundToIncrement(self.get_gap_fill_speed() * self.get_first_layer_speed_multiplier() * 60 / 100.0, inc),
                            type: "First Layer Gaps"
                        }
                    ]);
                }
        
                return speed_list;
            };
        };
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.stabilization.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            Octolapse.StabilizationProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Stabilization")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.description = ko.observable(values.description);
                self.x_type = ko.observable(values.x_type);
                self.x_fixed_coordinate = ko.observable(values.x_fixed_coordinate);
                self.x_fixed_path = ko.observable(values.x_fixed_path);
                self.x_fixed_path_loop = ko.observable(values.x_fixed_path_loop);
                self.x_fixed_path_invert_loop = ko.observable(values.x_fixed_path_invert_loop);
                self.x_relative = ko.observable(values.x_relative);
                self.x_relative_print = ko.observable(values.x_relative_print);
                self.x_relative_path = ko.observable(values.x_relative_path);
                self.x_relative_path_loop = ko.observable(values.x_relative_path_loop);
                self.x_relative_path_invert_loop = ko.observable(values.x_relative_path_invert_loop);
                self.y_type = ko.observable(values.y_type);
                self.y_fixed_coordinate = ko.observable(values.y_fixed_coordinate);
                self.y_fixed_path = ko.observable(values.y_fixed_path);
                self.y_fixed_path_loop = ko.observable(values.y_fixed_path_loop);
                self.y_fixed_path_invert_loop = ko.observable(values.y_fixed_path_invert_loop);
                self.y_relative = ko.observable(values.y_relative);
                self.y_relative_print = ko.observable(values.y_relative_print);
                self.y_relative_path = ko.observable(values.y_relative_path);
                self.y_relative_path_loop = ko.observable(values.y_relative_path_loop);
                self.y_relative_path_invert_loop = ko.observable(values.y_relative_path_invert_loop);
            };
        
            Octolapse.StabilizationProfileValidationRules = {
                rules: {
                    name: "required"
                    ,x_type: "required"
                    ,x_fixed_coordinate: { number: true, required: true }
                    , x_fixed_path: { required: true, csvFloat: true}
                    , x_relative: { required: true, number: true,min:0.0, max:100.0 }
                    , x_relative_path: { required: true, csvRelative: true }
                    , y_type: "required"
                    , y_fixed_coordinate: { number: true, required: true }
                    , y_fixed_path: { required: true, csvFloat: true }
                    , y_relative: { required: true, number: true, min: 0.0, max: 100.0 }
                    , y_relative_path: { required: true, csvRelative: true }
        
                },
                messages: {
                    name: "Please enter a name for your profile"
                }
            };
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.snapshot.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function () {
        
            Octolapse.SnapshotProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Snapshot")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.description = ko.observable(values.description);
                self.trigger_type = ko.observable(values.trigger_type);
        
        
        
                /*
                    Timer Trigger Settings
                */
                self.timer_trigger_seconds = ko.observable(values.timer_trigger_seconds);
                /*
                    Layer/Height Trigger Settings
                */
                self.layer_trigger_height = ko.observable(values.layer_trigger_height);
        
                /*
                * Position Restrictions
                * */
                self.position_restrictions_enabled = ko.observable(values.position_restrictions_enabled);
                self.position_restrictions = ko.observableArray([]);
                for (var index = 0; index < values.position_restrictions.length; index++) {
                    self.position_restrictions.push(
                        ko.observable(values.position_restrictions[index]));
                }
        
                /*
                * Quaity Settiings
                */
                // Extruder State
                self.extruder_state_requirements_enabled = ko.observable(values.extruder_state_requirements_enabled);
                self.trigger_on_extruding = ko.observable(values.trigger_on_extruding);
                self.trigger_on_extruding_start = ko.observable(values.trigger_on_extruding_start);
                self.trigger_on_primed = ko.observable(values.trigger_on_primed);
                self.trigger_on_retracting_start = ko.observable(values.trigger_on_retracting_start);
                self.trigger_on_retracting = ko.observable(values.trigger_on_retracting);
                self.trigger_on_partially_retracted = ko.observable(values.trigger_on_partially_retracted);
                self.trigger_on_retracted = ko.observable(values.trigger_on_retracted);
                self.trigger_on_detracting_start = ko.observable(values.trigger_on_detracting_start);
                self.trigger_on_detracting = ko.observable(values.trigger_on_detracting);
                self.trigger_on_detracted = ko.observable(values.trigger_on_detracted);
        
                self.feature_restrictions_enabled  = ko.observable(values.feature_restrictions_enabled);
        
                self.feature_trigger_on_detract = ko.observable(values.feature_trigger_on_detract);
                self.feature_trigger_on_retract = ko.observable(values.feature_trigger_on_retract);
                self.feature_trigger_on_movement = ko.observable(values.feature_trigger_on_movement);
                self.feature_trigger_on_z_movement = ko.observable(values.feature_trigger_on_z_movement);
                self.feature_trigger_on_perimeters = ko.observable(values.feature_trigger_on_perimeters);
                self.feature_trigger_on_small_perimeters = ko.observable(values.feature_trigger_on_small_perimeters);
                self.feature_trigger_on_external_perimeters = ko.observable(values.feature_trigger_on_external_perimeters);
                self.feature_trigger_on_infill = ko.observable(values.feature_trigger_on_infill);
                self.feature_trigger_on_solid_infill = ko.observable(values.feature_trigger_on_solid_infill);
                self.feature_trigger_on_top_solid_infill = ko.observable(values.feature_trigger_on_top_solid_infill);
                self.feature_trigger_on_supports = ko.observable(values.feature_trigger_on_supports);
                self.feature_trigger_on_bridges = ko.observable(values.feature_trigger_on_bridges);
                self.feature_trigger_on_gap_fills = ko.observable(values.feature_trigger_on_gap_fills);
                self.feature_trigger_on_first_layer = ko.observable(values.feature_trigger_on_first_layer);
                self.feature_trigger_on_first_layer_travel = ko.observable(values.feature_trigger_on_first_layer_travel);
                self.feature_trigger_on_skirt_brim = ko.observable(values.feature_trigger_on_skirt_brim);
                self.feature_trigger_on_normal_print_speed = ko.observable(values.feature_trigger_on_normal_print_speed);
                self.feature_trigger_on_above_raft = ko.observable(values.feature_trigger_on_above_raft);
                self.feature_trigger_on_ooze_shield = ko.observable(values.feature_trigger_on_ooze_shield);
                self.feature_trigger_on_prime_pillar = ko.observable(values.feature_trigger_on_prime_pillar);
                self.feature_trigger_on_wipe = ko.observable(values.feature_trigger_on_wipe);
        
                self.require_zhop = ko.observable(values.require_zhop);
                self.lift_before_move = ko.observable(values.lift_before_move);
                self.retract_before_move = ko.observable(values.retract_before_move);
                /*
                * Snapshot Cleanup Settings
                */
                self.cleanup_after_render_complete = ko.observable(values.cleanup_after_render_complete);
                self.cleanup_after_render_fail = ko.observable(values.cleanup_after_render_fail);
        
        
                // Temporary variables to hold new layer position restrictions
                self.new_position_restriction_type = ko.observable('required');
                self.new_position_restriction_shape = ko.observable('rect');
                self.new_position_restriction_x = ko.observable(0);
                self.new_position_restriction_y = ko.observable(0);
                self.new_position_restriction_x2 = ko.observable(1);
                self.new_position_restriction_y2 = ko.observable(1);
                self.new_position_restriction_r = ko.observable(1);
                self.new_calculate_intersections = ko.observable(false);
        
                self.feature_template_id = ko.pureComputed(function(){
                    var current_printer = Octolapse.Printers.currentProfile();
                    if(current_printer==null)
                        return 'snapshot-missing-printer-feature-template';
                   var current_slicer_type = Octolapse.Printers.currentProfile().slicer_type();
                   switch(current_slicer_type)
                   {
                       case "other":
                           return "snapshot-other-slicer-feature-template";
                       case "slic3r-pe":
                           return "snapshot-sli3er-pe-feature-template";
                       case "cura":
                           return "snapshot-cura-feature-template";
                       case "simplify-3d":
                           return "snapshot-simplify-3d-feature-template";
                       default:
                           return "snapshot-other-slicer-feature-template";
                   }
                });
                self.has_non_unique_feature_detection_fields = ko.pureComputed(function(){
                    return self.non_unique_feature_detection_fields().length > 0
                });
                self.non_unique_feature_detection_fields = ko.pureComputed(function(){
                    var current_printer = Octolapse.Printers.currentProfile();
                    if(current_printer != null)
                        return current_printer.getNonUniqueSpeeds();
                    return [];
                });
                self.has_missing_feature_detection_fields = ko.pureComputed(function(){
                    var current_printer = Octolapse.Printers.currentProfile();
                    if(current_printer != null)
                        return current_printer.getMissingSpeedsList().length > 0;
                    return false;
                });
                self.missing_feature_detection_fields = ko.pureComputed(function(){
                    var current_printer = Octolapse.Printers.currentProfile();
                    if(current_printer != null)
                        return current_printer.getMissingSpeedsList();
                    return [];
                });
                self.addPositionRestriction = function () {
                    //console.log("Adding " + type + " position restriction.");
                    var restriction = ko.observable({
                        "Type": self.new_position_restriction_type(),
                        "Shape": self.new_position_restriction_shape(),
                        "X": self.new_position_restriction_x(),
                        "Y": self.new_position_restriction_y(),
                        "X2": self.new_position_restriction_x2(),
                        "Y2": self.new_position_restriction_y2(),
                        "R": self.new_position_restriction_r(),
                        "CalculateIntersections": self.new_calculate_intersections()
                    });
                    self.position_restrictions.push(restriction);
                };
        
                self.removePositionRestriction = function (index) {
                    //console.log("Removing " + type + " restriction at index: " + index());
                    self.position_restrictions.splice(index(), 1);
        
                };
            }
            Octolapse.SnapshotProfileValidationRules = {
                rules: {
                    /*Layer Position Restrictions*/
                    new_position_restriction_x: { lessThan: "#octolapse_new_position_restriction_x2:visible" },
                    new_position_restriction_x2: { greaterThan: "#octolapse_new_position_restriction_x:visible" },
                    new_position_restriction_y: { lessThan: "#octolapse_new_position_restriction_y2:visible" },
                    new_position_restriction_y2: { greaterThan: "#octolapse_new_position_restriction_y:visible" },
                    layer_trigger_enabled: {check_one: ".octolapse_trigger_enabled"},
                    gcode_trigger_enabled: {check_one: ".octolapse_trigger_enabled"},
                    timer_trigger_enabled: {check_one: ".octolapse_trigger_enabled"},
                },
                messages: {
                    name: "Please enter a name for your profile",
                    /*Layer Position Restrictions*/
                    new_position_restriction_x : { lessThan: "Must be less than the 'X2' field." },
                    new_position_restriction_x2: { greaterThan: "Must be greater than the 'X' field." },
                    new_position_restriction_y: { lessThan: "Must be less than the 'Y2." },
                    new_position_restriction_y2: { greaterThan: "Must be greater than the 'Y' field." },
                    layer_trigger_enabled: {check_one: "No triggers are enabled.  You must enable at least one trigger."},
                    gcode_trigger_enabled: {check_one: "No triggers are enabled.  You must enable at least one trigger."},
                    timer_trigger_enabled: {check_one: "No triggers are enabled.  You must enable at least one trigger."},
                }
            };
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.rendering.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            WatermarkImage = function(filepath) {
                var self = this;
                // The full file path on the OctoPrint server.
                self.filepath = filepath;
        
                // Returns just the filename portion from a full filepath.
                self.getFilename = function() {
                    // Function stolen from https://stackoverflow.com/a/25221100.
                    return self.filepath.split('\\').pop().split('/').pop();
                };
            };
        
            Font = function(filepath) {
                var self = this;
                // The full file path on the OctoPrint server.
                self.filepath = filepath;
        
                // Returns just the filename portion from a full filepath.
                self.getFilename = function() {
                    // Function stolen from https://stackoverflow.com/a/25221100.
                    return self.filepath.split('\\').pop().split('/').pop();
                };
            };
        
            Octolapse.RenderingProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Render")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.description = ko.observable(values.description);
                self.enabled = ko.observable(values.enabled);
                self.fps_calculation_type = ko.observable(values.fps_calculation_type);
                self.run_length_seconds = ko.observable(values.run_length_seconds);
                self.fps = ko.observable(values.fps);
                self.max_fps = ko.observable(values.max_fps);
                self.min_fps = ko.observable(values.min_fps);
                self.output_format = ko.observable(values.output_format);
                self.sync_with_timelapse = ko.observable(values.sync_with_timelapse);
                self.bitrate = ko.observable(values.bitrate);
                self.post_roll_seconds = ko.observable(values.post_roll_seconds);
                self.pre_roll_seconds = ko.observable(values.pre_roll_seconds);
                self.output_template = ko.observable(values.output_template);
                self.enable_watermark = ko.observable(values.enable_watermark);
                self.selected_watermark = ko.observable(values.selected_watermark); // Absolute filepath of the selected watermark.
                self.watermark_list = ko.observableArray(); // A list of WatermarkImages that are available for selection on the server.
                self.overlay_text_template = ko.observable(values.overlay_text_template);
                self.font_list = ko.observableArray(); // A list of Fonts that are available for selection on the server.
                self.overlay_font_path = ko.observable(values.overlay_font_path);
                self.overlay_font_size = ko.observable(values.overlay_font_size);
                // Text position as a JSON string.
                self.overlay_text_pos = ko.pureComputed({
                    read: function() {
                        var x = +self.overlay_text_pos_x();
                        var y = +self.overlay_text_pos_y();
                        // Validate x and y.
                        // Ensure they are integers.
                        if (self.overlay_text_pos_x().length == 0 || x % 1 != 0 || self.overlay_text_pos_y().length == 0 || y % 1 != 0) {
                            return "";
                        }
        
                        return JSON.stringify([x, y]);
                    },
                    write: function(value) {
                        if (value === undefined) {
                            return;
                        }
                        xy = JSON.parse(value);
                        self.overlay_text_pos_x(xy[0]);
                        self.overlay_text_pos_y(xy[1]);
                    },
                });
                self.overlay_text_pos_x = values.overlay_text_pos_x === undefined ? ko.observable() : ko.observable(values.overlay_text_pos_x);
                self.overlay_text_pos_y = values.overlay_text_pos_y === undefined ? ko.observable() : ko.observable(values.overlay_text_pos_y);
                self.overlay_text_pos(values.overlay_text_pos);
                self.overlay_text_alignment = ko.observable(values.overlay_text_alignment);
                self.overlay_text_valign = ko.observable(values.overlay_text_valign);
                self.overlay_text_halign = ko.observable(values.overlay_text_halign);
                // The overlay text colour in as a 4-element array, represented in a string. Note values vary from 0-255.
                // ie. [57, 64, 32, 25]
                self.overlay_text_color = ko.observable(values.overlay_text_color);
                // The overlay text color formatted as a CSS value. Note RGB vary from 0-255, but A varies from 0-1.
                // ie. rgba(57, 64, 32, 0.1).
                self.overlay_text_color_as_css = ko.pureComputed({
                    read: function () {
                        // Convert to js.
                        var rgba = JSON.parse(self.overlay_text_color());
                        // Divide alpha by 255.
                        rgba[3] = rgba[3] / 255;
                        // Build the correct string.
                        return 'rgba(' + rgba.join(', ') + ')'
                    },
                    write: function (value) {
                        // Extract values.
                        var rgba = /rgba\((\d+),\s*(\d+),\s*(\d+),\s(\d*\.?\d+)\)/.exec(value).slice(1).map(Number);
                        // Multiply alpha by 255 and round.
                        rgba[3] = Math.round(rgba[3] * 255);
                        // Write to variable.
                        self.overlay_text_color(JSON.stringify(rgba));
                    },
                });
        
                self.overlay_preview_image = ko.observable('');
                self.overlay_preview_image_error = ko.observable('');
                self.thread_count = ko.observable(values.thread_count)
                self.overlay_preview_image_src = ko.computed(function() {
                    return 'data:image/jpeg;base64,' + self.overlay_preview_image();
                });
                self.overlay_preview_image_alt_text = ko.computed(function() {
                    if (self.overlay_preview_image_error.length == 0) {
                        return 'A preview of the overlay text.'
                    }
                    return 'Image could not be retrieved from server. The error returned was: ' + self.overlay_preview_image_error() + '.';
                });
        
                self.can_synchronize_format = ko.pureComputed(function() {
                   return ['mp4','h264'].indexOf(self.output_format()) > -1;
                });
        
                // This function is called when the Edit Profile dialog shows.
                self.onShow = function() {
                     $('#overlay_color').minicolors({format: 'rgb', opacity: true});
                     self.updateWatermarkList();
                     self.updateFontList();
                     self.initWatermarkUploadButton();
                     self.requestOverlayPreview();
        
                };
        
                self.selectWatermark = function(watermark_image) {
                    if (watermark_image === undefined) {
                        self.enable_watermark(false);
                        self.selected_watermark("");
                        return;
                    }
                    self.enable_watermark(true);
                    self.selected_watermark(watermark_image.filepath);
                };
        
                self.deleteWatermark = function(watermarkImage, event) {
                    OctoPrint.postJson(OctoPrint.getBlueprintUrl('octolapse') +
                        'rendering/watermark/delete', {'path': watermarkImage.filepath}, {'Content-Type':'application/json'})
                            .then(function(response) {
                                // Deselect the watermark if we just deleted the selected watermark.
                                if (self.selected_watermark() == watermarkImage.filepath) {
                                    self.selectWatermark();
                                }
                                self.updateWatermarkList();
                            }, function(response) {
                                // TODO: Display error message in UI.
                                //console.log("Failed to delete " + watermarkImage.filepath);
                                //console.log(response);
                            });
                    event.stopPropagation();
                };
        
                // Load watermark list from server-side Octolapse directory.
                self.updateWatermarkList = function() {
        
                     return OctoPrint.get(OctoPrint.getBlueprintUrl('octolapse') +
                        'rendering/watermark')
                            .then(function(response) {
                                self.watermark_list.removeAll()
                                // The let format is not working in some versions of safari
                                for (var index = 0; index < response['filepaths'].length;index++) {
                                    self.watermark_list.push(new WatermarkImage(response['filepaths'][index]));
                                }
                             }, function(response) {
                                self.watermark_list.removeAll()
                                // Hacky solution, but good enough. We shouldn't encounter this error too much anyways.
                                self.watermark_list.push(new WatermarkImage("Failed to load watermarks from Octolapse data directory."));
                             });
                };
        
                self.initWatermarkUploadButton = function() {
                     // Set up the file upload button.
                     var $watermarkUploadElement = $('#octolapse_watermark_path_upload');
                     var $progressBarContainer = $('#octolapse-upload-watermark-progress');
                     var $progressBar = $progressBarContainer.find('.progress-bar');
        
                     $watermarkUploadElement.fileupload({
                        dataType: "json",
                        maxNumberOfFiles: 1,
                        headers: OctoPrint.getRequestHeaders(),
                        // Need to chunk large image files or else OctoPrint/Flask will reject them.
                        // TODO: Octoprint limits file upload size on a per-endpoint basis.
                        // http://docs.octoprint.org/en/master/plugins/hooks.html#octoprint-server-http-bodysize
                        maxChunkSize: 100000,
                        progressall: function (e, data) {
                            // TODO: Get a better progress bar implementation.
                            var progress = parseInt(data.loaded / data.total * 100, 10);
                            $progressBar.text(progress + "%");
                            $progressBar.animate({'width': progress + '%'}, {'queue':false});
                        },
                        done: function(e, data) {
                            $progressBar.text("Done!");
                            $progressBar.animate({'width': '100%'}, {'queue':false});
                            self.updateWatermarkList().then(function() {
                                // Find the new watermark in the list and select it.
                                var matchingWatermarks = [];
                                // The lambda version was not working in safari
                                for(var index=0;index<self.watermark_list();index++)
                                {
                                    if(data.files[0] == self.watermark_list()[index].getFilename())
                                        matchingWatermarks.push(self.watermark_list()[index]);
                                }
                                //var matchingWatermarks = self.watermark_list().filter(w=>w.getFilename() == data.files[0].name);
                                if (matchingWatermarks.length == 0) {
                                    //console.log("Error: No matching watermarks found!");
                                    return
                                }
                                if (matchingWatermarks > 1){
                                    //console.log("Error: More than one matching watermark found! Selecting best guess.");
                                }
                                self.selectWatermark(matchingWatermarks[0]);
                            });
                        },
                        fail: function(e, data) {
                            $progressBar.text("Failed...").addClass('failed');
                            $progressBar.animate({'width': '100%'}, {'queue':false});
                        }
                     });
                };
        
                // Load font list from server-side.
                self.updateFontList = function() {
                     return OctoPrint.get(OctoPrint.getBlueprintUrl('octolapse') + 'rendering/font')
                            .then(function(response) {
                                self.font_list.removeAll();
                                // The let expression was not working in safari
                                for (var index = 0; index< response.length; index++) {
                                    self.font_list.push(new Font(response[index]));
                                }
                             }, function(response) {
                                // Failed to load any fonts.
                                self.font_list.removeAll();
                             });
                };
        
                // Select a specific font for the overlay.
                self.selectOverlayFont = function(font) {
                    self.overlay_font_path(font.filepath);
                };
        
                // Request a preview of the overlay from the server.
                self.requestOverlayPreview = function() {
                    data = {
                            'overlay_text_template': self.overlay_text_template(),
                            'overlay_font_path': self.overlay_font_path(),
                            'overlay_font_size': self.overlay_font_size(),
                            'overlay_text_pos': self.overlay_text_pos(),
                            'overlay_text_alignment': self.overlay_text_alignment(),
                            'overlay_text_valign': self.overlay_text_valign(),
                            'overlay_text_halign': self.overlay_text_halign(),
                            'overlay_text_color': self.overlay_text_color(),
                    };
                    OctoPrint.post(OctoPrint.getBlueprintUrl('octolapse') + 'rendering/previewOverlay', data)
                        .then(function(response, success_name, response_status) {
                            // Loaded the overlay!
                            self.overlay_preview_image(response.image);
                            self.overlay_preview_image_error('');
                        },
                        function(response_status, error_name, stack_trace) {
                            // Failed to load an overlay.
                            //console.log('Failed to load overlay preview from server.')
                            //console.log(stack_trace);
                            self.overlay_preview_image('');
                            self.overlay_preview_image_error('Error loading overlay preview: ' + error_name + '. Click to refresh.');
                        });
                };
        
                self.toJS = function()
                {
                    var copy = ko.toJS(self);
                    delete copy.font_list;
                    delete copy.overlay_preview_image;
                    delete copy.overlay_preview_image_src;
                    return copy;
                };
            };
            Octolapse.RenderingProfileValidationRules = {
                rules: {
                    bitrate: { required: true, ffmpegBitRate: true },
                    output_format : {required: true},
                    fps_calculation_type: {required: true},
                    min_fps: { lessThanOrEqual: '#rendering_profile_max_fps' },
                    max_fps: { greaterThanOrEqual: '#rendering_profile_min_fps' },
                    overlay_text_valign: {required: true},
                    overlay_text_halign: {required: true},
                    overlay_text_alignment: {required: true},
                    output_template: {
                        remote: {
                            url: "./plugin/octolapse/validateRenderingTemplate",
                            type:"post"
                        }
                    },
                    overlay_text_template: {
                        remote: {
                            url: "./plugin/octolapse/validateOverlayTextTemplate",
                            type:"post"
                        }
                    },
                    octolapse_overlay_font_size: { required: true, integerPositive: true },
                    octolapse_overlay_text_pos: { required: true },
                },
                messages: {
                    name: "Please enter a name for your profile",
                    min_fps: { lessThanOrEqual: 'Must be less than or equal to the maximum fps.' },
                    max_fps: { greaterThanOrEqual: 'Must be greater than or equal to the minimum fps.' },
                    output_template: { octolapseRenderingTemplate: 'Either there is an invalid token in the rendering template, or the resulting file name is not valid.' },
                    overlay_text_template: { octolapseOverlayTextTemplate: 'Either there is an invalid token in the overlay text template, or the resulting file name is not valid.' },
                    octolapse_overlay_text_pos: { required: 'Position offsets must be valid integers.' },
                }
            };
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.camera.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            Octolapse.CameraProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Camera")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.enabled = ko.observable(values.enabled);
                self.description = ko.observable(values.description);
                self.camera_type = ko.observable(values.camera_type);
                self.gcode_camera_script = ko.observable(values.gcode_camera_script);
                self.on_print_start_script = ko.observable(values.on_print_start_script);
                self.on_before_snapshot_script = ko.observable(values.on_before_snapshot_script);
                self.external_camera_snapshot_script = ko.observable(values.external_camera_snapshot_script);
                self.on_after_snapshot_script = ko.observable(values.on_after_snapshot_script);
                self.on_before_render_script = ko.observable(values.on_before_render_script);
                self.on_after_render_script = ko.observable(values.on_after_render_script);
                self.delay = ko.observable(values.delay);
                self.timeout_ms = ko.observable(values.timeout_ms);
                self.apply_settings_before_print = ko.observable(values.apply_settings_before_print);
                self.address = ko.observable(values.address);
                self.snapshot_request_template = ko.observable(values.snapshot_request_template);
                self.snapshot_transpose = ko.observable(values.snapshot_transpose);
                self.ignore_ssl_error = ko.observable(values.ignore_ssl_error);
                self.username = ko.observable(values.username);
                self.password = ko.observable(values.password);
                self.brightness = ko.observable(values.brightness);
                self.brightness_request_template = ko.observable(values.brightness_request_template);
                self.contrast = ko.observable(values.contrast);
                self.contrast_request_template = ko.observable(values.contrast_request_template);
                self.saturation = ko.observable(values.saturation);
                self.saturation_request_template = ko.observable(values.saturation_request_template);
                self.white_balance_auto = ko.observable(values.white_balance_auto);
                self.white_balance_auto_request_template = ko.observable(values.white_balance_auto_request_template);
                self.gain = ko.observable(values.gain);
                self.gain_request_template = ko.observable(values.gain_request_template);
                self.powerline_frequency = ko.observable(values.powerline_frequency);
                self.powerline_frequency_request_template = ko.observable(values.powerline_frequency_request_template);
                self.white_balance_temperature = ko.observable(values.white_balance_temperature);
                self.white_balance_temperature_request_template = ko.observable(values.white_balance_temperature_request_template);
                self.sharpness = ko.observable(values.sharpness);
                self.sharpness_request_template = ko.observable(values.sharpness_request_template);
                self.backlight_compensation_enabled = ko.observable(values.backlight_compensation_enabled);
                self.backlight_compensation_enabled_request_template = ko.observable(values.backlight_compensation_enabled_request_template);
                self.exposure_type = ko.observable(values.exposure_type);
                self.exposure_type_request_template = ko.observable(values.exposure_type_request_template);
                self.exposure = ko.observable(values.exposure);
                self.exposure_request_template = ko.observable(values.exposure_request_template);
                self.exposure_auto_priority_enabled = ko.observable(values.exposure_auto_priority_enabled);
                self.exposure_auto_priority_enabled_request_template = ko.observable(values.exposure_auto_priority_enabled_request_template);
                self.pan = ko.observable(values.pan);
                self.pan_request_template = ko.observable(values.pan_request_template);
                self.tilt = ko.observable(values.tilt);
                self.tilt_request_template = ko.observable(values.tilt_request_template);
                self.autofocus_enabled = ko.observable(values.autofocus_enabled);
                self.autofocus_enabled_request_template = ko.observable(values.autofocus_enabled_request_template);
                self.focus = ko.observable(values.focus);
                self.focus_request_template = ko.observable(values.focus_request_template);
                self.zoom = ko.observable(values.zoom);
                self.zoom_request_template = ko.observable(values.zoom_request_template);
                self.led1_mode = ko.observable(values.led1_mode);
                self.led1_mode_request_template = ko.observable(values.led1_mode_request_template);
                self.led1_frequency = ko.observable(values.led1_frequency);
                self.led1_frequency_request_template = ko.observable(values.led1_frequency_request_template);
                self.jpeg_quality = ko.observable(values.jpeg_quality);
                self.jpeg_quality_request_template = ko.observable(values.jpeg_quality_request_template);
        
                self.is_testing_custom_image_preferences = ko.observable(false)
                self.applySettingsToCamera = function (settings_type) {
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    var data = {
                        'profile': ko.toJS(self),
                        'settings_type':settings_type
                    };
                    $.ajax({
                        url: "./plugin/octolapse/applyCameraSettings",
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (results) {
                            if(results.success) {
                                var options = {
                                    title: 'Success',
                                    text: 'Camera settings were applied with no errors.',
                                    type: 'success',
                                    hide: true,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options, "camera_settings_success");
                            }
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            var options = {
                                title: 'Error',
                                text: "Unable to update the camera settings!  Status: " + textStatus + ".  Error: " + errorThrown,
                                type: 'error',
                                hide: true,
                                addclass: "octolapse"
                            };
                            Octolapse.displayPopupForKey(options,"camera_settings_success");
        
                        }
                    });
                };
        
                self.toggleCamera = function(){
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    //console.log("Running camera request.");
                    var data = { 'guid': self.guid(), "client_id": Octolapse.Globals.client_id };
                    $.ajax({
                        url: "./plugin/octolapse/toggleCamera",
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (results) {
                            if (results.success) {
                                self.enabled(results.enabled);
                            }
                            else {
                                alert(results.error);
                            }
        
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
                            alert("Unable to toggle the camera:(  Status: " + textStatus + ".  Error: " + errorThrown);
                        }
                    });
                }
        
                self.testCamera = function () {
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    //console.log("Running camera request.");
                    var data = { 'profile': ko.toJS(self) };
                    $.ajax({
                        url: "./plugin/octolapse/testCamera",
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (results) {
                            if (results.success){
        
                                var options = {
                                    title: 'Camera Test Success',
                                    text: 'A request for a snapshot came back OK.  The camera seems to be working!',
                                    type: 'success',
                                    hide: true,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options, "camera_settings_success");
                            }
                            else {
                                var options = {
                                    title: 'Camera Test Failed',
                                    text: 'Errors were detected - ' + results.error,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options, "camera_settings_failed");
                            }
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
        
                            var options = {
                                title: 'Camera Test Failed',
                                text: "Status: " + textStatus + ".  Error: " + errorThrown,
                                type: 'error',
                                hide: false,
                                addclass: "octolapse"
                            };
                            Octolapse.displayPopupForKey(options, "camera_settings_failed");
                        }
                    });
                };
        
                self.toggleApplySettingsBeforePrint = function () {
        
        
                    if(self.apply_settings_before_print())
                    {
                        self.apply_settings_before_print(false)
                        return;
                    }
        
                    self.is_testing_custom_image_preferences(true);
                    // If no guid is supplied, this is a new profile.  We will need to know that later when we push/update our observable array
                    //console.log("Running camera request.");
                    var data = { 'profile': ko.toJS(self) };
                    $.ajax({
                        url: "./plugin/octolapse/testCameraSettingsApply",
                        type: "POST",
                        data: JSON.stringify(data),
                        contentType: "application/json",
                        dataType: "json",
                        success: function (results) {
                            if (results.success){
                                self.apply_settings_before_print(true);
                                $('#camera_profile_apply_settings_before_print').prop("checked",true);
                            }
                            else {
                                var options = {
                                    title: 'Unable To Enable Custom Preferences',
                                    text: results.error,
                                    type: 'error',
                                    hide: false,
                                    addclass: "octolapse"
                                };
                                Octolapse.displayPopupForKey(options, "camera_settings_failed");
                            }
                        },
                        error: function (XMLHttpRequest, textStatus, errorThrown) {
        
                            var options = {
                                title: 'Unable To Apply Custom Preferences',
                                text: "An unexpected error occurred.  Status: " + textStatus + ".  Error: " + errorThrown,
                                type: 'error',
                                hide: false,
                                addclass: "octolapse"
                            };
                            Octolapse.displayPopupForKey(options, "camera_settings_failed");
                        },
                        complete: function (){
                            self.is_testing_custom_image_preferences(false);
                        }
                    });
                };
            };
            Octolapse.CameraProfileValidationRules = {
                rules: {
                    camera_type: { required: true },
                    exposure_type: { required: true },
                    led_1_mode: { required: true},
                    powerline_frequency: { required: true},
                    snapshot_request_template: { octolapseSnapshotTemplate: true },
                    brightness_request_template: { octolapseCameraRequestTemplate: true },
                    contrast_request_template: { octolapseCameraRequestTemplate: true },
                    saturation_request_template: { octolapseCameraRequestTemplate: true },
                    white_balance_auto_request_template: { octolapseCameraRequestTemplate: true },
                    gain_request_template: { octolapseCameraRequestTemplate: true },
                    powerline_frequency_request_template: { octolapseCameraRequestTemplate: true },
                    white_balance_temperature_request_template: { octolapseCameraRequestTemplate: true },
                    sharpness_request_template: { octolapseCameraRequestTemplate: true },
                    backlight_compensation_enabled_request_template: { octolapseCameraRequestTemplate: true },
                    exposure_type_request_template: { octolapseCameraRequestTemplate: true },
                    exposure_request_template: { octolapseCameraRequestTemplate: true },
                    exposure_auto_priority_enabled_request_template: { octolapseCameraRequestTemplate: true },
                    pan_request_template: { octolapseCameraRequestTemplate: true },
                    tilt_request_template: { octolapseCameraRequestTemplate: true },
                    autofocus_enabled_request_template: { octolapseCameraRequestTemplate: true },
                    focus_request_template: { octolapseCameraRequestTemplate: true },
                    zoom_request_template: { octolapseCameraRequestTemplate: true },
                    led1_mode_request_template: { octolapseCameraRequestTemplate: true },
                    led1_frequency_request_template: { octolapseCameraRequestTemplate: true },
                    jpeg_quality_request_template: { octolapseCameraRequestTemplate: true }
                },
                messages: {
                    name: "Please enter a name for your profile"
                }
            };
        
        
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.profiles.debug.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function() {
            Octolapse.DebugProfileViewModel = function (values) {
                var self = this;
                self.profileTypeName = ko.observable("Debug")
                self.guid = ko.observable(values.guid);
                self.name = ko.observable(values.name);
                self.description = ko.observable(values.description);
                self.enabled = ko.observable(values.enabled);
                self.is_test_mode = ko.observable(values.is_test_mode);
                self.log_to_console = ko.observable(values.log_to_console);
                self.position_change = ko.observable(values.position_change);
                self.position_command_received = ko.observable(values.position_command_received);
                self.extruder_change = ko.observable(values.extruder_change);
                self.extruder_triggered = ko.observable(values.extruder_triggered);
                self.trigger_create = ko.observable(values.trigger_create);
                self.trigger_wait_state = ko.observable(values.trigger_wait_state);
                self.trigger_triggering = ko.observable(values.trigger_triggering);
                self.trigger_triggering_state = ko.observable(values.trigger_triggering_state);
                self.trigger_layer_change = ko.observable(values.trigger_layer_change);
                self.trigger_height_change = ko.observable(values.trigger_height_change);
                self.trigger_zhop = ko.observable(values.trigger_zhop);
                self.trigger_time_unpaused = ko.observable(values.trigger_time_unpaused);
                self.trigger_time_remaining = ko.observable(values.trigger_time_remaining);
                self.snapshot_gcode = ko.observable(values.snapshot_gcode);
                self.snapshot_gcode_endcommand = ko.observable(values.snapshot_gcode_endcommand);
                self.snapshot_position = ko.observable(values.snapshot_position);
                self.snapshot_position_return = ko.observable(values.snapshot_position_return);
                self.snapshot_position_resume_print = ko.observable(values.snapshot_position_resume_print);
                self.snapshot_save = ko.observable(values.snapshot_save);
                self.snapshot_download = ko.observable(values.snapshot_download);
                self.render_start = ko.observable(values.render_start);
                self.render_complete = ko.observable(values.render_complete);
                self.render_fail = ko.observable(values.render_fail);
                self.render_sync = ko.observable(values.render_sync);
                self.snapshot_clean = ko.observable(values.snapshot_clean);
                self.settings_save = ko.observable(values.settings_save);
                self.settings_load = ko.observable(values.settings_load);
                self.print_state_changed = ko.observable(values.print_state_changed);
                self.camera_settings_apply = ko.observable(values.camera_settings_apply);
                self.gcode_sent_all = ko.observable(values.gcode_sent_all);
                self.gcode_queuing_all = ko.observable(values.gcode_queuing_all);
                self.gcode_received_all = ko.observable(values.gcode_received_all);
        
            };
            Octolapse.DebugProfileValidationRules = {
                rules: {
                    name: "required"
                },
                messages: {
                    name: "Please enter a name for your profile"
                }
            };
        });
        
        
        
        ;
        
        // source: plugin/octolapse/js/octolapse.status.js
        /*
        ##################################################################################
        # Octolapse - A plugin for OctoPrint used for making stabilized timelapse videos.
        # Copyright (C) 2017  Brad Hochgesang
        ##################################################################################
        # This program is free software: you can redistribute it and/or modify
        # it under the terms of the GNU Affero General Public License as published
        # by the Free Software Foundation, either version 3 of the License, or
        # (at your option) any later version.
        #
        # This program is distributed in the hope that it will be useful,
        # but WITHOUT ANY WARRANTY; without even the implied warranty of
        # MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
        # GNU Affero General Public License for more details.
        #
        # You should have received a copy of the GNU Affero General Public License
        # along with this program.  If not, see the following:
        # https://github.com/FormerLurker/Octolapse/blob/master/LICENSE
        #
        # You can contact the author either through the git-hub repository, or at the
        # following email address: FormerLurker@pm.me
        ##################################################################################
        */
        $(function () {
                Octolapse.StatusViewModel = function () {
                    // Create a reference to this object
                    var self = this;
                    // Add this object to our Octolapse namespace
                    Octolapse.Status = this;
                    // Assign the Octoprint settings to our namespace
        
                    self.is_timelapse_active = ko.observable(false);
                    self.is_taking_snapshot = ko.observable(false);
                    self.is_rendering = ko.observable(false);
                    self.current_snapshot_time = ko.observable(0);
                    self.total_snapshot_time = ko.observable(0);
                    self.snapshot_count = ko.observable(0);
                    self.snapshot_error = ko.observable(false);
                    self.waiting_to_render = ko.observable();
                    self.current_printer_profile_guid = ko.observable();
                    self.current_stabilization_profile_guid = ko.observable();
                    self.current_snapshot_profile_guid = ko.observable();
                    self.current_rendering_profile_guid = ko.observable();
                    self.current_debug_profile_guid = ko.observable();
                    self.current_settings_showing = ko.observable(true);
                    self.profiles = ko.observable({
                        'printers': ko.observableArray([{name: "Unknown", guid: "", has_been_saved_by_user: false}]),
                        'stabilizations': ko.observableArray([{name: "Unknown", guid: ""}]),
                        'snapshots': ko.observableArray([{name: "Unknown", guid: ""}]),
                        'renderings': ko.observableArray([{name: "Unknown", guid: ""}]),
                        'cameras': ko.observableArray([{name: "Unknown", guid: "", enabled: false}]),
                        'debug_profiles': ko.observableArray([{name: "Unknown", guid: ""}])
                    });
        
                    self.current_camera_guid = ko.observable()
                    self.PositionState = new Octolapse.positionStateViewModel();
                    self.Position = new Octolapse.positionViewModel();
                    self.ExtruderState = new Octolapse.extruderStateViewModel();
                    self.TriggerState = new Octolapse.triggersStateViewModel();
                    self.IsTabShowing = false;
                    self.IsLatestSnapshotDialogShowing = false;
        
        
                    self.showLatestSnapshotDialog = function () {
        
                        var $SnapshotDialog = $("#octolapse_latest_snapshot_dialog");
                        // configure the modal hidden event.  Isn't it funny that bootstrap's own shortening of their name is BS?
                        $SnapshotDialog.on("hidden.bs.modal", function () {
                            //console.log("Snapshot dialog hidden.");
                            self.IsLatestSnapshotDialogShowing = false;
                        });
                        // configure the dialog shown event
        
                        $SnapshotDialog.on("shown.bs.modal", function () {
                            //console.log("Snapshot dialog shown.");
                            self.IsLatestSnapshotDialogShowing = true;
                            self.updateLatestSnapshotImage(true);
                        });
        
                        // configure the dialog show event
                        $SnapshotDialog.on("show.bs.modal", function () {
                            //console.log("Snapshot dialog showing.");
                            self.IsLatestSnapshotDialogShowing = true;
        
                        });
        
                        // cancel button click handler
                        $SnapshotDialog.find('.cancel').one('click', function () {
                            //console.log("Hiding snapshot dialog.");
                            self.IsLatestSnapshotDialogShowing = false;
                            $SnapshotDialog.modal("hide");
                        });
        
        
                        self.IsLatestSnapshotDialogShowing = true;
                        self.erasePreviousSnapshotImages('octolapse_snapshot_image_container');
                        $SnapshotDialog.modal();
        
                    };
        
                    self.SETTINGS_VISIBLE_KEY = "settings_visible";
                    self.onBeforeBinding = function () {
                        var settingsVisible = Octolapse.getLocalStorage(self.SETTINGS_VISIBLE_KEY);
                        //console.log("Local Storage for " + self.SETTINGS_VISIBLE_KEY + ": " + settingsVisible);
        
                        if(settingsVisible == null || settingsVisible.toLowerCase() === "true")
                        {
                            self.current_settings_showing(true);
                        }
                        else
                        {
                            self.current_settings_showing(false);
                        }
        
                    };
        
                    self.onAfterBinding = function () {
                            self.current_settings_showing.subscribe(function (newData) {
                            //console.log("Setting local storage (" + self.SETTINGS_VISIBLE_KEY + ") to " + newData);
                            Octolapse.setLocalStorage(self.SETTINGS_VISIBLE_KEY,newData)
                        });
        
        
                    }
        
                    self.hasOneCameraEnabled = ko.pureComputed(function(){
                        var hasConfigIssue = true;
                        for (var i = 0; i < self.profiles().cameras().length; i++)
                        {
                            if(self.profiles().cameras()[i].enabled)
                            {
                                return true
                            }
                        }
                        return false;
        
                    },this);
        
                    self.hasPrinterSelected = ko.pureComputed(function(){
                        return ! (Octolapse.Status.current_printer_profile_guid() == null || Octolapse.Status.current_printer_profile_guid()=="");
                    },this);
        
                    self.has_configured_printer_profile = ko.pureComputed(function(){
                        //console.log("detecting configured printers.")
                        var current_printer = self.getCurrentProfileByGuid(self.profiles().printers(),Octolapse.Status.current_printer_profile_guid());
                        if (current_printer != null)
                            return current_printer.has_been_saved_by_user;
                        return true;
                    },this);
        
                    self.getCurrentProfileByGuid = function(profiles, guid){
                        if (guid != null) {
                            for (var i = 0; i < profiles.length; i++) {
                                if (profiles[i].guid == guid) {
                                    return profiles[i]
                                }
                            }
                        }
                        return null;
                    }
                    self.hasConfigIssues = ko.computed(function(){
                        var hasConfigIssues = !self.hasOneCameraEnabled() || !self.hasPrinterSelected() || !self.has_configured_printer_profile();
                        return hasConfigIssues;
                    },this);
        
        
                    self.onTabChange = function (current, previous) {
                        if (current != null && current === "#tab_plugin_octolapse") {
                            //console.log("Octolapse Tab is showing");
                            self.IsTabShowing = true;
                            self.updateLatestSnapshotThumbnail(true);
        
                        }
                        else if (previous != null && previous === "#tab_plugin_octolapse") {
                            //console.log("Octolapse Tab is not showing");
                            self.IsTabShowing = false;
                        }
                    };
                    /*
                        Snapshot client animation preview functions
                    */
                    self.refreshLatestImage = function (targetId, isThumbnail) {
                        isThumbnail = isThumbnail || false;
                        //console.log("Refreshing Snapshot Thumbnail");
                        if (isThumbnail)
                            self.updateLatestSnapshotThumbnail(true);
                        else
                            self.updateLatestSnapshotImage(true);
                    };
        
                    self.startSnapshotAnimation = function (targetId) {
                        //console.log("Refreshing Snapshot Thumbnail");
                        // Hide and show the play/refresh button
                        if (Octolapse.Globals.auto_reload_latest_snapshot()) {
                            $('#' + targetId + ' .snapshot_refresh_container a.start-animation').fadeOut();
                        }
        
        
                        //console.log("Starting animation on " + targetId);
                        // Get the images
                        var $images = $('#' + targetId + ' .snapshot_container .previous-snapshots img');
                        // Remove any existing visible class
                        $images.each(function (index, element) {
                            $(element).removeClass('visible');
                        });
                        // Set a delay to unblock
                        setTimeout(function () {
                            // Remove any hidden class and add visible to trigger the animation.
                            $images.each(function (index, element) {
                                $(element).removeClass('hidden');
                                $(element).addClass('visible');
                            });
                            if (Octolapse.Globals.auto_reload_latest_snapshot()) {
                                $('#' + targetId + ' .snapshot_refresh_container a.start-animation').fadeIn();
                            }
                        }, 1)
        
                    };
        
                    self.updateLatestSnapshotThumbnail = function (force) {
                        force = force || false;
                        //console.log("Trying to update the latest snapshot thumbnail.");
                        if (!force) {
                            if (!self.IsTabShowing) {
                                //console.log("The tab is not showing, not updating the thumbnail.  Clearing the image history.");
                                return
                            }
                            else if (!Octolapse.Globals.auto_reload_latest_snapshot()) {
                                //console.log("Not updating the thumbnail, auto-reload is disabled.");
                                return
                            }
                        }
                        self.updateSnapshotAnimation('octolapse_snapshot_thumbnail_container', getLatestSnapshotThumbnailUrl(self.current_camera_guid())
                            + "&time=" + new Date().getTime());
        
                    };
        
                    self.erasePreviousSnapshotImages = function (targetId, eraseCurrentImage) {
                        eraseCurrentImage = eraseCurrentImage || false;
                        if (eraseCurrentImage) {
                            $('#' + targetId + ' .snapshot_container .latest-snapshot img').each(function () {
                                $(this).remove();
                            });
                        }
                        $('#' + targetId + ' .snapshot_container .previous-snapshots img').each(function () {
                            $(this).remove();
                        });
                    };
        
                    // takes the list of images, update the frames in the target accordingly and starts any animations
                    self.IsAnimating = false;
                    self.updateSnapshotAnimation = function (targetId, newSnapshotAddress) {
                        //console.log("Updating animation for target id: " + targetId);
                        // Get the snapshot_container within the target
                        var $target = $('#' + targetId + ' .snapshot_container');
                        // Get the latest image
                        var $latestSnapshotContainer = $target.find('.latest-snapshot');
                        var $latestSnapshot = $latestSnapshotContainer.find('img');
                        if (Octolapse.Globals.auto_reload_latest_snapshot()) {
                            // Get the previous snapshot container
                            var $previousSnapshotContainer = $target.find('.previous-snapshots');
        
                            // Add the latest image to the previous snapshots list
                            if ($latestSnapshot.length > 0) {
                                var srcAttr = $latestSnapshot.attr('src');
                                // If the image has a src, and that src is not empty
                                if (typeof srcAttr !== typeof undefined && srcAttr !== false && srcAttr.length > 0) {
                                    //console.log("Moving the latest image into the previous image container");
                                    $latestSnapshot.appendTo($previousSnapshotContainer);
                                }
                                else {
                                    $latestSnapshot.remove();
                                }
                            }
        
                            // Get all of the images within the $previousSnapshotContainer, included the latest image we copied in
                            var $previousSnapshots = $previousSnapshotContainer.find("img");
        
                            var numSnapshots = $previousSnapshots.length;
        
                            while (numSnapshots > parseInt(Octolapse.Globals.auto_reload_frames())) {
                                //console.log("Removing overflow previous images according to Auto Reload Frames setting.");
                                var $element = $previousSnapshots.first();
                                $element.remove();
        
                                numSnapshots--;
                            }
        
                            // Set the total animation duration based on the number of snapshots
                            $previousSnapshotContainer.removeClass().addClass('previous-snapshots snapshot-animation-duration-' + numSnapshots);
        
                            // TODO: Do we need to do this??  Find out
                            $previousSnapshots = $previousSnapshotContainer.find("img");
                            var numPreviousSnapshots = $previousSnapshots.length;
                            var newestImageIndex = numPreviousSnapshots - 1;
                            //console.log("Updating classes for previous " + numPreviousSnapshots + " images.");
                            for (var previousImageIndex = 0; previousImageIndex < numPreviousSnapshots; previousImageIndex++) {
                                $element = $($previousSnapshots.eq(previousImageIndex));
                                $element.removeClass();
                                if (previousImageIndex === newestImageIndex) {
                                    //console.log("Updating classes for the newest image.");
                                    $element.addClass("newest");
                                }
                                else {
                                    $element.addClass("hidden");
                                }
                                var previousImageDelayClass = "effect-delay-" + previousImageIndex;
                                //console.log("Updating classes for the previous image delay " + previousImageDelayClass+ ".");
                                $element.addClass(previousImageDelayClass);
        
        
                            }
        
                        }
        
        
                        // create the newest image
                        var $newSnapshot = $(document.createElement('img'));
                        // append the image to the container
        
                        //console.log("Adding the new snapshot image to the latest snapshot container.");
                        // create on load event for the newest image
                        if (Octolapse.Globals.auto_reload_latest_snapshot()) {
                            // Add the new snapshot to the container
                            $newSnapshot.appendTo($latestSnapshotContainer);
                            $newSnapshot.one('load', function () {
                                self.IsAnimating = false;
                                self.startSnapshotAnimation(targetId);
                            });
                            // create an error handler for the newest image
        
                        }
                        else {
        
                            $newSnapshot.one('load', function () {
                                // Hide the latest image
                                $latestSnapshot.fadeOut(250, function () {
                                    // Remove the latest image
                                    $latestSnapshot.remove();
                                    // Set the new snapshot to hidden initially
                                    $newSnapshot.css('display', 'none');
                                    // Add the new snapshot to the container
                                    $newSnapshot.appendTo($latestSnapshotContainer);
                                    // fade it in.  Ahhh..
                                    $newSnapshot.fadeIn(250);
                                });
                            });
        
        
                        }
                        $newSnapshot.one('error', function () {
                            //console.log("An error occurred loading the newest image, reverting to previous image.");
                            // move the latest preview image back into the newest image section
                            self.IsAnimating = false;
                            $latestSnapshot.removeClass();
                            $newSnapshot.addClass('latest');
                            $latestSnapshot.appendTo($latestSnapshotContainer)
        
                        });
        
                        // set the class
                        $newSnapshot.addClass('latest');
                        // set the src and start to load
                        $newSnapshot.attr('src', newSnapshotAddress)
                    };
        
                    self.updateLatestSnapshotImage = function (force) {
                        force = force || false;
                        //console.log("Trying to update the latest snapshot image.");
                        if (!force) {
                            if (!Octolapse.Globals.auto_reload_latest_snapshot()) {
                                //console.log("Auto-Update latest snapshot image is disabled.");
                                return
                            }
                            else if (!self.IsLatestSnapshotDialogShowing) {
                                //console.log("The full screen dialog is not showing, not updating the latest snapshot.");
                                return
                            }
                        }
                        //console.log("Requesting image for camera:" + Octolapse.Status.current_camera_guid())
                        self.updateSnapshotAnimation('octolapse_snapshot_image_container', getLatestSnapshotUrl(Octolapse.Status.current_camera_guid()) + "&time=" + new Date().getTime());
        
                    };
        
                    self.toggleInfoPanel = function (panelType){
                        $.ajax({
                            url: "./plugin/octolapse/toggleInfoPanel",
                            type: "POST",
                            data: JSON.stringify({panel_type: panelType}),
                            contentType: "application/json",
                            dataType: "json",
                            error: function (XMLHttpRequest, textStatus, errorThrown) {
                                alert("Unable to toggle the panel.  Status: " + textStatus + ".  Error: " + errorThrown);
                            }
                        });
                    };
        
                    /**
                     * @return {string}
                     */
                    self.GetTriggerStateTemplate = function (type) {
                        switch (type) {
                            case "gcode":
                                return "gcode-trigger-status-template";
                            case "layer":
                                return "layer-trigger-status-template";
                            case "timer":
                                return "timer-trigger-status-template";
                            default:
                                return "trigger-status-template"
                        }
                    };
        
                    self.getStateSummaryText = ko.pureComputed(function () {
                        if(!self.is_timelapse_active()) {
                            if(self.waiting_to_render())
                                return "Octolapse is waiting for print to complete.";
                            if( self.is_rendering())
                                return "Octolapse is rendering a timelapse.";
                            if(!Octolapse.Globals.enabled())
                                return 'Octolapse is disabled.';
                            return 'Octolapse is enabled and idle.';
                        }
                        if(!Octolapse.Globals.enabled())
                            return 'Octolapse is disabled.';
                        if(!self.PositionState.IsInitialized())
                            return 'Octolapse is waiting for more information from the server.';
                        if( self.PositionState.hasPositionStateErrors())
                            return 'Octolapse is waiting to initialize.';
                        if( self.is_taking_snapshot())
                            return "Octolapse is taking a snapshot.";
                        return "Octolapse is waiting to take snapshot.";
        
                    }, self);
                    self.getTimelapseStateText =  ko.pureComputed(function () {
                        //console.log("GettingTimelapseStateText")
                        if(!self.is_timelapse_active())
                            return 'Octolapse is not running';
                        if(!self.PositionState.IsInitialized())
                            return 'Waiting for update from server.  You may have to turn on the "Position State Info Panel" from the "Current Settings" below to receive an update.';
                        if( self.PositionState.hasPositionStateErrors())
                            return 'Waiting to initialize';
                        return 'Octolapse is initialized and running';
                    }, self);
        
                    self.getTimelapseStateColor =  ko.pureComputed(function () {
                        if(!self.is_timelapse_active())
                            return '';
                        if(!self.PositionState.IsInitialized() || self.PositionState.hasPositionStateErrors())
                            return 'orange';
                        return 'greenyellow';
                    }, self);
        
                    self.getStatusText = ko.pureComputed(function () {
                        if (self.is_timelapse_active())
                            return 'Octolapse - Running';
                        if (self.is_rendering())
                            return 'Octolapse - Rendering';
                        if (self.waiting_to_render())
                            return 'Octolapse - Waiting to Render';
                        if (Octolapse.Globals.enabled())
                            return 'Octolapse';
                        return 'Octolapse - Disabled';
                    }, self);
        
                    self.updatePositionState = function (state) {
                        // State variables
                        self.PositionState.update(state);
                    };
        
                    self.updatePosition = function (state) {
                        // State variables
                        self.Position.update(state);
                    };
        
                    self.updateExtruderState = function (state) {
                        // State variables
                        self.ExtruderState.update(state);
                    };
        
                    self.updateTriggerStates = function (states) {
                        self.TriggerState.update(states);
                    };
        
                    self.update = function (settings) {
                        self.is_timelapse_active(settings.is_timelapse_active);
                        self.snapshot_count(settings.snapshot_count);
                        self.is_taking_snapshot(settings.is_taking_snapshot);
                        self.is_rendering(settings.is_rendering);
                        self.total_snapshot_time(settings.total_snapshot_time);
                        self.current_snapshot_time(settings.current_snapshot_time);
                        self.waiting_to_render(settings.waiting_to_render);
                        //console.log("Updating Profiles");
                        self.profiles().printers(settings.profiles.printers);
                        self.profiles().stabilizations(settings.profiles.stabilizations);
                        self.profiles().snapshots(settings.profiles.snapshots);
                        self.profiles().renderings(settings.profiles.renderings);
                        self.profiles().cameras(settings.profiles.cameras);
                        self.profiles().debug_profiles(settings.profiles.debug_profiles);
                        self.current_printer_profile_guid(settings.profiles.current_printer_profile_guid);
                        self.current_stabilization_profile_guid(settings.profiles.current_stabilization_profile_guid);
                        self.current_snapshot_profile_guid(settings.profiles.current_snapshot_profile_guid);
                        self.current_rendering_profile_guid(settings.profiles.current_rendering_profile_guid);
                        self.current_debug_profile_guid(settings.profiles.current_debug_profile_guid);
                        // Only update the current camera guid if there is no value
                        if(self.current_camera_guid() == null)
                            self.current_camera_guid(settings.profiles.current_camera_profile_guid);
                    };
        
                    self.onTimelapseStart = function () {
                        self.TriggerState.removeAll();
                        self.PositionState.IsInitialized(false);
                    };
        
                    self.onTimelapseStop = function () {
                        self.is_timelapse_active(false);
                        self.is_taking_snapshot(false);
                        self.waiting_to_render(true);
                    };
        
                    self.stopTimelapse = function () {
                        if (Octolapse.Globals.is_admin()) {
                            //console.log("octolapse.status.js - ButtonClick: StopTimelapse");
                            if (confirm("Warning: You cannot restart octolapse once it is stopped until the next print.  Do you want to stop Octolapse?")) {
                                $.ajax({
                                    url: "./plugin/octolapse/stopTimelapse",
                                    type: "POST",
                                    contentType: "application/json",
                                    success: function (data) {
                                        //console.log("octolapse.status.js - stopTimelapse - success" + data);
                                    },
                                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                                        alert("Unable to stop octolapse!.  Status: " + textStatus + ".  Error: " + errorThrown);
                                    }
                                });
                            }
                        }
                    };
        
                    self.snapshotTime = function () {
                        var date = new Date(null);
                        date.setSeconds(this.total_snapshot_time());
                        return date.toISOString().substr(11, 8);
                    };
        
                    self.navbarClicked = function () {
                        $("#tab_plugin_octolapse_link").find("a").click();
                    };
        
                    self.nameSort = function (observable) {
                        //console.log("Sorting profiles on primary tab.")
                        return observable().sort(
                            function (left, right) {
                                var leftName = left.name.toLowerCase();
                                var rightName = right.name.toLowerCase();
                                return leftName === rightName ? 0 : (leftName < rightName ? -1 : 1);
                            });
                    };
        
                    // Printer Profile Settings
                    self.printers_sorted = ko.computed(function() { return self.nameSort(self.profiles().printers) });
                    self.openCurrentPrinterProfile = function () {
                        //console.log("Opening current printer profile from tab.")
                        Octolapse.Printers.showAddEditDialog(self.current_printer_profile_guid(), false);
                    };
                    self.defaultPrinterChanged = function (obj, event) {
                        if (Octolapse.Globals.is_admin()) {
                            if (event.originalEvent) {
                                // Get the current guid
                                var guid = $("#octolapse_tab_printer_profile").val();
                                //console.log("Default Printer is changing to " + guid);
                                Octolapse.Printers.setCurrentProfile(guid);
                                return true;
                            }
                        }
                    };
        
                    // Stabilization Profile Settings
                    self.stabilizations_sorted = ko.computed(function() { return self.nameSort(self.profiles().stabilizations) });
                    self.openCurrentStabilizationProfile = function () {
                        //console.log("Opening current stabilization profile from tab.")
                        Octolapse.Stabilizations.showAddEditDialog(self.current_stabilization_profile_guid(), false);
                    };
                    self.defaultStabilizationChanged = function (obj, event) {
                        if (Octolapse.Globals.is_admin()) {
                            if (event.originalEvent) {
                                // Get the current guid
                                var guid = $("#octolapse_tab_stabilization_profile").val();
                                //console.log("Default stabilization is changing to " + guid + " from " + self.current_stabilization_profile_guid());
                                Octolapse.Stabilizations.setCurrentProfile(guid);
                                return true;
                            }
                        }
                    };
        
                    // Snapshot Profile Settings
                    self.snapshots_sorted = ko.computed(function() { return self.nameSort(self.profiles().snapshots) });
                    self.openCurrentSnapshotProfile = function () {
                        //console.log("Opening current snapshot profile from tab.")
                        Octolapse.Snapshots.showAddEditDialog(self.current_snapshot_profile_guid(), false);
                    };
                    self.defaultSnapshotChanged = function (obj, event) {
                        if (Octolapse.Globals.is_admin()) {
                            if (event.originalEvent) {
                                // Get the current guid
                                var guid = $("#octolapse_tab_snapshot_profile").val();
                                //console.log("Default Snapshot is changing to " + guid);
                                Octolapse.Snapshots.setCurrentProfile(guid);
                                return true;
                            }
                        }
                    };
        
                    // Rendering Profile Settings
                    self.renderings_sorted = ko.computed(function() { return self.nameSort(self.profiles().renderings) });
                    self.openCurrentRenderingProfile = function () {
                        //console.log("Opening current rendering profile from tab.")
                        Octolapse.Renderings.showAddEditDialog(self.current_rendering_profile_guid(), false);
                    };
                    self.defaultRenderingChanged = function (obj, event) {
                        if (Octolapse.Globals.is_admin()) {
                            if (event.originalEvent) {
                                // Get the current guid
                                var guid = $("#octolapse_tab_rendering_profile").val();
                                //console.log("Default Rendering is changing to " + guid);
                                Octolapse.Renderings.setCurrentProfile(guid);
                                return true;
                            }
                        }
                    };
        
                    // Camera Profile Settings
                    self.cameras_sorted = ko.computed(function() { return self.nameSort(self.profiles().cameras) });
        
                    self.openCameraProfile = function (guid) {
                        //console.log("Opening current camera profile from tab.")
                        Octolapse.Cameras.showAddEditDialog(guid, false);
                    };
        
                    self.addNewCameraProfile = function () {
                        //console.log("Opening current camera profile from tab.")
                        Octolapse.Cameras.showAddEditDialog(null, false);
                    };
        
                    self.toggleCamera = function (guid) {
                        //console.log("Opening current camera profile from tab.")
                        Octolapse.Cameras.getProfileByGuid(guid).toggleCamera();
                    };
                    self.snapshotCameraChanged = function(obj, event) {
                        // Update the current camera profile
                        var guid = $("#octolapse_current_snapshot_camera").val();
                        //console.log("Updating current snapshot camera preview: " + guid)
                        if(event.originalEvent) {
                            if (Octolapse.Globals.is_admin()) {
                                var data = {'guid': guid};
                                $.ajax({
                                    url: "./plugin/octolapse/setCurrentCameraProfile",
                                    type: "POST",
                                    data: JSON.stringify(data),
                                    contentType: "application/json",
                                    dataType: "json",
                                    success: function (result) {
                                        // Set the current profile guid observable.  This will cause the UI to react to the change.
                                        //console.log("current profile guid updated: " + result.guid)
                                    },
                                    error: function (XMLHttpRequest, textStatus, errorThrown) {
                                        alert("Unable to set the current camera profile!.  Status: " + textStatus + ".  Error: " + errorThrown);
                                    }
                                });
                            }
                        }
        
                        //console.log("Updating the latest snapshot from: " + Octolapse.Status.current_camera_guid() + " to " + guid);
                        Octolapse.Status.current_camera_guid(guid);
                        self.erasePreviousSnapshotImages('octolapse_snapshot_image_container',true);
                        self.erasePreviousSnapshotImages('octolapse_snapshot_thumbnail_container',true);
                        self.updateLatestSnapshotThumbnail(self.current_camera_guid());
                        self.updateLatestSnapshotImage(self.current_camera_guid());
                    }
        
                    // Debug Profile Settings
                    self.debug_sorted = ko.computed(function() { return self.nameSort(self.profiles().debug_profiles) });
                    self.openCurrentDebugProfile = function () {
                        //console.log("Opening current debug profile from tab.")
                        Octolapse.DebugProfiles.showAddEditDialog(self.current_debug_profile_guid(), false);
                    };
                    self.defaultDebugProfileChanged = function (obj, event) {
                        if (Octolapse.Globals.is_admin()) {
                            if (event.originalEvent) {
                                // Get the current guid
                                var guid = $("#octolapse_tab_debug_profile").val();
                                //console.log("Default Debug Profile is changing to " + guid);
                                Octolapse.DebugProfiles.setCurrentProfile(guid);
                                return true;
                            }
                        }
                    };
        
                };
                /*
                    Status Tab viewmodels
                */
                Octolapse.positionStateViewModel = function () {
                    var self = this;
                    self.GCode = ko.observable("");
                    self.XHomed = ko.observable(false);
                    self.YHomed = ko.observable(false);
                    self.ZHomed = ko.observable(false);
                    self.IsLayerChange = ko.observable(false);
                    self.IsHeightChange = ko.observable(false);
                    self.IsInPosition = ko.observable(false);
                    self.InPathPosition = ko.observable(false);
                    self.IsZHop = ko.observable(false);
                    self.IsRelative = ko.observable(null);
                    self.IsExtruderRelative = ko.observable(null);
                    self.Layer = ko.observable(0);
                    self.Height = ko.observable(0).extend({numeric: 2});
                    self.LastExtrusionHeight = ko.observable(0).extend({numeric: 2});
                    self.HasPositionError = ko.observable(false);
                    self.PositionError = ko.observable(false);
                    self.IsMetric = ko.observable(null);
                    self.IsInitialized = ko.observable(false);
        
                    self.update = function (state) {
                        this.GCode(state.GCode);
                        this.XHomed(state.XHomed);
                        this.YHomed(state.YHomed);
                        this.ZHomed(state.ZHomed);
                        this.IsLayerChange(state.IsLayerChange);
                        this.IsHeightChange(state.IsHeightChange);
                        this.IsInPosition(state.IsInPosition);
                        this.InPathPosition(state.InPathPosition);
                        this.IsZHop(state.IsZHop);
                        this.IsRelative(state.IsRelative);
                        this.IsExtruderRelative(state.IsExtruderRelative);
                        this.Layer(state.Layer);
                        this.Height(state.Height);
                        this.LastExtrusionHeight(state.LastExtrusionHeight);
                        this.HasPositionError(state.HasPositionError);
                        this.PositionError(state.PositionError);
                        this.IsMetric(state.IsMetric);
                        this.IsInitialized(true);
                    };
        
                    self.getCheckedIconClass = function (value, trueClass, falseClass, nullClass) {
                        return ko.computed({
                            read: function () {
                                if (value == null)
                                    return nullClass;
                                else if (value)
                                    return trueClass;
                                else
                                    return falseClass;
                            }
                        });
                    };
        
        
                    self.getColor = function (value, trueColor, falseColor, nullColor) {
                        return ko.computed({
                            read: function () {
                                if (value == null)
                                    return nullColor;
                                else if(!value)
                                    return falseColor;
                                if (value)
                                    return trueColor;
                            }
                        });
                    };
        
                    self.hasPositionStateErrors = ko.pureComputed(function(){
                        if (Octolapse.Status.is_timelapse_active() && self.IsInitialized())
        
                            if (!(self.XHomed() && self.YHomed() && self.ZHomed())
                                || self.IsRelative() == null
                                || self.IsExtruderRelative() == null
                                || !self.IsMetric()
                                || self.HasPositionError())
                                return true;
                        return false;
                    },self);
        
                    self.getYHomedStateText = ko.pureComputed(function () {
                        if (self.YHomed())
                            return "Homed";
                        else
                            return "Not homed";
                    }, self);
                    self.getZHomedStateText = ko.pureComputed(function () {
                        if (self.ZHomed())
                            return "Homed";
                        else
                            return "Not homed";
                    }, self);
                    self.getIsZHopStateText = ko.pureComputed(function () {
                        if (self.IsZHop())
                            return "Zhop detected";
                        else
                            return "Not a zhop";
                    }, self);
        
                    self.getIsInPositionStateText = ko.pureComputed(function () {
                        if (self.IsInPosition())
                            return "In position";
                        else if (self.InPathPosition())
                            return "In path position"
                        else
                            return "Not in position";
                    }, self);
        
                    self.getIsMetricStateText = ko.pureComputed(function () {
                        if (self.IsMetric())
                            return "Metric";
                        else if (self.IsMetric() === null)
                            return "Unknown";
                        else
                            return "Not Metric";
                    }, self);
                    self.getIsExtruderRelativeStateText = ko.pureComputed(function () {
                        if (self.IsExtruderRelative() == null)
                            return "Not Set";
                        else if (self.IsExtruderRelative())
                            return "Relative";
                        else
                            return "Absolute";
                    }, self);
        
                    self.getExtruderModeText = ko.pureComputed(function () {
                        if (self.IsExtruderRelative() == null)
                            return "Mode";
                        else if (self.IsExtruderRelative())
                            return "Relative";
                        else
                            return "Absolute";
                    }, self);
                    self.getXYZModeText = ko.pureComputed(function () {
                        if (self.IsRelative() == null)
                            return "Mode";
                        else if (self.IsRelative())
                            return "Relative";
                        else
                            return "Absolute";
                    }, self);
                    self.getIsRelativeStateText = ko.pureComputed(function () {
                        if (self.IsRelative() == null)
                            return "Not Set";
                        else if (self.IsRelative())
                            return "Relative";
                        else
                            return "Absolute";
                    }, self);
        
                    self.getHasPositionErrorStateText = ko.pureComputed(function () {
                        if (self.HasPositionError())
                            return "A position error was detected";
                        else
                            return "No current position errors";
                    }, self);
                    self.getIsLayerChangeStateText = ko.pureComputed(function () {
                        if (self.IsLayerChange())
                            return "Layer change detected";
                        else
                            return "Not changing layers";
                    }, self);
                };
                Octolapse.positionViewModel = function () {
                    var self = this;
                    self.F = ko.observable(0).extend({numeric: 2});
                    self.X = ko.observable(0).extend({numeric: 2});
                    self.XOffset = ko.observable(0).extend({numeric: 2});
                    self.Y = ko.observable(0).extend({numeric: 2});
                    self.YOffset = ko.observable(0).extend({numeric: 2});
                    self.Z = ko.observable(0).extend({numeric: 2});
                    self.ZOffset = ko.observable(0).extend({numeric: 2});
                    self.E = ko.observable(0).extend({numeric: 2});
                    self.EOffset = ko.observable(0).extend({numeric: 2});
                    self.Features = ko.observableArray([]);
                    self.update = function (state) {
                        this.F(state.F);
                        this.X(state.X);
                        this.XOffset(state.XOffset);
                        this.Y(state.Y);
                        this.YOffset(state.YOffset);
                        this.Z(state.Z);
                        this.ZOffset(state.ZOffset);
                        this.E(state.E);
                        this.EOffset(state.EOffset);
                        this.Features(state.Features);
                        //console.log(this.Features());
                        //self.plotPosition(state.X, state.Y, state.Z);
                    };
                    /*
                    self.plotPosition = function(x, y,z)
                    {
                        //console.log("Plotting Position")
                        var canvas = document.getElementById("octolapse_position_canvas");
                        canvas.width = 250;
                        canvas.height = 200;
                        var ctx = canvas.getContext("2d");
                        ctx.clearRect(0, 0, canvas.width, canvas.height);
                        ctx.fillRect(x + 2, x - 2,4, 4);
        
                    }*/
                };
                Octolapse.extruderStateViewModel = function () {
                    var self = this;
                    // State variables
                    self.ExtrusionLengthTotal = ko.observable(0).extend({numeric: 2});
                    self.ExtrusionLength = ko.observable(0).extend({numeric: 2});
                    self.RetractionLength = ko.observable(0).extend({numeric: 2});
                    self.DetractionLength = ko.observable(0).extend({numeric: 2});
                    self.IsExtrudingStart = ko.observable(false);
                    self.IsExtruding = ko.observable(false);
                    self.IsPrimed = ko.observable(false);
                    self.IsRetractingStart = ko.observable(false);
                    self.IsRetracting = ko.observable(false);
                    self.IsRetracted = ko.observable(false);
                    self.IsPartiallyRetracted = ko.observable(false);
                    self.IsDetractingStart = ko.observable(false);
                    self.IsDetracting = ko.observable(false);
                    self.IsDetracted = ko.observable(false);
                    self.HasChanged = ko.observable(false);
        
                    self.update = function (state) {
                        this.ExtrusionLengthTotal(state.ExtrusionLengthTotal);
                        this.ExtrusionLength(state.ExtrusionLength);
                        this.RetractionLength(state.RetractionLength);
                        this.DetractionLength(state.DetractionLength);
                        this.IsExtrudingStart(state.IsExtrudingStart);
                        this.IsExtruding(state.IsExtruding);
                        this.IsPrimed(state.IsPrimed);
                        this.IsRetractingStart(state.IsRetractingStart);
                        this.IsRetracting(state.IsRetracting);
                        this.IsRetracted(state.IsRetracted);
                        this.IsPartiallyRetracted(state.IsPartiallyRetracted);
                        this.IsDetractingStart(state.IsDetractingStart);
                        this.IsDetracting(state.IsDetracting);
                        this.IsDetracted(state.IsDetracted);
                        this.HasChanged(state.HasChanged);
                    };
        
                    self.getRetractionStateIconClass = ko.pureComputed(function () {
                        if (self.IsRetracting()) {
                            if (self.IsPartiallyRetracted() && !self.IsRetracted())
                                return "fa-angle-up";
                            else if (self.IsRetracted() && !self.IsPartiallyRetracted())
                                return "fa-angle-double-up";
                        }
                        return "fa-times-circle";
                    }, self);
                    self.getRetractionStateText = ko.pureComputed(function () {
        
                        if (self.IsRetracting()) {
                            var text = "";
        
        
                            if (self.IsPartiallyRetracted() && !self.IsRetracted()) {
                                if (self.IsRetractingStart())
                                    text += "Start: ";
                                text += self.RetractionLength() + "mm";
                                return text;
                            }
                            else if (self.IsRetracted() && !self.IsPartiallyRetracted()) {
                                if (self.IsRetractingStart())
                                    return "Retracted Start: " + self.RetractionLength() + "mm";
                                else
                                    return "Retracted: " + self.RetractionLength() + "mm";
                            }
                        }
                        return "None";
                    }, self);
                    self.getDetractionIconClass = ko.pureComputed(function () {
        
                        if (self.IsRetracting() && self.IsDetracting())
                            return "fa-exclamation-circle";
                        if (self.IsDetracting() && self.IsDetractingStart)
                            return "fa-level-down";
                        if (self.IsDetracting())
                            return "fa-long-arrow-down";
                        return "fa-times-circle";
                    }, self);
                    self.getDetractionStateText = ko.pureComputed(function () {
        
                        var text = "";
                        if (self.IsRetracting() && self.IsDetracting())
                            text = "Error";
                        else if (self.IsDetracted()) {
                            text = "Detracted: " + self.DetractionLength() + "mm";
                        }
                        else if (self.IsDetracting()) {
                            if (self.IsDetractingStart())
                                text += "Start: ";
                            text += self.DetractionLength() + "mm";
                        }
                        else
                            text = "None";
                        return text;
                    }, self);
        
        
                    self.getExtrudingStateIconClass = ko.pureComputed(function () {
        
                        if (self.IsExtrudingStart() && !self.IsExtruding())
                            return "exclamation-circle";
        
                        if (self.IsPrimed())
                            return "fa-arrows-h";
                        if (self.IsExtrudingStart())
                            return "fa-play-circle-o";
                        if (self.IsExtruding())
                            return "fa-play";
                        return "fa-times-circle";
                    }, self);
                    self.getExtrudingStateText = ko.pureComputed(function () {
                        if (self.IsExtrudingStart() && !self.IsExtruding())
                            return "Error";
                        if (self.IsPrimed())
                            return "Primed";
                        if (self.IsExtrudingStart())
                            return "Start: " + self.ExtrusionLength() + "mm";
                        if (self.IsExtruding())
                            return self.ExtrusionLength() + "mm";
                        return "None";
                    }, self);
                };
                Octolapse.triggersStateViewModel = function () {
                    var self = this;
        
                    // State variables
                    self.Name = ko.observable();
                    self.Triggers = ko.observableArray();
                    self.HasBeenCreated = false;
                    self.create = function (trigger) {
                        var newTrigger = null;
                        switch (trigger.Type) {
                            case "gcode":
                                newTrigger = new Octolapse.gcodeTriggerStateViewModel(trigger);
                                break;
                            case "layer":
                                newTrigger = new Octolapse.layerTriggerStateViewModel(trigger);
                                break;
                            case "timer":
                                newTrigger = new Octolapse.timerTriggerStateViewModel(trigger);
                                break;
                            default:
                                newTrigger = new Octolapse.genericTriggerStateViewModel(trigger);
                                break;
                        }
                        self.Triggers.push(newTrigger);
                    };
        
                    self.removeAll = function () {
                        self.Triggers.removeAll();
                    };
        
                    self.update = function (states) {
                        //console.log("Updating trigger states")
                        self.Name(states.Name);
                        var triggers = states.Triggers;
                        for (var sI = 0; sI < triggers.length; sI++) {
                            var state = triggers[sI];
                            var foundState = false;
                            for (var i = 0; i < self.Triggers().length; i++) {
                                var currentTrigger = self.Triggers()[i];
                                if (state.Type === currentTrigger.Type()) {
                                    currentTrigger.update(state);
                                    foundState = true;
                                    break;
                                }
                            }
                            if (!foundState) {
                                self.create(state);
                            }
                        }
                    };
        
                };
                Octolapse.genericTriggerStateViewModel = function (state) {
                    //console.log("creating generic trigger state view model");
                    var self = this;
                    self.Type = ko.observable(state.Type);
                    self.Name = ko.observable(state.Name);
                    self.IsTriggered = ko.observable(state.IsTriggered);
                    self.IsWaiting = ko.observable(state.IsWaiting);
                    self.IsWaitingOnZHop = ko.observable(state.IsWaitingOnZHop);
                    self.IsWaitingOnExtruder = ko.observable(state.IsWaitingOnExtruder);
                    self.RequireZHop = ko.observable(state.RequireZHop);
                    self.TriggeredCount = ko.observable(state.TriggeredCount).extend({compactint: 1});
                    self.IsHomed = ko.observable(state.IsHomed);
                    self.IsInPosition = ko.observable(state.IsInPosition);
                    self.InPathPosition = ko.observable(state.IsInPathPosition);
                    self.IsFeatureAllowed = ko.observable(state.IsFeatureAllowed);
                    self.IsWaitingOnFeature = ko.observable(state.IsWaitingOnFeature);
                    self.update = function (state) {
                        self.Type(state.Type);
                        self.Name(state.Name);
                        self.IsTriggered(state.IsTriggered);
                        self.IsWaiting(state.IsWaiting);
                        self.IsWaitingOnZHop(state.IsWaitingOnZHop);
                        self.IsWaitingOnExtruder(state.IsWaitingOnExtruder);
                        self.RequireZHop(state.RequireZHop);
                        self.TriggeredCount(state.TriggeredCount);
                        self.IsHomed(state.IsHomed);
                        self.IsInPosition(state.IsInPosition);
                        self.InPathPosition(state.InPathPosition);
                        self.IsFeatureAllowed(state.IsFeatureAllowed);
                        self.IsWaitingOnFeature(state.IsWaitingOnFeature);
                    };
                    self.triggerBackgroundIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "bg-not-homed";
                        else if (!self.IsTriggered() && Octolapse.PrinterStatus.isPaused())
                            return " bg-paused";
                        else
                            return "";
                    }, self);
                    /* style related computed functions */
                    self.triggerStateText = ko.pureComputed(function () {
                        //console.log("Calculating trigger state text.");
                        if (!self.IsHomed())
                            return "Idle until all axes are homed";
                        else if (self.IsTriggered())
                            return "Triggering a snapshot";
                        else if (Octolapse.PrinterStatus.isPaused())
                            return "The trigger is paused";
                        else if (self.IsWaiting()) {
                            // Create a list of things we are waiting on
                            var waitText = "Waiting";
                            var waitList = [];
                            if (self.IsWaitingOnZHop())
                                waitList.push("zhop");
                            if (self.IsWaitingOnExtruder())
                                waitList.push("extruder");
                            if (!self.IsInPosition() && !self.InPathPosition())
                                waitList.push("position");
                            if (self.IsWaitingOnFeature())
                                waitList.push("feature");
                            if (waitList.length > 1) {
                                waitText += " for " + waitList.join(" and ");
                                waitText += " to trigger";
                            }
                            else if (waitList.length === 1)
                                waitText += " for " + waitList[0] + " to trigger";
                            return waitText;
                        }
        
                        else
                            return "Waiting to trigger";
        
                    }, self);
                    self.triggerIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "not-homed";
                        if (self.IsTriggered())
                            return "trigger";
                        if (Octolapse.PrinterStatus.isPaused())
                            return "paused";
                        if (self.IsWaiting())
                            return "wait";
                        else
                            return "fa-inverse";
                    }, self);
        
                    self.getInfoText = ko.pureComputed(function () {
                        return "No info for this trigger";
                    }, self);
                    self.getInfoIconText = ko.pureComputed(function () {
                        return "";
                    }, self);
                };
                Octolapse.gcodeTriggerStateViewModel = function (state) {
                    //console.log("creating gcode trigger state view model");
                    var self = this;
                    self.Type = ko.observable(state.Type);
                    self.Name = ko.observable(state.Name);
                    self.IsTriggered = ko.observable(state.IsTriggered);
                    self.IsWaiting = ko.observable(state.IsWaiting);
                    self.IsWaitingOnZHop = ko.observable(state.IsWaitingOnZHop);
                    self.IsWaitingOnExtruder = ko.observable(state.IsWaitingOnExtruder);
                    self.SnapshotCommand = ko.observable(state.SnapshotCommand);
                    self.RequireZHop = ko.observable(state.RequireZHop);
                    self.TriggeredCount = ko.observable(state.TriggeredCount).extend({compactint: 1});
                    self.IsHomed = ko.observable(state.IsHomed);
                    self.IsInPosition = ko.observable(state.IsInPosition);
                    self.InPathPosition = ko.observable(state.IsInPathPosition);
                    self.IsWaitingOnFeature = ko.observable(state.IsWaitingOnFeature);
                    self.update = function (state) {
                        self.Type(state.Type);
                        self.Name(state.Name);
                        self.IsTriggered(state.IsTriggered);
                        self.IsWaiting(state.IsWaiting);
                        self.IsWaitingOnZHop(state.IsWaitingOnZHop);
                        self.IsWaitingOnExtruder(state.IsWaitingOnExtruder);
                        self.SnapshotCommand(state.SnapshotCommand);
                        self.RequireZHop(state.RequireZHop);
                        self.TriggeredCount(state.TriggeredCount);
                        self.IsHomed(state.IsHomed);
                        self.IsInPosition(state.IsInPosition);
                        self.InPathPosition(state.InPathPosition);
                        self.IsWaitingOnFeature(state.IsWaitingOnFeature);
                    };
        
                    self.triggerBackgroundIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "bg-not-homed";
                        else if (!self.IsTriggered() && Octolapse.PrinterStatus.isPaused())
                            return " bg-paused";
                        else
                            return "";
                    }, self);
        
                    /* style related computed functions */
                    self.triggerStateText = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "Idle until all axes are homed";
                        else if (self.IsTriggered())
                            return "Triggering a snapshot";
                        else if (Octolapse.PrinterStatus.isPaused())
                            return "Paused";
                        else if (self.IsWaiting()) {
                            // Create a list of things we are waiting on
                            var waitText = "Waiting";
                            var waitList = [];
                            if (self.IsWaitingOnZHop())
                                waitList.push("zhop");
                            if (self.IsWaitingOnExtruder())
                                waitList.push("extruder");
                            if (!self.IsInPosition() && !self.InPathPosition())
                                waitList.push("position");
                            if (self.IsWaitingOnFeature())
                                waitList.push("feature");
                            if (waitList.length > 1) {
                                waitText += " for " + waitList.join(" and ");
                                waitText += " to trigger";
                            }
                            else if (waitList.length === 1)
                                waitText += " for " + waitList[0] + " to trigger";
                            return waitText;
                        }
        
                        else
                            return "Looking for snapshot gcode";
        
                    }, self);
                    self.triggerIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "not-homed";
                        if (self.IsTriggered())
                            return "trigger";
                        if (Octolapse.PrinterStatus.isPaused())
                            return "paused";
                        if (self.IsWaiting())
                            return "wait";
                        else
                            return "fa-inverse";
                    }, self);
        
                    self.getInfoText = ko.pureComputed(function () {
                        return "Triggering on gcode command: " + self.SnapshotCommand();
        
        
                    }, self);
                    self.getInfoIconText = ko.pureComputed(function () {
                        return self.SnapshotCommand()
                    }, self);
        
                };
                Octolapse.layerTriggerStateViewModel = function (state) {
                    //console.log("creating layer trigger state view model");
                    var self = this;
                    self.Type = ko.observable(state.Type);
                    self.Name = ko.observable(state.Name);
                    self.IsTriggered = ko.observable(state.IsTriggered);
                    self.IsWaiting = ko.observable(state.IsWaiting);
                    self.IsWaitingOnZHop = ko.observable(state.IsWaitingOnZHop);
                    self.IsWaitingOnExtruder = ko.observable(state.IsWaitingOnExtruder);
                    self.CurrentIncrement = ko.observable(state.CurrentIncrement);
                    self.IsLayerChange = ko.observable(state.IsLayerChange);
                    self.IsLayerChangeWait = ko.observable(state.IsLayerChangeWait);
                    self.IsHeightChange = ko.observable(state.IsHeightChange);
                    self.IsHeightChangeWait = ko.observable(state.IsHeightChangeWait);
                    self.HeightIncrement = ko.observable(state.HeightIncrement).extend({numeric: 2});
                    self.RequireZHop = ko.observable(state.RequireZHop);
                    self.TriggeredCount = ko.observable(state.TriggeredCount).extend({compactint: 1});
                    self.IsHomed = ko.observable(state.IsHomed);
                    self.Layer = ko.observable(state.Layer);
                    self.IsInPosition = ko.observable(state.IsInPosition);
                    self.InPathPosition = ko.observable(state.IsInPathPosition);
                    self.IsWaitingOnFeature = ko.observable(state.IsWaitingOnFeature);
                    self.update = function (state) {
                        self.Type(state.Type);
                        self.Name(state.Name);
                        self.IsTriggered(state.IsTriggered);
                        self.IsWaiting(state.IsWaiting);
                        self.IsWaitingOnZHop(state.IsWaitingOnZHop);
                        self.IsWaitingOnExtruder(state.IsWaitingOnExtruder);
                        self.CurrentIncrement(state.CurrentIncrement);
                        self.IsLayerChange(state.IsLayerChange);
                        self.IsLayerChangeWait(state.IsLayerChangeWait);
                        self.IsHeightChange(state.IsHeightChange);
                        self.IsHeightChangeWait(state.IsHeightChangeWait);
                        self.HeightIncrement(state.HeightIncrement);
                        self.RequireZHop(state.RequireZHop);
                        self.TriggeredCount(state.TriggeredCount);
                        self.IsHomed(state.IsHomed);
                        self.Layer(state.Layer);
                        self.IsInPosition(state.IsInPosition);
                        self.InPathPosition(state.InPathPosition);
                        self.IsWaitingOnFeature(state.IsWaitingOnFeature);
                    };
                    self.triggerBackgroundIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "bg-not-homed";
                        else if (!self.IsTriggered() && Octolapse.PrinterStatus.isPaused())
                            return " bg-paused";
                    }, self);
        
                    /* style related computed functions */
                    self.triggerStateText = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "Idle until all axes are homed";
                        else if (self.IsTriggered())
                            return "Triggering a snapshot";
                        else if (Octolapse.PrinterStatus.isPaused())
                            return "Paused";
                        else if (self.IsWaiting()) {
                            // Create a list of things we are waiting on
                            //console.log("Generating wait state text for LayerTrigger");
                            var waitText = "Waiting";
                            var waitList = [];
                            if (self.IsWaitingOnZHop())
                                waitList.push("zhop");
                            if (self.IsWaitingOnExtruder())
                                waitList.push("extruder");
                            if (!self.IsInPosition() && !self.InPathPosition())
                            {
                                waitList.push("position");
                                //console.log("Waiting on position.");
                            }
                            if (self.IsWaitingOnFeature())
                                waitList.push("feature");
                            if (waitList.length > 1) {
                                waitText += " for " + waitList.join(" and ");
                                waitText += " to trigger";
                            }
        
                            else if (waitList.length === 1)
                                waitText += " for " + waitList[0] + " to trigger";
                            return waitText;
                        }
                        else if (self.HeightIncrement() > 0) {
                            var heightToTrigger = self.HeightIncrement() * self.CurrentIncrement();
                            return "Triggering when height reaches " + heightToTrigger.toFixed(1) + " mm";
                        }
                        else
                            return "Triggering on next layer change";
        
                    }, self);
        
                    self.triggerIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "not-homed";
                        if (self.IsTriggered())
                            return "trigger";
                        if (Octolapse.PrinterStatus.isPaused())
                            return "paused";
                        if (self.IsWaiting())
                            return " wait";
                        else
                            return " fa-inverse";
                    }, self);
        
                    self.getInfoText = ko.pureComputed(function () {
                        var val = 0;
                        if (self.HeightIncrement() > 0)
        
                            val = self.HeightIncrement() + " mm";
        
                        else
                            val = "layer";
                        return "Triggering every " + Octolapse.ToCompactInt(val);
        
        
                    }, self);
                    self.getInfoIconText = ko.pureComputed(function () {
                        var val = 0;
                        if (self.HeightIncrement() > 0)
                            val = self.CurrentIncrement();
                        else
                            val = self.Layer();
                        return Octolapse.ToCompactInt(val);
                    }, self);
        
                };
                Octolapse.timerTriggerStateViewModel = function (state) {
                    //console.log("creating timer trigger state view model");
                    var self = this;
                    self.Type = ko.observable(state.Type);
                    self.Name = ko.observable(state.Name);
                    self.IsTriggered = ko.observable(state.IsTriggered);
                    self.IsWaiting = ko.observable(state.IsWaiting);
                    self.IsWaitingOnZHop = ko.observable(state.IsWaitingOnZHop);
                    self.IsWaitingOnExtruder = ko.observable(state.IsWaitingOnExtruder);
                    self.SecondsToTrigger = ko.observable(state.SecondsToTrigger);
                    self.IntervalSeconds = ko.observable(state.IntervalSeconds);
                    self.TriggerStartTime = ko.observable(state.TriggerStartTime).extend({time: null});
                    self.PauseTime = ko.observable(state.PauseTime).extend({time: null});
                    self.RequireZHop = ko.observable(state.RequireZHop);
                    self.TriggeredCount = ko.observable(state.TriggeredCount);
                    self.IsHomed = ko.observable(state.IsHomed);
                    self.IsInPosition = ko.observable(state.IsInPosition);
                    self.InPathPosition = ko.observable(state.IsInPathPosition);
                    self.IsWaitingOnFeature = ko.observable(state.IsWaitingOnFeature);
                    self.update = function (state) {
                        self.Type(state.Type);
                        self.Name(state.Name);
                        self.IsTriggered(state.IsTriggered);
                        self.IsWaiting(state.IsWaiting);
                        self.IsWaitingOnZHop(state.IsWaitingOnZHop);
                        self.IsWaitingOnExtruder(state.IsWaitingOnExtruder);
                        self.RequireZHop(state.RequireZHop);
                        self.SecondsToTrigger(state.SecondsToTrigger);
                        self.TriggerStartTime(state.TriggerStartTime);
                        self.PauseTime(state.PauseTime);
                        self.IntervalSeconds(state.IntervalSeconds);
                        self.TriggeredCount(state.TriggeredCount);
                        self.IsHomed(state.IsHomed);
                        self.IsInPosition(state.IsInPosition);
                        self.InPathPosition(state.InPathPosition);
                        self.IsWaitingOnFeature(state.IsWaitingOnFeature);
                    };
        
        
                    /* style related computed functions */
                    self.triggerStateText = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "Idle until all axes are homed";
                        else if (self.IsTriggered())
                            return "Triggering a snapshot";
                        else if (Octolapse.PrinterStatus.isPaused())
                            return "Paused";
                        else if (self.IsWaiting()) {
                            // Create a list of things we are waiting on
                            var waitText = "Waiting";
                            var waitList = [];
                            if (self.IsWaitingOnZHop())
                                waitList.push("zhop");
                            if (self.IsWaitingOnExtruder())
                                waitList.push("extruder");
                            if (!self.IsInPosition() && !self.InPathPosition())
                                waitList.push("position");
                            if (self.IsWaitingOnFeature())
                                waitList.push("feature");
                            if (waitList.length > 1) {
                                waitText += " for " + waitList.join(" and ");
                                waitText += " to trigger";
                            }
                            else if (waitList.length === 1)
                                waitText += " for " + waitList[0] + " to trigger";
                            return waitText;
                        }
        
                        else
                            return "Triggering in " + self.SecondsToTrigger() + " seconds";
        
                    }, self);
                    self.triggerBackgroundIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "bg-not-homed";
                        else if (!self.IsTriggered() && Octolapse.PrinterStatus.isPaused())
                            return " bg-paused";
                    }, self);
                    self.triggerIconClass = ko.pureComputed(function () {
                        if (!self.IsHomed())
                            return "not-homed";
                        if (self.IsTriggered())
                            return "trigger";
                        if (Octolapse.PrinterStatus.isPaused())
                            return "paused";
                        if (self.IsWaiting())
                            return " wait";
                        else
                            return " fa-inverse";
                    }, self);
                    self.getInfoText = ko.pureComputed(function () {
                        return "Triggering every " + Octolapse.ToTimer(self.IntervalSeconds());
                    }, self);
                    self.getInfoIconText = ko.pureComputed(function () {
                        return "Triggering every " + Octolapse.ToTimer(self.IntervalSeconds());
                    }, self);
                };
        
        // Bind the settings view model to the plugin settings element
                OCTOPRINT_VIEWMODELS.push([
                    Octolapse.StatusViewModel
                    , []
                    , ["#octolapse_tab", "#octolapse_navbar"]
                ]);
            }
        );
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin octolapse:", (error.stack || error));
    }
})();

// JS assets for plugin octoprint_finetunerptr
(function () {
    try {
        // source: plugin/octoprint_finetunerptr/js/util.js
        // execute once, needed in frontend
        var opClient = new OctoPrintClient({
          baseurl: "",
          apikey: ""
        });
        
        function toggleNavbarDropdownPanel(strict) {
          var el = document.getElementsByClassName("finetunerptr_dropdown")[0]
          var currentDisplayState = el.style.display;
          el.style.display = strict || (currentDisplayState == "none") ? 'block' : 'none';
        }
        
        // executed before panel opens
        function collapseAllBootstrapAccordionPanels(index) {
          var elements = document.getElementsByClassName('eepromCollapse');
          for (var i = 0; i < elements.length; i++) {
            if (i !== index) {
              elements[i].style.transition = "all 0.5s ease-in;";
              elements[i].style.height = "0px";
              elements[i].classList.remove("in");
            }
          }
        };
        
        // DropDown Menu specific methods + jQuery
        //http://stackoverflow.com/a/2234986
        function isDescendant(parent, child) {
          var node = child.parentNode;
          while (node != null) {
            if (node == parent) {
              return true;
            }
            node = node.parentNode;
          }
          return false;
        }
        
        //http://stackoverflow.com/questions/3440022/mouse-click-somewhere-else-on-page-not-on-a-specific-div
        (function($) {
          $.fn.outside = function(ename, cb) {
            return this.each(function() {
              var $this = $(this),
                self = this;
              $(document.body).bind(ename, function tempo(e) {
                if (e.target !== self && !$.contains(self, e.target)) {
                  cb.apply(self, [e]);
                  if (!self.parentNode) $(document.body).unbind(ename, tempo);
                }
              });
            });
          };
        }(jQuery));
        
        $('.finetunerptr_dropdownBtn').outside('click', function(e) {
          var el = document.getElementsByClassName("finetunerptr_dropdown")[0];
          var isChild = isDescendant(el, e.target);
          var isDropDownBody = (e.target.className === "finetunerptr_dropdown");
          var isDeleteBtn = (e.target.className === "icon-trash");
          if (!isChild && !isDropDownBody && !isDeleteBtn) {
            $('.finetunerptr_dropdown').hide();
          }
        });
        // /DropDown Menu specific methods + jQuery
        
        function showNotLoggedInNotification() {
          new PNotify({
            title: 'FineTuneRptr',
            text: "You must be logged in to use this plugin."
          });
        }
        
        // closeAllNotifications
        function closeAllNotifications() {
          var closeBtns = document.getElementsByClassName("icon-remove");
          for (var i = 0; i < closeBtns.length; i++) {
            closeBtns[i].click();
          }
          if(i > 0) toggleNavbarDropdownPanel('block');
        }
        
        ;
        
        // source: plugin/octoprint_finetunerptr/js/categorizedEeprom.js
        // icons http://fontawesome.io/icons/
        // 'icon' + IconName;
        var categorizedEeprom = [{
              Name: 'Favorites',
              Icon: 'star',
              EEPROM_Descriptions: [],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'General',
              Icon: 'cog',
              EEPROM_Descriptions: [
                 "Language",
                 "Baudrate",
                 "Filament printed [m]",
                 "Printer active [s]",
                 "Max. inactive time [ms,0=off]",
                 "Stop stepper after inactivity [ms,0=off]",
                 "Coating thickness [mm]"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Heaters',
              Icon: 'fire',
              EEPROM_Descriptions: [
                 "Bed Heat Manager [0-3]",
                 "Bed PID drive max",
                 "Bed PID drive min",
                 "Bed PID P-gain",
                 "Bed PID I-gain",
                 "Bed PID D-gain",
                 "Bed PID max value [0-255]",
                 "Extr.1 heat manager [0-3]",
                 "Extr.1 PID drive max",
                 "Extr.1 PID drive min",
                 "Extr.1 PID P-gain/dead-time",
                 "Extr.1 PID I-gain",
                 "Extr.1 PID D-gain",
                 "Extr.1 PID max value [0-255]",
                 "Extr.1 X-offset [steps]",
                 "Extr.1 Y-offset [steps]",
                 "Extr.1 Z-offset [steps]",
                 "Extr.1 temp. stabilize time [s]",
                 "Extr.1 temp. for retraction when heating [C]",
                 "Extr.1 distance to retract when heating [mm]",
                 "Extr.1 extruder cooler speed [0-255]"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Steps_Feedrate',
              Icon: 'random',
              EEPROM_Descriptions: [
                 "Extr.1 steps per mm",
                 "Extr.1 max. feedrate [mm/s]",
                 "Extr.1 start feedrate [mm/s]",
                 "X-axis steps per mm",
                 "Y-axis steps per mm",
                 "Z-axis steps per mm",
                 "X-axis max. feedrate [mm/s]",
                 "Y-axis max. feedrate [mm/s]",
                 "Z-axis max. feedrate [mm/s]",
                 "X-axis homing feedrate [mm/s]",
                 "Y-axis homing feedrate [mm/s]",
                 "Z-axis homing feedrate [mm/s]"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Retraction',
              Icon: 'reply-all',
              EEPROM_Descriptions: [
                 "Enable retraction conversion [0/1]",
                 "Retraction length [mm]",
                 "Retraction speed [mm/s]",
                 "Retraction z-lift [mm]",
                 "Extra extrusion on undo retract [mm]",
                 "Retraction undo speed"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Dimensions',
              Icon: 'fullscreen',
              EEPROM_Descriptions: [
                 "X min pos [mm]",
                 "Y min pos [mm]",
                 "Z min pos [mm]",
                 "X max length [mm]",
                 "Y max length [mm]",
                 "Z max length [mm]"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Acceleration',
              Icon: 'superscript',
              EEPROM_Descriptions: [
                 "Max. jerk [mm/s]",
                 "Max. Z-jerk [mm/s]",
                 "Extr.1 acceleration [mm/s^2]",
                 "X-axis acceleration [mm/s^2]",
                 "Y-axis acceleration [mm/s^2]",
                 "Z-axis acceleration [mm/s^2]",
                 "X-axis travel acceleration [mm/s^2]",
                 "Y-axis travel acceleration [mm/s^2]",
                 "Z-axis travel acceleration [mm/s^2]"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Z_Probe',
              Icon: 'double-angle-down',
              EEPROM_Descriptions: [
                 "Z-probe height [mm]",
                 "Max. z-probe - bed dist. [mm]",
                 "Z-probe speed [mm/s]",
                 "Z-probe x-y-speed [mm/s]",
                 "Z-probe offset x [mm]",
                 "Z-probe offset y [mm]",
                 "Z-probe X1 [mm]",
                 "Z-probe Y1 [mm]",
                 "Z-probe X2 [mm]",
                 "Z-probe Y2 [mm]",
                 "Z-probe X3 [mm]",
                 "Z-probe Y3 [mm]",
                 "Z-probe bending correction A [mm]",
                 "Z-probe bending correction B [mm]",
                 "Z-probe bending correction C [mm]",
                 "Autolevel active (1/0)"
              ],
              EEPROM_Values: ko.observableArray([]),
           },
           {
              Name: 'Other',
              Icon: 'code-fork',
              EEPROM_Descriptions: [],
              EEPROM_Values: ko.observableArray([]),
           },
        ];
        
        ;
        
        // source: plugin/octoprint_finetunerptr/js/finetunerptr.js
        /* ########################################################
         *
         *             FineTuneRptr   |     04/2017++
         *  Author: Andreas Bruckmann | License: AGPLv3
         *
         * ########################################################
         *
         *  Keeps important calibration settings always accessible.
         *  As it's not integrated to any subpage, tab or settings,
         *  you can easily use it from whichever page in OctoPrint.
         *
         * ########################################################
         *
         *  Making Use of:
         *  OctoPrint EEPROM Editor by Salandora https://github.com/Salandora/OctoPrint-EEPROM-Repetier
         *  FontAwesome Icons http://fontawesome.io/3.2.1/icons/
         *  Accordion: Bootstrap https://www.w3schools.com/bootstrap/bootstrap_collapse.asp
         *  OctoPrint API http://docs.octoprint.org/en/master/jsclientlib/index.html
         *
         * ########################################################
         *
         */
        
        /*
             TODO:
               - Export/Import Full EEPROM compatible for Repetier Host
               - Settings hier abspeichern http://docs.octoprint.org/en/master/plugins/mixins.html#settingsplugin
                 statt localStorage
        
             BUG.S:
              - Wenn EEPROM geladen wird, werden Favoriten angezeigt und in ihrer normalen Kategorie
                sind die Einträge noch vorhanden.
                Wenn man wieder lädt, verschwinden die Einträge aus den ursprünglichen Kategorien.
        */
        
        $(function() {
          function FinetunerptrViewModel(parameters) {
            // Variables ######################################################################################
            var self = this;
            self.control = parameters[0];
            self.connection = parameters[1];
            self.loginStateViewModel = parameters[2];
            self.isRepetierFirmware = ko.observable(false);
        
            self.isConnected = ko.computed(function() {
              return self.connection.isOperational() || self.connection.isPrinting() ||
                self.connection.isReady() || self.connection.isPaused();
            });
        
            self.categorizedEeprom = ko.observableArray(categorizedEeprom);
        
            self.loadedEepromSettingsCounter = ko.observable(0);
            self.eepromLoaded = ko.computed(function() {
              return (self.loadedEepromSettingsCounter() > 51);
            });
        
            // Methods ######################################################################################
            // closeAllNotifications
            self.closeAllNotifications = function() {
              closeAllNotifications();
            }
            // Show Panel Dropdown
            self.toggleNavbarDropdownPanel = function(strict) {
              toggleNavbarDropdownPanel(strict);
            }
        
            // EEPROM Accordion Dropdown
            self.collapseAllBootstrapAccordionPanels = function() {
              collapseAllBootstrapAccordionPanels()
            };
        
            // data = element to handle , method = 1=add / 0=delete
            // data can be passed from frontend as "addToFavorites"
            self.updateFavorites = function(data, method) {
              var _fullname = "__eepromSettings__favorites";
              var savedData = JSON.parse(localStorage.getItem(_fullname));
        
              var _localStorageData = {
                'eepromFavorites': new Array()
              };
              // Load known favorites from localStorage
              if (savedData && data) {
                var knownEntry = (savedData.indexOf(data.description) !== -1);
                for (var i in savedData) {
                  _localStorageData.eepromFavorites.push(savedData[i]);
                }
              } else if (savedData && !data) {
                for (var i in savedData) {
                  _localStorageData.eepromFavorites.push(savedData[i]);
                }
              }
        
              switch (method) {
                case 0:
                  // Delete
                  if (knownEntry && data && data.description) {
                    _localStorageData.eepromFavorites.splice(_localStorageData.eepromFavorites.indexOf(data.description), 1);
                    localStorage.setItem(_fullname, JSON.stringify(_localStorageData.eepromFavorites));
                  }
                  break;
                case 1:
                  // Add if not already member
                  if (!knownEntry && data && data.description) {
                    _localStorageData.eepromFavorites.push(data.description);
                    localStorage.setItem(_fullname, JSON.stringify(_localStorageData.eepromFavorites));
                  }
                  break;
              }
              self.scopeFavorites(_localStorageData.eepromFavorites);
            };
        
            self.scopeFavorites = function(favArray) {
              return new Promise(function(resolve, reject) {
                let promises = [];
                self.categorizedEeprom()[0].EEPROM_Descriptions = ko.observableArray(favArray);
        
                for (var favArrCount = 0; favArrCount < favArray.length; favArrCount++) {
                  let prom = new Promise(function(resolve, reject) {
                    self.getEepromValue(favArray[favArrCount])
                      .then(function(dataObj) {
                        var eepromValuesObj = {
                          'category': dataObj.category,
                          'description': dataObj.description,
                          'value': dataObj.value,
                          'Icon': dataObj.Icon,
                          'dataType': dataObj.dataType,
                          'origValue': dataObj.origValue,
                          'position': dataObj.position,
                        };
                        resolve(eepromValuesObj);
                      });
                  });
                  promises.push(prom);
                }
                Promise.all(promises).then(function(values) {
                  self.categorizedEeprom()[0].EEPROM_Values([]);
                  for (let v in values) {
                    self.categorizedEeprom()[0].EEPROM_Values.push(values[v]);
                  }
                  resolve(self.categorizedEeprom()[0].EEPROM_Values);
                });
              });
            };
        
            self.getEepromValue = function(description) {
              return new Promise(function(resolve, reject) {
                var output = {};
                for (var i = 0; i < self.categorizedEeprom().length; i++) {
                  for (var j = 0; j < self.categorizedEeprom()[i].EEPROM_Values().length; j++) {
                    if (self.categorizedEeprom()[i].EEPROM_Values()[j].description == description) {
                      self.categorizedEeprom()[i].EEPROM_Values()[j].Icon = self.categorizedEeprom()[i].Icon;
                      output = self.categorizedEeprom()[i].EEPROM_Values()[j];
                      resolve(output);
                    }
                  }
                }
                reject("Error:: " + description);
              });
            };
        
            // Motors Off
            self.setPrinterRepetierMotorsOff = function() {
              if (!self.loginStateViewModel.loggedIn()){
                showNotLoggedInNotification();
                 return -1;
               }
              self.control.sendCustomCommand({
                command: 'M84'
              });
            };
        
            //  Printer Home XY
            self.setPrinterHomeXY = function() {
              if (!self.loginStateViewModel.loggedIn()){
                showNotLoggedInNotification();
                 return -1;
               }
              self.control.sendCustomCommand({
                command: 'G28 X0 Y0'
              });
            };
        
            // EEPROM Methods
            self.fromHistoryData = function(data) {
              _.each(data.logs, function(line) {
                fromCurrentData_noRFw(line);
              });
            };
            self.fromCurrentData = function(data) {
              if (!self.isRepetierFirmware()) {
                _.each(data.logs, function(line) {
                  fromCurrentData_noRFw(line);
                });
              } else {
                _.each(data.logs, function(line) {
                  fromCurrentData_isRFw(line);
                });
              }
            };
            var fromCurrentData_noRFw = function(line) {
              var match = /FIRMWARE_NAME:([^\s]+)/i.exec(line);
              if (match) {
                if (/Repetier_([^\s]*)/i.exec(match[0]))
                  self.isRepetierFirmware(true);
              }
            };
            var fromCurrentData_isRFw = function(line) {
              var match = /EPR:(\d+) (\d+) ([^\s]+) (.+)/.exec(line);
              if (match) {
                var description = match[4];
                categorizeEepromReading(match[4])
                  .then(function(category) {
                    regexPushObject(category, match);
                  })
              }
            }
        
            var categorizeEepromReading = function(description) {
              return new Promise(function(resolve, reject) {
                for (var i = 0; i < self.categorizedEeprom().length; i++) {
                  if (self.categorizedEeprom()[i].EEPROM_Descriptions.indexOf(description) != -1) {
                    resolve(self.categorizedEeprom()[i].Name);
                  }
                }
                resolve("Other");
              });
            };
        
            var regexPushObject = function(category, match) {
              for (var i = 0; i < self.categorizedEeprom().length; i++) {
                if (self.categorizedEeprom()[i].Name == category) {
                  var outputObj = {
                    dataType: match[1],
                    position: match[2],
                    origValue: match[3],
                    value: match[3],
                    description: match[4],
                    category: category,
                  };
                  self.categorizedEeprom()[i].EEPROM_Values.push(outputObj);
                }
              }
              self.loadedEepromSettingsCounter(self.loadedEepromSettingsCounter() + 1);
              if (self.loadedEepromSettingsCounter() == 52) {
                self.updateFavorites();
              }
            };
        
            self.loadEeprom = function() {
              if (!self.loginStateViewModel.loggedIn()) return -1;
              (function() {
                return new Promise(function(resolve, reject) {
                  //first reset/clear everything
                  for (var l = 0; l < self.categorizedEeprom().length; l++) {
                    self.categorizedEeprom()[l].EEPROM_Values([]);
                  }
                  if (l == self.categorizedEeprom().length || !self.eepromLoaded()) {
                    resolve(self.categorizedEeprom());
                  }
                });
              })()
              .then(function() {
                self._requestEepromData();
              });
            };
        
            self.saveEeprom = function() {
              if (!self.loginStateViewModel.loggedIn()) return -1;
              for (let i in self.categorizedEeprom()) {
                for (let j in self.categorizedEeprom()[i].EEPROM_Values()) {
                  var valObj = self.categorizedEeprom()[i].EEPROM_Values()[j];
                  if (valObj.origValue !== valObj.value) {
                    self._requestSaveDataToEeprom(valObj.dataType, valObj.position, valObj.value);
                    valObj.origValue = valObj.value;
                  }
                }
              }
            };
        
            self._requestFirmwareInfo = function() {
              if (!self.loginStateViewModel.loggedIn()) return -1;
              self.control.sendCustomCommand({
                command: "M115"
              });
            };
            self._requestEepromData = function() {
              if (!self.loginStateViewModel.loggedIn()) return -1;
              self.control.sendCustomCommand({
                command: "M205"
              });
            };
            self._requestSaveDataToEeprom = function(data_type, position, value) {
              if (!self.loginStateViewModel.loggedIn()) return -1;
              var cmd = "M206 T" + data_type + " P" + position;
              if (data_type == 3) {
                cmd += " X" + value;
                self.control.sendCustomCommand({
                  command: cmd
                });
              } else {
                cmd += " S" + value;
                self.control.sendCustomCommand({
                  command: cmd
                });
              }
            };
        
            // EventHandlers ################################################################################
        
            self.connectOpClient = function(){
              if (!self.loginStateViewModel.loggedIn()) showNotLoggedInNotification();
              if (self.loginStateViewModel.loggedIn()) opClient.connection.connect();
            }
        
            self.disconnectOpClient = function(){
              if (!self.loginStateViewModel.loggedIn()) showNotLoggedInNotification();
              if (self.loginStateViewModel.loggedIn()) opClient.connection.disconnect();
            }
        
            self.onEventConnected = function() {
              self._requestFirmwareInfo();
            };
        
            self.onEventDisconnected = function() {
              self.isRepetierFirmware(false);
            };
        
            self.onStartup = function() {
              $('#navbar_plugin_octoprint_finetunerptr a').on('click', function(e) {
                if (self.isConnected() && !self.isRepetierFirmware()) {
                  self._requestFirmwareInfo();
                }
              });
            };
          }
          OCTOPRINT_VIEWMODELS.push({
            construct: FinetunerptrViewModel,
            dependencies: ["controlViewModel", "connectionViewModel", "loginStateViewModel"],
            elements: ["#navbar_plugin_octoprint_finetunerptr"]
          });
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin octoprint_finetunerptr:", (error.stack || error));
    }
})();

// JS assets for plugin printhistory
(function () {
    try {
        // source: plugin/printhistory/js/printhistory.js
        $(function() {
            function PrintHistoryViewModel(parameters) {
                var self = this;
        
                self.loginState = parameters[0];
                self.global_settings = parameters[1];
                self.users = parameters[2];
        
                self.totalTime = ko.observable();
                self.totalUsage = ko.observable();
                self.averageTime = ko.observable();
                self.averageUsage = ko.observable();
        
                self.isPrinting = ko.observable(undefined);
        
                self.spool_inventory = ko.observableArray([]);
                self.spool_inventory_base = ko.observableArray([]);
                self.availableCurrencies = ko.observableArray(['$', '€', '£']);
        
                self.itemForEditing = ko.observable();
        
                var HistoryItem = function(data) {
                    this.id = ko.observable();
                    this.fileName = ko.observable();
                    this.success = ko.observable();
                    this.filamentVolume = ko.observable();
                    this.filamentLength = ko.observable();
                    this.timestamp = ko.observable();
                    this.printTime = ko.observable();
                    this.note = ko.observable();
                    this.spool = ko.observable();
                    this.user = ko.observable();
        
                    this.successful = ko.computed(function() {
                        return this.success() == 1;
                    }, this);
                    this.filamentUsage = ko.computed(self.formatFilament, this);
                    this.formatedDate = ko.computed(function () {
                        return formatDate(this.timestamp());
                    }, this);
                    this.formatedTimeAgo = ko.computed(function () {
                        return formatTimeAgo(this.timestamp());
                    }, this);
                    this.formatedDuration = ko.computed(function () {
                        return formatDuration(this.printTime());
                    }, this);
        
                    this.update(data);
                }
        
                HistoryItem.prototype.update = function (data) {
                    var updateData = data || {}
        
                    this.id(updateData.id);
                    this.fileName(updateData.fileName);
                    this.success(updateData.success);
                    this.filamentVolume(updateData.filamentVolume || 0);
                    this.filamentLength(updateData.filamentLength || 0);
                    this.timestamp(updateData.timestamp || 0);
                    this.printTime(updateData.printTime || 0);
                    this.note(updateData.note || "");
                    this.spool(updateData.spool || "");
                    this.user(updateData.user || "");
                };
        
                self.onHistoryTab = false;
                self.dataIsStale = true;
                self.requestingData = false;
                self.pureData = {};
                self.lastMonthGraphMinimum = ko.observable(moment(new Date()).subtract(1, 'months').valueOf());
        
                self.onStartup = function () {
                    self.detailsDialog = $("#printhistory_details_dialog");
                    self.detailsDialog.on('hidden', self.onCancelDetails);
                }
        
                self.onBeforeBinding = function () {
                    self.settings = self.global_settings.settings.plugins.printhistory;
                    self.spool_inventory(self.settings.spool_inventory.slice(0));
                    self.spool_inventory_base(self.settings.spool_inventory);
                };
        
                self.onAfterTabChange = function(current, previous) {
                    self.onHistoryTab = current == "#tab_plugin_printhistory"
                    self.updatePlots();
                }
        
                self.fromCurrentData = function (data) {
                    var isPrinting = data.state.flags.printing;
        
                    if (isPrinting != self.isPrinting()) {
                        self.requestData();
                    }
        
                    self.isPrinting(isPrinting);
                };
        
                self.requestData = function(params) {
                    var force = false;
        
                    if (_.isObject(params)) {
                        force = params.force;
                    }
        
                    if (!self.onHistoryTab) {
                        self.dataIsStale = true;
                        return;
                    }
                    //console.log('PrintHistory - request data');
                    if (self.requestingData) {
                        return;
                    }
                    self.requestingData = true;
        
                    $.ajax({
                        url: "plugin/printhistory/history",
                        type: "GET",
                        data: {force: force},
                        dataType: "json",
                        success: self.fromResponse
                    }).always(function () {
                        self.requestingData = false;
                    });
                };
        
                self.fromResponse = function(data) {
                    var dataRows = ko.utils.arrayMap(data.history, function (data) {
                        return new HistoryItem(data);
                    });
        
                    self.pureData = data.history;
        
                    self.dataIsStale = false;
                    self.listHelper.updateItems(dataRows);
                    self.updatePlots();
                };
        
                self.removeFile = function(id) {
                    $.ajax({
                        url: "plugin/printhistory/history/" + id(),
                        type: "DELETE",
                        dataType: "json",
                        success: function(data) {
                            self.fromResponse(data);
                        }
                    });
                };
        
                self.formatFilament = function() {
                    var tool0 = "";
                    var tool1 = "";
                    var output = "";
        
                    if (this.filamentLength() != undefined) {
                        tool0 += formatFilament({length: this.filamentLength(), volume: this.filamentVolume()});
                    }
        
                    //if (data.hasOwnProperty('filamentLength2') && data.filamentLength2 != 0) {
                    //    tool1 += formatFilament({length: data.filamentLength2, volume: data.filamentVolume2});
                    //}
        
                    if (tool0 !== "" && tool1 !== "") {
                        output = "Tool0: " + tool0 + "<br>Tool1: " + tool1;
                    } else {
                        if (tool0 !== "") {
                            output = tool0;
                        } else {
                            output = tool1;
                        }
                    }
        
                    return output;
                };
        
                self.export = function(type) {
                    if (self.listHelper.items().length > 0) {
                        return "plugin/printhistory/export/" + type + "?apikey=" + UI_API_KEY;
                    } else {
                        return false;
                    }
                };
        
                self.changeGraphRange = function (range) {
                    if (range == 'week') {
                        self.lastMonthGraphMinimum(moment(new Date()).subtract(1, 'weeks').valueOf());
                    } else if (range == 'month'){
                        self.lastMonthGraphMinimum(moment(new Date()).subtract(1, 'months').valueOf());
                    } else {
                        self.lastMonthGraphMinimum(moment(new Date()).subtract(1, 'quarter').valueOf());
                    }
        
                    self.updatePlots();
                };
        
                function printhistoryLabelFormatter(label, series) {
                    return "<div style='font-size:8pt; text-align:center; padding:2px; color: #666666;'>" + label + "<br/>" + Math.round(series.percent) + "%</div>";
                }
        
                self.updatePlots = function() {
                    if (!self.onHistoryTab) {
                        return;
                    }
        
                    if (self.dataIsStale) {
                        self.requestData();
                        return;
                    }
        
                    var lastmonth_graph = $("#printhistory-lastmonth-graph");
                    var success_graph = $("#printhistory-success-graph");
        
                    var lastmonthGraphOptions = {
                        series: {
                            stack: 0,
                            bars: {
                                show: true,
                                barWidth: 1000*60*60*24*0.6,
                                lineWidth: 0,
                                fill: 1,
                                align: "center"
                            }
                        },
                        yaxis: {
                            tickDecimals: 0,
                            min: 0
                        },
                        xaxis: {
                            mode: "time",
                            minTickSize: [1, "day"],
                            min: self.lastMonthGraphMinimum(),
                            max: new Date().getTime(),
                            timeformat: "%m-%d"
                        },
                        legend: {
                            show: false
                        }
                    };
        
                    var successGraphOptions = {
                        series: {
                            pie: {
                                show: true,
                                radius: 1,
                                label: {
                                    show: true,
                                    radius: 1/2,
                                    formatter: printhistoryLabelFormatter,
                                    background: {
                                        opacity: 0.5
                                    }
                                }
                            }
                        },
                        legend: {
                            show: false
                        }
                    };
        
                    var successCount = 0;
                    var failureCount = 0;
        
                    var agreggateSuccess = {};
                    var agreggateFailure = {};
        
                    _.each(_.keys(self.pureData), function(key) {
                        var day = moment.unix(self.pureData[key].timestamp).hour(0).minute(0).second(0).millisecond(0).valueOf();
        
                        if (self.pureData[key].success == 1) {
                            successCount += 1;
        
                            if (!agreggateSuccess.hasOwnProperty(day)) {
                                agreggateSuccess[day] = 0;
                            }
                            agreggateSuccess[day] += 1;
                        } else {
                            failureCount += 1;
        
                            if (!agreggateFailure.hasOwnProperty(day)) {
                                agreggateFailure[day] = 0;
                            }
                            agreggateFailure[day] += 1;
                        }
                    });
        
                    var successArr = [];
                    var failureArr = [];
        
                    _.each(_.keys(agreggateSuccess), function(key) {
                        successArr.push([key, agreggateSuccess[key]]);
                    });
        
                    _.each(_.keys(agreggateFailure), function(key) {
                        failureArr.push([key, agreggateFailure[key]]);
                    });
        
                    var lastmonth_data = [
                        { label: "Success", color: '#31C448', data: successArr},
                        { label: "Failure", color: '#FF0000', data: failureArr}
                    ];
        
                    var success_data = [
                        { label: "Success", color: '#31C448', data: successCount},
                        { label: "Failure", color: '#FF0000', data: failureCount}
                    ];
        
                    $.plot(lastmonth_graph, lastmonth_data, lastmonthGraphOptions);
                    $.plot(success_graph, success_data, successGraphOptions);
                };
        
                /*
                 * -----------
                 *  SETTINGS
                 * -----------
                 */
                self.addNewSpool = function() {
                    self.spool_inventory.push({name: "New", price:0, currency: "$"});
                };
        
                self.removeSpool = function(spool) {
                    self.spool_inventory.remove(spool);
                };
        
                self.onSettingsHidden = function() {
                    self.spool_inventory(self.spool_inventory_base.slice(0));
                };
        
                self.onSettingsBeforeSave = function () {
                    self.global_settings.settings.plugins.printhistory.spool_inventory(self.spool_inventory.slice(0));
                }
        
                /*
                 * -----------
                 *   DETAILS
                 * -----------
                 */
                self.showDetailsDialog = function(selectedData) {
                    if (self.detailsDialog) {
                        self.itemForEditing(new HistoryItem(ko.mapping.toJS(selectedData)));
        
                        self.detailsDialog.modal("show");
                    }
                };
        
                self.onCancelDetails = function (event) {
                    if (event.target.id == "printhistory_details_dialog") {
                        self.itemForEditing(null);
                    }
                }
        
                self.addUpdateDetails = function(event) {
                    var icon = $(".btn-primary i", self.detailsDialog);
                    icon.addClass("icon-spinner icon-spin");
        
                    var payload = {
                        id: self.itemForEditing().id(),
                        note: self.itemForEditing().note(),
                        spool: self.itemForEditing().spool(),
                        user: self.itemForEditing().user(),
                        success: self.itemForEditing().success(),
                        filamentLength: self.itemForEditing().filamentLength(),
                        filamentVolume: self.itemForEditing().filamentVolume()
                    }
        
                    $.ajax({
                        url: "plugin/printhistory/details",
                        type: "PUT",
                        data: JSON.stringify(payload),
                        dataType: "json",
                        contentType: "application/json; charset=UTF-8",
                        success: self.closeDetails
                    }).always(function() {
                        icon.removeClass("icon-spinner icon-spin");
                    });
                };
        
                self.closeDetails = function(data) {
                    self.fromResponse(data);
        
                    self.listHelper.selectNone();
        
                    self.detailsDialog.modal("hide");
                };
        
                self.listHelper = new ItemListHelper(
                    "historyItems",
                    {
                        "fileNameAsc": function (a, b) {
                            // sorts ascending
                            if (a.fileName().toLocaleLowerCase() < b.fileName().toLocaleLowerCase()) return -1;
                            if (a.fileName().toLocaleLowerCase() > b.fileName().toLocaleLowerCase()) return 1;
                            return 0;
                        },
                        "fileNameDesc": function (a, b) {
                            // sorts ascending
                            if (a.fileName().toLocaleLowerCase() < b.fileName().toLocaleLowerCase()) return 1;
                            if (a.fileName().toLocaleLowerCase() > b.fileName().toLocaleLowerCase()) return -1;
                            return 0;
                        },
                        "timestampAsc": function (a, b) {
                            // sorts descending
                            if (a.timestamp() > b.timestamp()) return 1;
                            if (a.timestamp() < b.timestamp()) return -1;
                            return 0;
                        },
                        "timestampDesc": function (a, b) {
                            // sorts descending
                            if (a.timestamp() > b.timestamp()) return -1;
                            if (a.timestamp() < b.timestamp()) return 1;
                            return 0;
                        },
                        "printTimeAsc": function (a, b) {
                            // sorts descending
                            if (a.printTime() > b.printTime()) return 1;
                            if (a.printTime() < b.printTime()) return -1;
                            return 0;
                        },
                        "printTimeDesc": function (a, b) {
                            // sorts descending
                            if (a.printTime() > b.printTime()) return -1;
                            if (a.printTime() < b.printTime()) return 1;
                            return 0;
                        }
                    },
                    {
                        "all": function (item) {
                            return true;
                        },
                        "successful": function (item) {
                            return (item.success() == 1);
                        },
                        "failed": function (item) {
                            return (item.success() == 0);
                        }
                    },
                    "timestamp", ["all"], [["all", "successful", "failed"]], 10
                );
        
                self.listHelper.items.subscribe(function(newValue) {
                    var totalTime = 0;
                    var totalUsage = {
                        length: 0,
                        volume: 0
                    };
                    var averageUsage = {
                        length: 0,
                        volume: 0
                    };
        
                    var itemList = newValue;
                    var itemListLength = itemList.length;
                    for (var i = 0; i < itemListLength; i++) {
                        totalTime += itemList[i].printTime();
        
                        totalUsage.length += itemList[i].filamentLength();
                        totalUsage.volume += itemList[i].filamentVolume();
                    }
        
                    self.totalTime(formatDuration(totalTime));
                    self.totalUsage(formatFilament(totalUsage));
        
                    averageUsage.length = totalUsage.length / itemListLength;
                    averageUsage.volume = totalUsage.volume / itemListLength;
        
                    self.averageTime(formatDuration(totalTime / itemListLength));
                    self.averageUsage(formatFilament(averageUsage));
                });
        
                self.fileNameSort = function() {
                    if (self.listHelper.currentSorting() == "fileNameAsc") {
                        self.listHelper.changeSorting("fileNameDesc");
                    } else {
                        self.listHelper.changeSorting("fileNameAsc");
                    }
                };
        
                self.timeStampSort = function() {
                    if (self.listHelper.currentSorting() == "timestampDesc") {
                        self.listHelper.changeSorting("timestampAsc");
                    } else {
                        self.listHelper.changeSorting("timestampDesc");
                    }
                };
        
                self.printTimeSort = function() {
                    if (self.listHelper.currentSorting() == "printTimeDesc") {
                        self.listHelper.changeSorting("printTimeAsc");
                    } else {
                        self.listHelper.changeSorting("printTimeDesc");
                    }
                };
        
                self.sortOrder = function(orderType) {
                    var order = "";
        
                    if (orderType == "fileName") {
                        order = (self.listHelper.currentSorting() == 'fileNameAsc') ? '(' + _('ascending') + ')' : (self.listHelper.currentSorting() == 'fileNameDesc') ? '(' + _('descending') + ')' : '';
                    } else if (orderType == "timestamp") {
                        order = (self.listHelper.currentSorting() == 'timestampAsc') ? '(' + _('ascending') + ')' : (self.listHelper.currentSorting() == 'timestampDesc') ? '(' + _('descending') + ')' : '';
                    } else {
                        order = (self.listHelper.currentSorting() == 'printTimeAsc') ? '(' + _('ascending') + ')' : (self.listHelper.currentSorting() == 'printTimeDesc') ? '(' + _('descending') + ')' : '';
                    }
        
                    return order;
                };
            }
        
            ADDITIONAL_VIEWMODELS.push({
                construct: PrintHistoryViewModel,
                name: "PrintHistoryViewModel",
                dependencies: ["loginStateViewModel", "settingsViewModel", "usersViewModel"],
                elements: ["#tab_plugin_printhistory", "#settings_plugin_printhistory"]
        });
        });
        ;
        
        // source: plugin/printhistory/js/jquery.flot.pie.js
        /* Flot plugin for rendering pie charts.
        
        Copyright (c) 2007-2014 IOLA and Ole Laursen.
        Licensed under the MIT license.
        
        The plugin assumes that each series has a single data value, and that each
        value is a positive integer or zero.  Negative numbers don't make sense for a
        pie chart, and have unpredictable results.  The values do NOT need to be
        passed in as percentages; the plugin will calculate the total and per-slice
        percentages internally.
        
        * Created by Brian Medendorp
        
        * Updated with contributions from btburnett3, Anthony Aragues and Xavi Ivars
        
        The plugin supports these options:
        
        	series: {
        		pie: {
        			show: true/false
        			radius: 0-1 for percentage of fullsize, or a specified pixel length, or 'auto'
        			innerRadius: 0-1 for percentage of fullsize or a specified pixel length, for creating a donut effect
        			startAngle: 0-2 factor of PI used for starting angle (in radians) i.e 3/2 starts at the top, 0 and 2 have the same result
        			tilt: 0-1 for percentage to tilt the pie, where 1 is no tilt, and 0 is completely flat (nothing will show)
        			offset: {
        				top: integer value to move the pie up or down
        				left: integer value to move the pie left or right, or 'auto'
        			},
        			stroke: {
        				color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#FFF')
        				width: integer pixel width of the stroke
        			},
        			label: {
        				show: true/false, or 'auto'
        				formatter:  a user-defined function that modifies the text/style of the label text
        				radius: 0-1 for percentage of fullsize, or a specified pixel length
        				background: {
        					color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#000')
        					opacity: 0-1
        				},
        				threshold: 0-1 for the percentage value at which to hide labels (if they're too small)
        			},
        			combine: {
        				threshold: 0-1 for the percentage value at which to combine slices (if they're too small)
        				color: any hexidecimal color value (other formats may or may not work, so best to stick with something like '#CCC'), if null, the plugin will automatically use the color of the first slice to be combined
        				label: any text value of what the combined slice should be labeled
        			}
        			highlight: {
        				opacity: 0-1
        			}
        		}
        	}
        
        More detail and specific examples can be found in the included HTML file.
        
        */
        
        (function($) {
        
        	// Maximum redraw attempts when fitting labels within the plot
        
        	var REDRAW_ATTEMPTS = 10;
        
        	// Factor by which to shrink the pie when fitting labels within the plot
        
        	var REDRAW_SHRINK = 0.95;
        
        	function init(plot) {
        
        		var canvas = null,
        			target = null,
        			options = null,
        			maxRadius = null,
        			centerLeft = null,
        			centerTop = null,
        			processed = false,
        			ctx = null;
        
        		// interactive variables
        
        		var highlights = [];
        
        		// add hook to determine if pie plugin in enabled, and then perform necessary operations
        
        		plot.hooks.processOptions.push(function(plot, options) {
        			if (options.series.pie.show) {
        
        				options.grid.show = false;
        
        				// set labels.show
        
        				if (options.series.pie.label.show == "auto") {
        					if (options.legend.show) {
        						options.series.pie.label.show = false;
        					} else {
        						options.series.pie.label.show = true;
        					}
        				}
        
        				// set radius
        
        				if (options.series.pie.radius == "auto") {
        					if (options.series.pie.label.show) {
        						options.series.pie.radius = 3/4;
        					} else {
        						options.series.pie.radius = 1;
        					}
        				}
        
        				// ensure sane tilt
        
        				if (options.series.pie.tilt > 1) {
        					options.series.pie.tilt = 1;
        				} else if (options.series.pie.tilt < 0) {
        					options.series.pie.tilt = 0;
        				}
        			}
        		});
        
        		plot.hooks.bindEvents.push(function(plot, eventHolder) {
        			var options = plot.getOptions();
        			if (options.series.pie.show) {
        				if (options.grid.hoverable) {
        					eventHolder.unbind("mousemove").mousemove(onMouseMove);
        				}
        				if (options.grid.clickable) {
        					eventHolder.unbind("click").click(onClick);
        				}
        			}
        		});
        
        		plot.hooks.processDatapoints.push(function(plot, series, data, datapoints) {
        			var options = plot.getOptions();
        			if (options.series.pie.show) {
        				processDatapoints(plot, series, data, datapoints);
        			}
        		});
        
        		plot.hooks.drawOverlay.push(function(plot, octx) {
        			var options = plot.getOptions();
        			if (options.series.pie.show) {
        				drawOverlay(plot, octx);
        			}
        		});
        
        		plot.hooks.draw.push(function(plot, newCtx) {
        			var options = plot.getOptions();
        			if (options.series.pie.show) {
        				draw(plot, newCtx);
        			}
        		});
        
        		function processDatapoints(plot, series, datapoints) {
        			if (!processed)	{
        				processed = true;
        				canvas = plot.getCanvas();
        				target = $(canvas).parent();
        				options = plot.getOptions();
        				plot.setData(combine(plot.getData()));
        			}
        		}
        
        		function combine(data) {
        
        			var total = 0,
        				combined = 0,
        				numCombined = 0,
        				color = options.series.pie.combine.color,
        				newdata = [];
        
        			// Fix up the raw data from Flot, ensuring the data is numeric
        
        			for (var i = 0; i < data.length; ++i) {
        
        				var value = data[i].data;
        
        				// If the data is an array, we'll assume that it's a standard
        				// Flot x-y pair, and are concerned only with the second value.
        
        				// Note how we use the original array, rather than creating a
        				// new one; this is more efficient and preserves any extra data
        				// that the user may have stored in higher indexes.
        
        				if ($.isArray(value) && value.length == 1) {
            				value = value[0];
        				}
        
        				if ($.isArray(value)) {
        					// Equivalent to $.isNumeric() but compatible with jQuery < 1.7
        					if (!isNaN(parseFloat(value[1])) && isFinite(value[1])) {
        						value[1] = +value[1];
        					} else {
        						value[1] = 0;
        					}
        				} else if (!isNaN(parseFloat(value)) && isFinite(value)) {
        					value = [1, +value];
        				} else {
        					value = [1, 0];
        				}
        
        				data[i].data = [value];
        			}
        
        			// Sum up all the slices, so we can calculate percentages for each
        
        			for (var i = 0; i < data.length; ++i) {
        				total += data[i].data[0][1];
        			}
        
        			// Count the number of slices with percentages below the combine
        			// threshold; if it turns out to be just one, we won't combine.
        
        			for (var i = 0; i < data.length; ++i) {
        				var value = data[i].data[0][1];
        				if (value / total <= options.series.pie.combine.threshold) {
        					combined += value;
        					numCombined++;
        					if (!color) {
        						color = data[i].color;
        					}
        				}
        			}
        
        			for (var i = 0; i < data.length; ++i) {
        				var value = data[i].data[0][1];
        				if (numCombined < 2 || value / total > options.series.pie.combine.threshold) {
        					newdata.push(
        						$.extend(data[i], {     /* extend to allow keeping all other original data values
        						                           and using them e.g. in labelFormatter. */
        							data: [[1, value]],
        							color: data[i].color,
        							label: data[i].label,
        							angle: value * Math.PI * 2 / total,
        							percent: value / (total / 100)
        						})
        					);
        				}
        			}
        
        			if (numCombined > 1) {
        				newdata.push({
        					data: [[1, combined]],
        					color: color,
        					label: options.series.pie.combine.label,
        					angle: combined * Math.PI * 2 / total,
        					percent: combined / (total / 100)
        				});
        			}
        
        			return newdata;
        		}
        
        		function draw(plot, newCtx) {
        
        			if (!target) {
        				return; // if no series were passed
        			}
        
        			var canvasWidth = plot.getPlaceholder().width(),
        				canvasHeight = plot.getPlaceholder().height(),
        				legendWidth = target.children().filter(".legend").children().width() || 0;
        
        			ctx = newCtx;
        
        			// WARNING: HACK! REWRITE THIS CODE AS SOON AS POSSIBLE!
        
        			// When combining smaller slices into an 'other' slice, we need to
        			// add a new series.  Since Flot gives plugins no way to modify the
        			// list of series, the pie plugin uses a hack where the first call
        			// to processDatapoints results in a call to setData with the new
        			// list of series, then subsequent processDatapoints do nothing.
        
        			// The plugin-global 'processed' flag is used to control this hack;
        			// it starts out false, and is set to true after the first call to
        			// processDatapoints.
        
        			// Unfortunately this turns future setData calls into no-ops; they
        			// call processDatapoints, the flag is true, and nothing happens.
        
        			// To fix this we'll set the flag back to false here in draw, when
        			// all series have been processed, so the next sequence of calls to
        			// processDatapoints once again starts out with a slice-combine.
        			// This is really a hack; in 0.9 we need to give plugins a proper
        			// way to modify series before any processing begins.
        
        			processed = false;
        
        			// calculate maximum radius and center point
        
        			maxRadius =  Math.min(canvasWidth, canvasHeight / options.series.pie.tilt) / 2;
        			centerTop = canvasHeight / 2 + options.series.pie.offset.top;
        			centerLeft = canvasWidth / 2;
        
        			if (options.series.pie.offset.left == "auto") {
        				if (options.legend.position.match("w")) {
        					centerLeft += legendWidth / 2;
        				} else {
        					centerLeft -= legendWidth / 2;
        				}
        				if (centerLeft < maxRadius) {
        					centerLeft = maxRadius;
        				} else if (centerLeft > canvasWidth - maxRadius) {
        					centerLeft = canvasWidth - maxRadius;
        				}
        			} else {
        				centerLeft += options.series.pie.offset.left;
        			}
        
        			var slices = plot.getData(),
        				attempts = 0;
        
        			// Keep shrinking the pie's radius until drawPie returns true,
        			// indicating that all the labels fit, or we try too many times.
        
        			do {
        				if (attempts > 0) {
        					maxRadius *= REDRAW_SHRINK;
        				}
        				attempts += 1;
        				clear();
        				if (options.series.pie.tilt <= 0.8) {
        					drawShadow();
        				}
        			} while (!drawPie() && attempts < REDRAW_ATTEMPTS)
        
        			if (attempts >= REDRAW_ATTEMPTS) {
        				clear();
        				target.prepend("<div class='error'>Could not draw pie with labels contained inside canvas</div>");
        			}
        
        			if (plot.setSeries && plot.insertLegend) {
        				plot.setSeries(slices);
        				plot.insertLegend();
        			}
        
        			// we're actually done at this point, just defining internal functions at this point
        
        			function clear() {
        				ctx.clearRect(0, 0, canvasWidth, canvasHeight);
        				target.children().filter(".pieLabel, .pieLabelBackground").remove();
        			}
        
        			function drawShadow() {
        
        				var shadowLeft = options.series.pie.shadow.left;
        				var shadowTop = options.series.pie.shadow.top;
        				var edge = 10;
        				var alpha = options.series.pie.shadow.alpha;
        				var radius = options.series.pie.radius > 1 ? options.series.pie.radius : maxRadius * options.series.pie.radius;
        
        				if (radius >= canvasWidth / 2 - shadowLeft || radius * options.series.pie.tilt >= canvasHeight / 2 - shadowTop || radius <= edge) {
        					return;	// shadow would be outside canvas, so don't draw it
        				}
        
        				ctx.save();
        				ctx.translate(shadowLeft,shadowTop);
        				ctx.globalAlpha = alpha;
        				ctx.fillStyle = "#000";
        
        				// center and rotate to starting position
        
        				ctx.translate(centerLeft,centerTop);
        				ctx.scale(1, options.series.pie.tilt);
        
        				//radius -= edge;
        
        				for (var i = 1; i <= edge; i++) {
        					ctx.beginPath();
        					ctx.arc(0, 0, radius, 0, Math.PI * 2, false);
        					ctx.fill();
        					radius -= i;
        				}
        
        				ctx.restore();
        			}
        
        			function drawPie() {
        
        				var startAngle = Math.PI * options.series.pie.startAngle;
        				var radius = options.series.pie.radius > 1 ? options.series.pie.radius : maxRadius * options.series.pie.radius;
        
        				// center and rotate to starting position
        
        				ctx.save();
        				ctx.translate(centerLeft,centerTop);
        				ctx.scale(1, options.series.pie.tilt);
        				//ctx.rotate(startAngle); // start at top; -- This doesn't work properly in Opera
        
        				// draw slices
        
        				ctx.save();
        				var currentAngle = startAngle;
        				for (var i = 0; i < slices.length; ++i) {
        					slices[i].startAngle = currentAngle;
        					drawSlice(slices[i].angle, slices[i].color, true);
        				}
        				ctx.restore();
        
        				// draw slice outlines
        
        				if (options.series.pie.stroke.width > 0) {
        					ctx.save();
        					ctx.lineWidth = options.series.pie.stroke.width;
        					currentAngle = startAngle;
        					for (var i = 0; i < slices.length; ++i) {
        						drawSlice(slices[i].angle, options.series.pie.stroke.color, false);
        					}
        					ctx.restore();
        				}
        
        				// draw donut hole
        
        				drawDonutHole(ctx);
        
        				ctx.restore();
        
        				// Draw the labels, returning true if they fit within the plot
        
        				if (options.series.pie.label.show) {
        					return drawLabels();
        				} else return true;
        
        				function drawSlice(angle, color, fill) {
        
        					if (angle <= 0 || isNaN(angle)) {
        						return;
        					}
        
        					if (fill) {
        						ctx.fillStyle = color;
        					} else {
        						ctx.strokeStyle = color;
        						ctx.lineJoin = "round";
        					}
        
        					ctx.beginPath();
        					if (Math.abs(angle - Math.PI * 2) > 0.000000001) {
        						ctx.moveTo(0, 0); // Center of the pie
        					}
        
        					//ctx.arc(0, 0, radius, 0, angle, false); // This doesn't work properly in Opera
        					ctx.arc(0, 0, radius,currentAngle, currentAngle + angle / 2, false);
        					ctx.arc(0, 0, radius,currentAngle + angle / 2, currentAngle + angle, false);
        					ctx.closePath();
        					//ctx.rotate(angle); // This doesn't work properly in Opera
        					currentAngle += angle;
        
        					if (fill) {
        						ctx.fill();
        					} else {
        						ctx.stroke();
        					}
        				}
        
        				function drawLabels() {
        
        					var currentAngle = startAngle;
        					var radius = options.series.pie.label.radius > 1 ? options.series.pie.label.radius : maxRadius * options.series.pie.label.radius;
        
        					for (var i = 0; i < slices.length; ++i) {
        						if (slices[i].percent >= options.series.pie.label.threshold * 100) {
        							if (!drawLabel(slices[i], currentAngle, i)) {
        								return false;
        							}
        						}
        						currentAngle += slices[i].angle;
        					}
        
        					return true;
        
        					function drawLabel(slice, startAngle, index) {
        
        						if (slice.data[0][1] == 0) {
        							return true;
        						}
        
        						// format label text
        
        						var lf = options.legend.labelFormatter, text, plf = options.series.pie.label.formatter;
        
        						if (lf) {
        							text = lf(slice.label, slice);
        						} else {
        							text = slice.label;
        						}
        
        						if (plf) {
        							text = plf(text, slice);
        						}
        
        						var halfAngle = ((startAngle + slice.angle) + startAngle) / 2;
        						var x = centerLeft + Math.round(Math.cos(halfAngle) * radius);
        						var y = centerTop + Math.round(Math.sin(halfAngle) * radius) * options.series.pie.tilt;
        
        						var html = "<span class='pieLabel' id='pieLabel" + index + "' style='position:absolute;top:" + y + "px;left:" + x + "px;'>" + text + "</span>";
        						target.append(html);
        
        						var label = target.children("#pieLabel" + index);
        						var labelTop = (y - label.height() / 2);
        						var labelLeft = (x - label.width() / 2);
        
        						label.css("top", labelTop);
        						label.css("left", labelLeft);
        
        						// check to make sure that the label is not outside the canvas
        
        						if (0 - labelTop > 0 || 0 - labelLeft > 0 || canvasHeight - (labelTop + label.height()) < 0 || canvasWidth - (labelLeft + label.width()) < 0) {
        							return false;
        						}
        
        						if (options.series.pie.label.background.opacity != 0) {
        
        							// put in the transparent background separately to avoid blended labels and label boxes
        
        							var c = options.series.pie.label.background.color;
        
        							if (c == null) {
        								c = slice.color;
        							}
        
        							var pos = "top:" + labelTop + "px;left:" + labelLeft + "px;";
        							$("<div class='pieLabelBackground' style='position:absolute;width:" + label.width() + "px;height:" + label.height() + "px;" + pos + "background-color:" + c + ";'></div>")
        								.css("opacity", options.series.pie.label.background.opacity)
        								.insertBefore(label);
        						}
        
        						return true;
        					} // end individual label function
        				} // end drawLabels function
        			} // end drawPie function
        		} // end draw function
        
        		// Placed here because it needs to be accessed from multiple locations
        
        		function drawDonutHole(layer) {
        			if (options.series.pie.innerRadius > 0) {
        
        				// subtract the center
        
        				layer.save();
        				var innerRadius = options.series.pie.innerRadius > 1 ? options.series.pie.innerRadius : maxRadius * options.series.pie.innerRadius;
        				layer.globalCompositeOperation = "destination-out"; // this does not work with excanvas, but it will fall back to using the stroke color
        				layer.beginPath();
        				layer.fillStyle = options.series.pie.stroke.color;
        				layer.arc(0, 0, innerRadius, 0, Math.PI * 2, false);
        				layer.fill();
        				layer.closePath();
        				layer.restore();
        
        				// add inner stroke
        
        				layer.save();
        				layer.beginPath();
        				layer.strokeStyle = options.series.pie.stroke.color;
        				layer.arc(0, 0, innerRadius, 0, Math.PI * 2, false);
        				layer.stroke();
        				layer.closePath();
        				layer.restore();
        
        				// TODO: add extra shadow inside hole (with a mask) if the pie is tilted.
        			}
        		}
        
        		//-- Additional Interactive related functions --
        
        		function isPointInPoly(poly, pt) {
        			for(var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
        				((poly[i][1] <= pt[1] && pt[1] < poly[j][1]) || (poly[j][1] <= pt[1] && pt[1]< poly[i][1]))
        				&& (pt[0] < (poly[j][0] - poly[i][0]) * (pt[1] - poly[i][1]) / (poly[j][1] - poly[i][1]) + poly[i][0])
        				&& (c = !c);
        			return c;
        		}
        
        		function findNearbySlice(mouseX, mouseY) {
        
        			var slices = plot.getData(),
        				options = plot.getOptions(),
        				radius = options.series.pie.radius > 1 ? options.series.pie.radius : maxRadius * options.series.pie.radius,
        				x, y;
        
        			for (var i = 0; i < slices.length; ++i) {
        
        				var s = slices[i];
        
        				if (s.pie.show) {
        
        					ctx.save();
        					ctx.beginPath();
        					ctx.moveTo(0, 0); // Center of the pie
        					//ctx.scale(1, options.series.pie.tilt);	// this actually seems to break everything when here.
        					ctx.arc(0, 0, radius, s.startAngle, s.startAngle + s.angle / 2, false);
        					ctx.arc(0, 0, radius, s.startAngle + s.angle / 2, s.startAngle + s.angle, false);
        					ctx.closePath();
        					x = mouseX - centerLeft;
        					y = mouseY - centerTop;
        
        					if (ctx.isPointInPath) {
        						if (ctx.isPointInPath(mouseX - centerLeft, mouseY - centerTop)) {
        							ctx.restore();
        							return {
        								datapoint: [s.percent, s.data],
        								dataIndex: 0,
        								series: s,
        								seriesIndex: i
        							};
        						}
        					} else {
        
        						// excanvas for IE doesn;t support isPointInPath, this is a workaround.
        
        						var p1X = radius * Math.cos(s.startAngle),
        							p1Y = radius * Math.sin(s.startAngle),
        							p2X = radius * Math.cos(s.startAngle + s.angle / 4),
        							p2Y = radius * Math.sin(s.startAngle + s.angle / 4),
        							p3X = radius * Math.cos(s.startAngle + s.angle / 2),
        							p3Y = radius * Math.sin(s.startAngle + s.angle / 2),
        							p4X = radius * Math.cos(s.startAngle + s.angle / 1.5),
        							p4Y = radius * Math.sin(s.startAngle + s.angle / 1.5),
        							p5X = radius * Math.cos(s.startAngle + s.angle),
        							p5Y = radius * Math.sin(s.startAngle + s.angle),
        							arrPoly = [[0, 0], [p1X, p1Y], [p2X, p2Y], [p3X, p3Y], [p4X, p4Y], [p5X, p5Y]],
        							arrPoint = [x, y];
        
        						// TODO: perhaps do some mathmatical trickery here with the Y-coordinate to compensate for pie tilt?
        
        						if (isPointInPoly(arrPoly, arrPoint)) {
        							ctx.restore();
        							return {
        								datapoint: [s.percent, s.data],
        								dataIndex: 0,
        								series: s,
        								seriesIndex: i
        							};
        						}
        					}
        
        					ctx.restore();
        				}
        			}
        
        			return null;
        		}
        
        		function onMouseMove(e) {
        			triggerClickHoverEvent("plothover", e);
        		}
        
        		function onClick(e) {
        			triggerClickHoverEvent("plotclick", e);
        		}
        
        		// trigger click or hover event (they send the same parameters so we share their code)
        
        		function triggerClickHoverEvent(eventname, e) {
        
        			var offset = plot.offset();
        			var canvasX = parseInt(e.pageX - offset.left);
        			var canvasY =  parseInt(e.pageY - offset.top);
        			var item = findNearbySlice(canvasX, canvasY);
        
        			if (options.grid.autoHighlight) {
        
        				// clear auto-highlights
        
        				for (var i = 0; i < highlights.length; ++i) {
        					var h = highlights[i];
        					if (h.auto == eventname && !(item && h.series == item.series)) {
        						unhighlight(h.series);
        					}
        				}
        			}
        
        			// highlight the slice
        
        			if (item) {
        				highlight(item.series, eventname);
        			}
        
        			// trigger any hover bind events
        
        			var pos = { pageX: e.pageX, pageY: e.pageY };
        			target.trigger(eventname, [pos, item]);
        		}
        
        		function highlight(s, auto) {
        			//if (typeof s == "number") {
        			//	s = series[s];
        			//}
        
        			var i = indexOfHighlight(s);
        
        			if (i == -1) {
        				highlights.push({ series: s, auto: auto });
        				plot.triggerRedrawOverlay();
        			} else if (!auto) {
        				highlights[i].auto = false;
        			}
        		}
        
        		function unhighlight(s) {
        			if (s == null) {
        				highlights = [];
        				plot.triggerRedrawOverlay();
        			}
        
        			//if (typeof s == "number") {
        			//	s = series[s];
        			//}
        
        			var i = indexOfHighlight(s);
        
        			if (i != -1) {
        				highlights.splice(i, 1);
        				plot.triggerRedrawOverlay();
        			}
        		}
        
        		function indexOfHighlight(s) {
        			for (var i = 0; i < highlights.length; ++i) {
        				var h = highlights[i];
        				if (h.series == s)
        					return i;
        			}
        			return -1;
        		}
        
        		function drawOverlay(plot, octx) {
        
        			var options = plot.getOptions();
        
        			var radius = options.series.pie.radius > 1 ? options.series.pie.radius : maxRadius * options.series.pie.radius;
        
        			octx.save();
        			octx.translate(centerLeft, centerTop);
        			octx.scale(1, options.series.pie.tilt);
        
        			for (var i = 0; i < highlights.length; ++i) {
        				drawHighlight(highlights[i].series);
        			}
        
        			drawDonutHole(octx);
        
        			octx.restore();
        
        			function drawHighlight(series) {
        
        				if (series.angle <= 0 || isNaN(series.angle)) {
        					return;
        				}
        
        				//octx.fillStyle = parseColor(options.series.pie.highlight.color).scale(null, null, null, options.series.pie.highlight.opacity).toString();
        				octx.fillStyle = "rgba(255, 255, 255, " + options.series.pie.highlight.opacity + ")"; // this is temporary until we have access to parseColor
        				octx.beginPath();
        				if (Math.abs(series.angle - Math.PI * 2) > 0.000000001) {
        					octx.moveTo(0, 0); // Center of the pie
        				}
        				octx.arc(0, 0, radius, series.startAngle, series.startAngle + series.angle / 2, false);
        				octx.arc(0, 0, radius, series.startAngle + series.angle / 2, series.startAngle + series.angle, false);
        				octx.closePath();
        				octx.fill();
        			}
        		}
        	} // end init (plugin body)
        
        	// define pie specific options and their default values
        
        	var options = {
        		series: {
        			pie: {
        				show: false,
        				radius: "auto",	// actual radius of the visible pie (based on full calculated radius if <=1, or hard pixel value)
        				innerRadius: 0, /* for donut */
        				startAngle: 3/2,
        				tilt: 1,
        				shadow: {
        					left: 5,	// shadow left offset
        					top: 15,	// shadow top offset
        					alpha: 0.02	// shadow alpha
        				},
        				offset: {
        					top: 0,
        					left: "auto"
        				},
        				stroke: {
        					color: "#fff",
        					width: 1
        				},
        				label: {
        					show: "auto",
        					formatter: function(label, slice) {
        						return "<div style='font-size:x-small;text-align:center;padding:2px;color:" + slice.color + ";'>" + label + "<br/>" + Math.round(slice.percent) + "%</div>";
        					},	// formatter function
        					radius: 1,	// radius at which to place the labels (based on full calculated radius if <=1, or hard pixel value)
        					background: {
        						color: null,
        						opacity: 0
        					},
        					threshold: 0	// percentage at which to hide the label (i.e. the slice is too narrow)
        				},
        				combine: {
        					threshold: -1,	// percentage at which to combine little slices into one larger slice
        					color: null,	// color to give the new slice (auto-generated if null)
        					label: "Other"	// label to give the new slice
        				},
        				highlight: {
        					//color: "#fff",		// will add this functionality once parseColor is available
        					opacity: 0.5
        				}
        			}
        		}
        	};
        
        	$.plot.plugins.push({
        		init: init,
        		options: options,
        		name: "pie",
        		version: "1.1"
        	});
        
        })(jQuery);
        
        ;
        
        // source: plugin/printhistory/js/jquery.flot.time.js
        /* Pretty handling of time axes.
        
        Copyright (c) 2007-2014 IOLA and Ole Laursen.
        Licensed under the MIT license.
        
        Set axis.mode to "time" to enable. See the section "Time series data" in
        API.txt for details.
        
        */
        
        (function($) {
        
        	var options = {
        		xaxis: {
        			timezone: null,		// "browser" for local to the client or timezone for timezone-js
        			timeformat: null,	// format string to use
        			twelveHourClock: false,	// 12 or 24 time in time mode
        			monthNames: null	// list of names of months
        		}
        	};
        
        	// round to nearby lower multiple of base
        
        	function floorInBase(n, base) {
        		return base * Math.floor(n / base);
        	}
        
        	// Returns a string with the date d formatted according to fmt.
        	// A subset of the Open Group's strftime format is supported.
        
        	function formatDate(d, fmt, monthNames, dayNames) {
        
        		if (typeof d.strftime == "function") {
        			return d.strftime(fmt);
        		}
        
        		var leftPad = function(n, pad) {
        			n = "" + n;
        			pad = "" + (pad == null ? "0" : pad);
        			return n.length == 1 ? pad + n : n;
        		};
        
        		var r = [];
        		var escape = false;
        		var hours = d.getHours();
        		var isAM = hours < 12;
        
        		if (monthNames == null) {
        			monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        		}
        
        		if (dayNames == null) {
        			dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        		}
        
        		var hours12;
        
        		if (hours > 12) {
        			hours12 = hours - 12;
        		} else if (hours == 0) {
        			hours12 = 12;
        		} else {
        			hours12 = hours;
        		}
        
        		for (var i = 0; i < fmt.length; ++i) {
        
        			var c = fmt.charAt(i);
        
        			if (escape) {
        				switch (c) {
        					case 'a': c = "" + dayNames[d.getDay()]; break;
        					case 'b': c = "" + monthNames[d.getMonth()]; break;
        					case 'd': c = leftPad(d.getDate()); break;
        					case 'e': c = leftPad(d.getDate(), " "); break;
        					case 'h':	// For back-compat with 0.7; remove in 1.0
        					case 'H': c = leftPad(hours); break;
        					case 'I': c = leftPad(hours12); break;
        					case 'l': c = leftPad(hours12, " "); break;
        					case 'm': c = leftPad(d.getMonth() + 1); break;
        					case 'M': c = leftPad(d.getMinutes()); break;
        					// quarters not in Open Group's strftime specification
        					case 'q':
        						c = "" + (Math.floor(d.getMonth() / 3) + 1); break;
        					case 'S': c = leftPad(d.getSeconds()); break;
        					case 'y': c = leftPad(d.getFullYear() % 100); break;
        					case 'Y': c = "" + d.getFullYear(); break;
        					case 'p': c = (isAM) ? ("" + "am") : ("" + "pm"); break;
        					case 'P': c = (isAM) ? ("" + "AM") : ("" + "PM"); break;
        					case 'w': c = "" + d.getDay(); break;
        				}
        				r.push(c);
        				escape = false;
        			} else {
        				if (c == "%") {
        					escape = true;
        				} else {
        					r.push(c);
        				}
        			}
        		}
        
        		return r.join("");
        	}
        
        	// To have a consistent view of time-based data independent of which time
        	// zone the client happens to be in we need a date-like object independent
        	// of time zones.  This is done through a wrapper that only calls the UTC
        	// versions of the accessor methods.
        
        	function makeUtcWrapper(d) {
        
        		function addProxyMethod(sourceObj, sourceMethod, targetObj, targetMethod) {
        			sourceObj[sourceMethod] = function() {
        				return targetObj[targetMethod].apply(targetObj, arguments);
        			};
        		};
        
        		var utc = {
        			date: d
        		};
        
        		// support strftime, if found
        
        		if (d.strftime != undefined) {
        			addProxyMethod(utc, "strftime", d, "strftime");
        		}
        
        		addProxyMethod(utc, "getTime", d, "getTime");
        		addProxyMethod(utc, "setTime", d, "setTime");
        
        		var props = ["Date", "Day", "FullYear", "Hours", "Milliseconds", "Minutes", "Month", "Seconds"];
        
        		for (var p = 0; p < props.length; p++) {
        			addProxyMethod(utc, "get" + props[p], d, "getUTC" + props[p]);
        			addProxyMethod(utc, "set" + props[p], d, "setUTC" + props[p]);
        		}
        
        		return utc;
        	};
        
        	// select time zone strategy.  This returns a date-like object tied to the
        	// desired timezone
        
        	function dateGenerator(ts, opts) {
        		if (opts.timezone == "browser") {
        			return new Date(ts);
        		} else if (!opts.timezone || opts.timezone == "utc") {
        			return makeUtcWrapper(new Date(ts));
        		} else if (typeof timezoneJS != "undefined" && typeof timezoneJS.Date != "undefined") {
        			var d = new timezoneJS.Date();
        			// timezone-js is fickle, so be sure to set the time zone before
        			// setting the time.
        			d.setTimezone(opts.timezone);
        			d.setTime(ts);
        			return d;
        		} else {
        			return makeUtcWrapper(new Date(ts));
        		}
        	}
        	
        	// map of app. size of time units in milliseconds
        
        	var timeUnitSize = {
        		"second": 1000,
        		"minute": 60 * 1000,
        		"hour": 60 * 60 * 1000,
        		"day": 24 * 60 * 60 * 1000,
        		"month": 30 * 24 * 60 * 60 * 1000,
        		"quarter": 3 * 30 * 24 * 60 * 60 * 1000,
        		"year": 365.2425 * 24 * 60 * 60 * 1000
        	};
        
        	// the allowed tick sizes, after 1 year we use
        	// an integer algorithm
        
        	var baseSpec = [
        		[1, "second"], [2, "second"], [5, "second"], [10, "second"],
        		[30, "second"], 
        		[1, "minute"], [2, "minute"], [5, "minute"], [10, "minute"],
        		[30, "minute"], 
        		[1, "hour"], [2, "hour"], [4, "hour"],
        		[8, "hour"], [12, "hour"],
        		[1, "day"], [2, "day"], [3, "day"],
        		[0.25, "month"], [0.5, "month"], [1, "month"],
        		[2, "month"]
        	];
        
        	// we don't know which variant(s) we'll need yet, but generating both is
        	// cheap
        
        	var specMonths = baseSpec.concat([[3, "month"], [6, "month"],
        		[1, "year"]]);
        	var specQuarters = baseSpec.concat([[1, "quarter"], [2, "quarter"],
        		[1, "year"]]);
        
        	function init(plot) {
        		plot.hooks.processOptions.push(function (plot, options) {
        			$.each(plot.getAxes(), function(axisName, axis) {
        
        				var opts = axis.options;
        
        				if (opts.mode == "time") {
        					axis.tickGenerator = function(axis) {
        
        						var ticks = [];
        						var d = dateGenerator(axis.min, opts);
        						var minSize = 0;
        
        						// make quarter use a possibility if quarters are
        						// mentioned in either of these options
        
        						var spec = (opts.tickSize && opts.tickSize[1] ===
        							"quarter") ||
        							(opts.minTickSize && opts.minTickSize[1] ===
        							"quarter") ? specQuarters : specMonths;
        
        						if (opts.minTickSize != null) {
        							if (typeof opts.tickSize == "number") {
        								minSize = opts.tickSize;
        							} else {
        								minSize = opts.minTickSize[0] * timeUnitSize[opts.minTickSize[1]];
        							}
        						}
        
        						for (var i = 0; i < spec.length - 1; ++i) {
        							if (axis.delta < (spec[i][0] * timeUnitSize[spec[i][1]]
        											  + spec[i + 1][0] * timeUnitSize[spec[i + 1][1]]) / 2
        								&& spec[i][0] * timeUnitSize[spec[i][1]] >= minSize) {
        								break;
        							}
        						}
        
        						var size = spec[i][0];
        						var unit = spec[i][1];
        
        						// special-case the possibility of several years
        
        						if (unit == "year") {
        
        							// if given a minTickSize in years, just use it,
        							// ensuring that it's an integer
        
        							if (opts.minTickSize != null && opts.minTickSize[1] == "year") {
        								size = Math.floor(opts.minTickSize[0]);
        							} else {
        
        								var magn = Math.pow(10, Math.floor(Math.log(axis.delta / timeUnitSize.year) / Math.LN10));
        								var norm = (axis.delta / timeUnitSize.year) / magn;
        
        								if (norm < 1.5) {
        									size = 1;
        								} else if (norm < 3) {
        									size = 2;
        								} else if (norm < 7.5) {
        									size = 5;
        								} else {
        									size = 10;
        								}
        
        								size *= magn;
        							}
        
        							// minimum size for years is 1
        
        							if (size < 1) {
        								size = 1;
        							}
        						}
        
        						axis.tickSize = opts.tickSize || [size, unit];
        						var tickSize = axis.tickSize[0];
        						unit = axis.tickSize[1];
        
        						var step = tickSize * timeUnitSize[unit];
        
        						if (unit == "second") {
        							d.setSeconds(floorInBase(d.getSeconds(), tickSize));
        						} else if (unit == "minute") {
        							d.setMinutes(floorInBase(d.getMinutes(), tickSize));
        						} else if (unit == "hour") {
        							d.setHours(floorInBase(d.getHours(), tickSize));
        						} else if (unit == "month") {
        							d.setMonth(floorInBase(d.getMonth(), tickSize));
        						} else if (unit == "quarter") {
        							d.setMonth(3 * floorInBase(d.getMonth() / 3,
        								tickSize));
        						} else if (unit == "year") {
        							d.setFullYear(floorInBase(d.getFullYear(), tickSize));
        						}
        
        						// reset smaller components
        
        						d.setMilliseconds(0);
        
        						if (step >= timeUnitSize.minute) {
        							d.setSeconds(0);
        						}
        						if (step >= timeUnitSize.hour) {
        							d.setMinutes(0);
        						}
        						if (step >= timeUnitSize.day) {
        							d.setHours(0);
        						}
        						if (step >= timeUnitSize.day * 4) {
        							d.setDate(1);
        						}
        						if (step >= timeUnitSize.month * 2) {
        							d.setMonth(floorInBase(d.getMonth(), 3));
        						}
        						if (step >= timeUnitSize.quarter * 2) {
        							d.setMonth(floorInBase(d.getMonth(), 6));
        						}
        						if (step >= timeUnitSize.year) {
        							d.setMonth(0);
        						}
        
        						var carry = 0;
        						var v = Number.NaN;
        						var prev;
        
        						do {
        
        							prev = v;
        							v = d.getTime();
        							ticks.push(v);
        
        							if (unit == "month" || unit == "quarter") {
        								if (tickSize < 1) {
        
        									// a bit complicated - we'll divide the
        									// month/quarter up but we need to take
        									// care of fractions so we don't end up in
        									// the middle of a day
        
        									d.setDate(1);
        									var start = d.getTime();
        									d.setMonth(d.getMonth() +
        										(unit == "quarter" ? 3 : 1));
        									var end = d.getTime();
        									d.setTime(v + carry * timeUnitSize.hour + (end - start) * tickSize);
        									carry = d.getHours();
        									d.setHours(0);
        								} else {
        									d.setMonth(d.getMonth() +
        										tickSize * (unit == "quarter" ? 3 : 1));
        								}
        							} else if (unit == "year") {
        								d.setFullYear(d.getFullYear() + tickSize);
        							} else {
        								d.setTime(v + step);
        							}
        						} while (v < axis.max && v != prev);
        
        						return ticks;
        					};
        
        					axis.tickFormatter = function (v, axis) {
        
        						var d = dateGenerator(v, axis.options);
        
        						// first check global format
        
        						if (opts.timeformat != null) {
        							return formatDate(d, opts.timeformat, opts.monthNames, opts.dayNames);
        						}
        
        						// possibly use quarters if quarters are mentioned in
        						// any of these places
        
        						var useQuarters = (axis.options.tickSize &&
        								axis.options.tickSize[1] == "quarter") ||
        							(axis.options.minTickSize &&
        								axis.options.minTickSize[1] == "quarter");
        
        						var t = axis.tickSize[0] * timeUnitSize[axis.tickSize[1]];
        						var span = axis.max - axis.min;
        						var suffix = (opts.twelveHourClock) ? " %p" : "";
        						var hourCode = (opts.twelveHourClock) ? "%I" : "%H";
        						var fmt;
        
        						if (t < timeUnitSize.minute) {
        							fmt = hourCode + ":%M:%S" + suffix;
        						} else if (t < timeUnitSize.day) {
        							if (span < 2 * timeUnitSize.day) {
        								fmt = hourCode + ":%M" + suffix;
        							} else {
        								fmt = "%b %d " + hourCode + ":%M" + suffix;
        							}
        						} else if (t < timeUnitSize.month) {
        							fmt = "%b %d";
        						} else if ((useQuarters && t < timeUnitSize.quarter) ||
        							(!useQuarters && t < timeUnitSize.year)) {
        							if (span < timeUnitSize.year) {
        								fmt = "%b";
        							} else {
        								fmt = "%b %Y";
        							}
        						} else if (useQuarters && t < timeUnitSize.year) {
        							if (span < timeUnitSize.year) {
        								fmt = "Q%q";
        							} else {
        								fmt = "Q%q %Y";
        							}
        						} else {
        							fmt = "%Y";
        						}
        
        						var rt = formatDate(d, fmt, opts.monthNames, opts.dayNames);
        
        						return rt;
        					};
        				}
        			});
        		});
        	}
        
        	$.plot.plugins.push({
        		init: init,
        		options: options,
        		name: 'time',
        		version: '1.0'
        	});
        
        	// Time-axis support used to be in Flot core, which exposed the
        	// formatDate function on the plot object.  Various plugins depend
        	// on the function, so we need to re-expose it here.
        
        	$.plot.formatDate = formatDate;
        	$.plot.dateGenerator = dateGenerator;
        
        })(jQuery);
        
        ;
        
        // source: plugin/printhistory/js/jquery.flot.stack.js
        /* Flot plugin for stacking data sets rather than overlyaing them.
        
        Copyright (c) 2007-2014 IOLA and Ole Laursen.
        Licensed under the MIT license.
        
        The plugin assumes the data is sorted on x (or y if stacking horizontally).
        For line charts, it is assumed that if a line has an undefined gap (from a
        null point), then the line above it should have the same gap - insert zeros
        instead of "null" if you want another behaviour. This also holds for the start
        and end of the chart. Note that stacking a mix of positive and negative values
        in most instances doesn't make sense (so it looks weird).
        
        Two or more series are stacked when their "stack" attribute is set to the same
        key (which can be any number or string or just "true"). To specify the default
        stack, you can set the stack option like this:
        
        	series: {
        		stack: null/false, true, or a key (number/string)
        	}
        
        You can also specify it for a single series, like this:
        
        	$.plot( $("#placeholder"), [{
        		data: [ ... ],
        		stack: true
        	}])
        
        The stacking order is determined by the order of the data series in the array
        (later series end up on top of the previous).
        
        Internally, the plugin modifies the datapoints in each series, adding an
        offset to the y value. For line series, extra data points are inserted through
        interpolation. If there's a second y value, it's also adjusted (e.g for bar
        charts or filled areas).
        
        */
        
        (function ($) {
            var options = {
                series: { stack: null } // or number/string
            };
            
            function init(plot) {
                function findMatchingSeries(s, allseries) {
                    var res = null;
                    for (var i = 0; i < allseries.length; ++i) {
                        if (s == allseries[i])
                            break;
                        
                        if (allseries[i].stack == s.stack)
                            res = allseries[i];
                    }
                    
                    return res;
                }
                
                function stackData(plot, s, datapoints) {
                    if (s.stack == null || s.stack === false)
                        return;
        
                    var other = findMatchingSeries(s, plot.getData());
                    if (!other)
                        return;
        
                    var ps = datapoints.pointsize,
                        points = datapoints.points,
                        otherps = other.datapoints.pointsize,
                        otherpoints = other.datapoints.points,
                        newpoints = [],
                        px, py, intery, qx, qy, bottom,
                        withlines = s.lines.show,
                        horizontal = s.bars.horizontal,
                        withbottom = ps > 2 && (horizontal ? datapoints.format[2].x : datapoints.format[2].y),
                        withsteps = withlines && s.lines.steps,
                        fromgap = true,
                        keyOffset = horizontal ? 1 : 0,
                        accumulateOffset = horizontal ? 0 : 1,
                        i = 0, j = 0, l, m;
        
                    while (true) {
                        if (i >= points.length)
                            break;
        
                        l = newpoints.length;
        
                        if (points[i] == null) {
                            // copy gaps
                            for (m = 0; m < ps; ++m)
                                newpoints.push(points[i + m]);
                            i += ps;
                        }
                        else if (j >= otherpoints.length) {
                            // for lines, we can't use the rest of the points
                            if (!withlines) {
                                for (m = 0; m < ps; ++m)
                                    newpoints.push(points[i + m]);
                            }
                            i += ps;
                        }
                        else if (otherpoints[j] == null) {
                            // oops, got a gap
                            for (m = 0; m < ps; ++m)
                                newpoints.push(null);
                            fromgap = true;
                            j += otherps;
                        }
                        else {
                            // cases where we actually got two points
                            px = points[i + keyOffset];
                            py = points[i + accumulateOffset];
                            qx = otherpoints[j + keyOffset];
                            qy = otherpoints[j + accumulateOffset];
                            bottom = 0;
        
                            if (px == qx) {
                                for (m = 0; m < ps; ++m)
                                    newpoints.push(points[i + m]);
        
                                newpoints[l + accumulateOffset] += qy;
                                bottom = qy;
                                
                                i += ps;
                                j += otherps;
                            }
                            else if (px > qx) {
                                // we got past point below, might need to
                                // insert interpolated extra point
                                if (withlines && i > 0 && points[i - ps] != null) {
                                    intery = py + (points[i - ps + accumulateOffset] - py) * (qx - px) / (points[i - ps + keyOffset] - px);
                                    newpoints.push(qx);
                                    newpoints.push(intery + qy);
                                    for (m = 2; m < ps; ++m)
                                        newpoints.push(points[i + m]);
                                    bottom = qy; 
                                }
        
                                j += otherps;
                            }
                            else { // px < qx
                                if (fromgap && withlines) {
                                    // if we come from a gap, we just skip this point
                                    i += ps;
                                    continue;
                                }
                                    
                                for (m = 0; m < ps; ++m)
                                    newpoints.push(points[i + m]);
                                
                                // we might be able to interpolate a point below,
                                // this can give us a better y
                                if (withlines && j > 0 && otherpoints[j - otherps] != null)
                                    bottom = qy + (otherpoints[j - otherps + accumulateOffset] - qy) * (px - qx) / (otherpoints[j - otherps + keyOffset] - qx);
        
                                newpoints[l + accumulateOffset] += bottom;
                                
                                i += ps;
                            }
        
                            fromgap = false;
                            
                            if (l != newpoints.length && withbottom)
                                newpoints[l + 2] += bottom;
                        }
        
                        // maintain the line steps invariant
                        if (withsteps && l != newpoints.length && l > 0
                            && newpoints[l] != null
                            && newpoints[l] != newpoints[l - ps]
                            && newpoints[l + 1] != newpoints[l - ps + 1]) {
                            for (m = 0; m < ps; ++m)
                                newpoints[l + ps + m] = newpoints[l + m];
                            newpoints[l + 1] = newpoints[l - ps + 1];
                        }
                    }
        
                    datapoints.points = newpoints;
                }
                
                plot.hooks.processDatapoints.push(stackData);
            }
            
            $.plot.plugins.push({
                init: init,
                options: options,
                name: 'stack',
                version: '1.2'
            });
        })(jQuery);
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin printhistory:", (error.stack || error));
    }
})();

// JS assets for plugin telegram
(function () {
    try {
        // source: plugin/telegram/js/telegram.js
        /*
         * View model for OctoPrint-Telegram
         *
         * Author: Fabian Schlenz
         * License: AGPLv3
         */
        $(function() {
            function TelegramViewModel(parameters) {
                var self = this;
        
                // assign the injected parameters, e.g.:
                // self.loginStateViewModel = parameters[0];
                self.settings = parameters[0];
                //else
                 //   self.settings=self.settings;
                console.log(String(self.settings));
        
                // TODO: Implement your plugin's view model here.
                
                self.chatListHelper = new ItemListHelper(
                    "known_chats",
                    {
                        "title": function(a, b) {
                            if(a.title.toLocaleLowerCase() < b.title.toLocaleLowerCase()) return -1;
                            if(a.title.toLocaleLowerCase() > b.title.toLocaleLowerCase()) return 1;
                            return 0;
                        }
                    },
                    {},
                    "title",
                    [],
                    [],
                    999);
        
                self.cmdCnt = 1;
                self.msgCnt = 1;
                self.reloadPending = 0;
                self.reloadUsr = ko.observable(false);
                self.connection_state_str = ko.observable("Unknown");
                self.isloading = ko.observable(false);
                self.errored = ko.observable(false);
                self.token_state_str = ko.observable("Unknown");
            	self.editChatDialog = undefined;  
                self.varInfoDialog = undefined;      
                self.emoInfoDialog = undefined;
                self.mupInfoDialog = undefined;  
            	self.currChatID = "Unknown";
                self.currChatTitle = ko.observable("Unknown");
                self.bind_cmd = {}; 
                self.markupFrom = [];
                self.onBindLoad = false;
            
                self.requestData = function(ignore,update) {
        
                    ignore = typeof ignore !== 'undefined' ? ignore : false;
                    update = typeof update !== 'undefined' ? update : false;
        
                    if (update)
                        urlPath = "plugin/telegram?id="+self.currChatID+"&cmd="+$('#telegram-acccmd-chkbox-box').prop( "checked" )+"&note="+$('#telegram-notify-chkbox-box').prop( "checked" )+"&allow="+$('#telegram-user-allowed-chkbox-box').prop( "checked" );
                    else
                        urlPath = "plugin/telegram";
                    if(self.reloadUsr() || ignore){
                        self.isloading(true);
                        $.ajax({
                            url: API_BASEURL + urlPath,
                            type: "GET",
                            dataType: "json",
                            success: self.fromResponse
                        });
                        
                       if(!ignore) self.reloadPending = setTimeout(self.requestData,20000);
                    }
                    else
                        self.reloadPending = setTimeout(self.requestData,500);
                };
        
                self.requestBindings = function() {
                    self.isloading(true);
                    $.ajax({
                        url: API_BASEURL + "plugin/telegram?bindings=true",
                        type: "GET",
                        dataType: "json",
                        success: self.fromBindings
                    });      
                };
        
                self.fromBindings = function(response){
                    self.bind = {}
                    self.bind["commands"] = response.bind_cmd;
                    self.bind["notifications"] = response.bind_msg;
                    self.bind['no_setting'] = response.no_setting;
                    self.bind['bind_text'] = response.bind_text;
                    self.onBindLoad = true;
                    $("#telegram_msg_list").empty();
                    keys = self.bind["notifications"].sort();
                    for(var id in keys) {
                        bind_text = '';
                        if(keys[id] in self.bind['bind_text']){
                            bind_text = '<span class="muted"><br /><small>Also for:';
                            ks = self.bind['bind_text'][keys[id]].sort();
                            for (var k in ks)
                                bind_text += "<br>" + ks[k];
                            bind_text += "</small></span>";
                        }
                        img = "camera";
                        hideMup = "";
                        hideComb = "";
                        if(self.settings.settings.plugins.telegram.messages[keys[id]].image()){
                            img = "camera";
                            btn = "success";
                            txt = "Send Image";
                            hideMup = "display:none";
                            hideComb = "";
                        }
                        else{
                            img = "ban-circle";
                            btn = "warning";
                            txt = "No Image";
                            hideMup = "";
                            hideComb = "display:none"
                        }
                        if(self.settings.settings.plugins.telegram.messages[keys[id]].gif()){
                            imgGif = "camera";
                            bGif = "success";
                            txtGif = "Send Gif";
                            hideMup = "";
                            hideComb = "";
                        }
                        else{
                            imgGif = "ban-circle";
                            bGif = "warning";
                            txtGif = "No Gif";
                            hideMup = "";
                            hideComb = ""
                        }
                        // TODO set to second message setting
                        if(self.settings.settings.plugins.telegram.messages[keys[id]].combined()){
                            img2 = "comment";
                            btn2 = "danger";
                            txt2 = "Combined";
                            if(hideComb === "")
                                hideMup = "display:none";
                        }
                        else{
                            img2 = "comments";
                            btn2 = "info";
                            txt2 = "Separated";
                            hideMup = "";
                        }
                        if(self.settings.settings.plugins.telegram.messages[keys[id]].markup()==="HTML"){
                            bOff = "info";
                            bHtml = "danger active";
                            bMd = "info";
                            self.markupFrom[self.msgCnt] = 'HTML';
                        }
                        else if(self.settings.settings.plugins.telegram.messages[keys[id]].markup()==="Markdown"){
                            bOff = "info";
                            bHtml = "info";
                            bMd = "danger active";
                            self.markupFrom[self.msgCnt] = 'Markdown';
                        }
                        else{
                            bOff = "danger active"
                            bHtml = "info"
                            bMd = "info"
                            self.markupFrom[self.msgCnt] = 'off';
                        }
                        var btnGrp = '<span id="mupBut'+self.msgCnt+'" style="' + hideMup + '"><span class="muted"><small>Markup Selection<br></small></span><span class="btn-group" data-toggle="buttons-radio">';
                        btnGrp += '<button id="off'+self.msgCnt+'" type="button" class="btn btn-'+bOff+' btn-mini" data-bind="click: toggleMarkup.bind($data,\''+self.msgCnt+'\',\'off\',\''+keys[id]+'\')">Off</button>';
                        btnGrp += '<button id="HTML'+self.msgCnt+'" type="button" class="btn btn-'+bHtml+' btn-mini" data-bind="click: toggleMarkup.bind($data,\''+self.msgCnt+'\',\'HTML\',\''+keys[id]+'\')">HTML</button>';
                        btnGrp += '<button id="Markdown'+self.msgCnt+'" type="button" class="btn btn-'+bMd+' btn-mini" data-bind="click: toggleMarkup.bind($data,\''+self.msgCnt+'\',\'Markdown\',\''+keys[id]+'\')">MD</button>';
                        btnGrp += '</span><br></span>';
        
                        var btnImg = '<span class="muted"><small>Send with image?<br></small></span>';
                        btnImg += '<label id="chkBtn'+self.msgCnt+'" class="btn btn-'+btn+' btn-mini" title="Toggle \'Send with image\'">';
                        btnImg += '<input type="checkbox" style="display:none" data-bind="checked: settings.settings.plugins.telegram.messages.'+keys[id]+'.image, click: toggleImg(\''+self.msgCnt+'\')"/>';
                        btnImg += '<i id="chkImg'+self.msgCnt+'" class="icon-'+img+'"></i> ';
                        btnImg += '<span id="chkTxt'+self.msgCnt+'">'+txt+'</span></label><br>';
        
                        var btnGif = '<span class="muted"><small>Send with gif?<br></small></span>';
                        btnGif += '<label id="chkGifBtn'+self.msgCnt+'" class="btn btn-'+bGif+' btn-mini" title="Toggle \'Send with gif\'">';
                        btnGif += '<input type="checkbox" style="display:none" data-bind="checked: settings.settings.plugins.telegram.messages.'+keys[id]+'.gif, click: toggleGif(\''+self.msgCnt+'\')"/>';
                        btnGif += '<i id="chkGif'+self.msgCnt+'" class="icon-'+imgGif+'"></i> ';
                        btnGif += '<span id="chkGifTxt'+self.msgCnt+'">'+txtGif+'</span></label><br>';
        
                        var btnSecMsg = '<span id="combBut'+self.msgCnt+'" style="' + hideComb + '"> <span class="muted"><small>Combined message?<br></small></span>';
                        btnSecMsg += '<label id="chk2Btn'+self.msgCnt+'" class="btn btn-'+btn2+' btn-mini" title="Toggle \'Send image in a second message\'">';
                        btnSecMsg += '<input type="checkbox" style="display:none" data-bind="checked: settings.settings.plugins.telegram.messages.'+keys[id]+'.combined, click: toggleImg2(\''+self.msgCnt+'\')"/>';
                        btnSecMsg += '<i id="chk2Img'+self.msgCnt+'" class="icon-'+img2+'"></i> ';
                        btnSecMsg += '<span id="chk2Txt'+self.msgCnt+'">'+txt2+'</span></label><br></span>';
        
                        var msgEdt = '<div class="control-group"><div class="controls " ><hr style="margin:0px 0px 0px -90px;"></div></div><div class="control-group" id="telegramMsgText'+self.msgCnt+'">';
                            msgEdt += '<label class="control-label"><strong>'+keys[id]+ '</strong>'+bind_text + '</label>';
                            msgEdt += '<div class="controls " >';
                                msgEdt += '<div class="row">';
                                    msgEdt += '<div class="span9"><textarea rows="4" style="margin-left:7px;" class="block" data-bind="value: settings.settings.plugins.telegram.messages.'+keys[id]+'.text"></textarea></div>';
                                    msgEdt += '<div class="span3" style="text-align:center;">' + btnImg + btnGif + btnSecMsg +  btnGrp + '</div>';
                                msgEdt += '</div></div></div>';
        
                        $('#telegram_msg_list').append(msgEdt);
                        ko.applyBindings(self, $("#telegramMsgText"+self.msgCnt++)[0]);
                    }
                    self.isloading(false);
                    $('#chkImg0').removeClass("icon-camera");
                    $('#chkImg0').removeClass("icon-ban-circle");
                    $('#chkGif0').removeClass("icon-camera");
                    $('#chkGif0').removeClass("icon-ban-circle");
                    $('#chkBtn0').removeClass("btn-success");
                    $('#chkBtn0').removeClass("btn-warning");
                    $('#chkTxt0').text("");
                    $('#chkGifBtn0').removeClass("btn-success");
                    $('#chkGifBtn0').removeClass("btn-warning");
                    $('#chkGifTxt0').text("");
                    if(self.settings.settings.plugins.telegram.image_not_connected()){
                        $('#chkImg0').addClass("icon-camera");
                        $('#chkBtn0').addClass("btn-success");
                        $('#chkTxt0').text("Send Image");
                    }
                    else{
                        $('#chkImg0').addClass("icon-ban-circle");
                        $('#chkBtn0').addClass("btn-warning");
                        $('#chkTxt0').text("No Image");
                    }
                    if(self.settings.settings.plugins.telegram.gif_not_connected()){
                        $('#chkGif0').addClass("icon-camera");
                        $('#chkGifBtn0').addClass("btn-success");
                        $('#chkGifTxt0').text("Send Gif");
                    }
                    else{
                        $('#chkGif0').addClass("icon-ban-circle");
                        $('#chkGifBtn0').addClass("btn-warning");
                        $('#chkGifTxt0').text("No Gif");
                    }
                    self.onBindLoad = false;
                }
        
        
                self.toggleMarkup = function(data,sender,msg){
                    if(!self.onBindLoad){
                        if(self.markupFrom[data] !== sender){
                            $('#'+sender+data).toggleClass("btn-info btn-danger");
                            $('#'+self.markupFrom[data]+data).toggleClass("btn-info btn-danger");
                            self.settings.settings.plugins.telegram.messages[msg].markup(sender);
                        }
                        self.markupFrom[data] = sender;
                    }
                }
        
        
                self.toggleImg = function(data){
                    if(!self.onBindLoad){
                        $('#chkImg'+data).toggleClass("icon-ban-circle icon-camera");
                        $('#chkBtn'+data).toggleClass("btn-success btn-warning");
                        if($('#chkTxt'+data).text()==="Send Image"){
                            $('#chkTxt'+data).text("No Image");
                            if(data !== "0"){
                                $('#mupBut'+data).show();
                                $('#combBut'+data).hide();
                            }
                        }
                        else{
                            $('#chkTxt'+data).text("Send Image");
                            if(data !== "0"){
                                if($('#chk2Txt'+data).text()==="Combined")
                                    $('#mupBut'+data).hide();    
                                else
                                    $('#mupBut'+data).show();   
                            
                                $('#combBut'+data).show();
                            }
                        }
                    }
                }
        
                self.toggleGif = function(data){
                    if(!self.onBindLoad){
                        $('#chkGif'+data).toggleClass("icon-ban-circle icon-camera");
                        $('#chkGifBtn'+data).toggleClass("btn-success btn-warning");
                        if($('#chkGifTxt'+data).text()==="Send Gif"){
                            $('#chkGifTxt'+data).text("No Gif");
                        }
                        else{
                            $('#chkGifTxt'+data).text("Send Gif");
                        }
                    }
                }
        
                self.toggleImg2 = function(data){
                    if(!self.onBindLoad){
                        $('#chk2Img'+data).toggleClass("icon-comment icon-comments");
                        $('#chk2Btn'+data).toggleClass("btn-info btn-danger");
                        if($('#chk2Txt'+data).text()==="Separated"){
                            $('#chk2Txt'+data).text("Combined"); 
                            $('#mupBut'+data).hide();   
                        }
                        else{
                            $('#chk2Txt'+data).text("Separated");  
                            $('#mupBut'+data).show();
                        }
                    }
                }
        
                self.updateChat = function(data) {
                    self.requestData(true,true);
                    self.editChatDialog.modal("hide");
                }
            
                self.testToken = function(data, event) {
                    self.isloading(true);
                    console.log("Testing token " + $('#settings_plugin_telegram_token').val());
                    $.ajax({
                        url: API_BASEURL + "plugin/telegram",
                        type: "POST",
                        dataType: "json",
                        data: JSON.stringify({ "command": "testToken", "token": $('#settings_plugin_telegram_token').val()}),
                        contentType: "application/json",
                        success: self.testResponse
                    });
                }
                
                self.testResponse = function(response) {
                    self.isloading(false);
                    self.token_state_str(response.connection_state_str);
                    self.errored(!response.ok);
                    if(!response.ok){
                        $('#teleErrored').addClass("text-error");
                        $('#teleErrored').removeClass("text-success");
                        $('#teleErrored2').addClass("text-error");
                        $('#teleErrored2').removeClass("text-success");
                    }
                    else{
                        $('#teleErrored').addClass("text-success");
                        $('#teleErrored').removeClass("text-error");
                        $('#teleErrored2').addClass("text-success");
                        $('#teleErrored2').removeClass("text-error");
                    }
        
                }
                
                self.fromResponse = function(response) {
                    if(response === undefined) return;
                    if(response.hasOwnProperty("connection_state_str"))
                        self.connection_state_str(response.connection_state_str);
                    if(response.hasOwnProperty("connection_ok"))
                        //self.errored(!response.connection_ok);
                    var entries = response.chats;
                    if (entries === undefined) return;
                    var array = [];
                    var formerChats = _.pluck(self.chatListHelper.allItems, 'id');
                    var currentChats = [];
                    var newChats = false;
                    for(var id in entries) {
                        var data = entries[id];
                        data['id'] = id;
                        data['image'] = data['image'];
                        if(data['new']) {
                            data['newUsr'] = true;
                        } else {
                            data['newUsr'] = false;
                        }
                        array.push(data);
                        currentChats.push(id);
                        newChats = newChats || !_.includes(formerChats, id);
                    }
        
                    var deletedChatIds = _.difference(formerChats, currentChats);
                    if (newChats || (deletedChatIds && deletedChatIds.length)) {
                        // Transfer the chats back to the server settings (because just hitting "save" on the Settings dialog
                        // won't transfer anything we haven't explicitely set).
        
                        // TODO: This whole workflow should be optimized!
                        // Currently it takes two full server/client round trips to get the chats in sync, and just reusing
                        // the plugin's API for that purpose would probably be way way more efficient and less error prone.
                        self.settings.saveData({plugins: {telegram: {chats: entries}}});
                    }
                    self.chatListHelper.updateItems(array);
                    self.isloading(false);
                };
        
        
        
                self.showEditChatDialog = function(data) {
                    if (data === undefined) return;
                    //ko.cleanNode($("#telegram-acccmd-chkbox-box")[0]);
                    $("#telegram-acccmd-chkbox").empty();
                    $('#telegram-acccmd-chkbox').append('<input id="telegram-acccmd-chkbox-box" type="checkbox" data-bind="checked: settings.settings.plugins.telegram.chats[\''+data['id']+'\'][\'accept_commands\']"> Allow to send commands <span class="help-block"><small id="telegram-groupNotify-hint"></small></span>');
                    ko.applyBindings(self, $("#telegram-acccmd-chkbox-box")[0]);
        
                    //ko.cleanNode($("#telegram-notify-chkbox-box")[0]);
                    $("#telegram-notify-chkbox").empty();
                    $('#telegram-notify-chkbox').append('<input id="telegram-notify-chkbox-box" type="checkbox" data-bind="checked: settings.settings.plugins.telegram.chats[\''+data['id']+'\'][\'send_notifications\']"> Send notifications<span class=\"help-block\"><small>After enabling this option, the enabled notifications will be received. You have to enable individual notifications by clicking the blue notify button in the list after closing this dialog.</small></span>');
                    ko.applyBindings(self, $("#telegram-notify-chkbox-box")[0]);
        
                    self.currChatTitle(data.title);
                    self.currChatID = data.id;
        
                    $('#telegram-groupNotify-hint').empty();
                    $('#telegram-user-allowed-chkbox').empty();
                    if(!data.private){
                        $('#telegram-groupNotify-hint').append("After enabling this option, EVERY user of this group is allowed to send enabled commands. You have to set permissions for individual commands by clicking the blue command icon in the list after closing this dialog. If 'Allow user commands' is enabled, these users still use their private settings in addition to the group settings.");
                        $('#telegram-user-allowed-chkbox').append("<div class=\"control-group\"><div class=\"controls\"><label class=\"checkbox\"><input id=\"telegram-user-allowed-chkbox-box\" type=\"checkbox\" data-bind=\"checked: settings.settings.plugins.telegram.chats['"+data['id']+"']['allow_users']\"> Allow user commands <span class=\"help-block\"><small>When this is enabled, users with command access are allowed to send their individual enabled commands from this group. No other user in this group is allowed to send commands.</small></span></label></div></div>");
                        ko.applyBindings(self, $("#telegram-user-allowed-chkbox-box")[0]);
                    }
                    else{
                        $('#telegram-groupNotify-hint').append("After enabling this option, you have to set permissions for individual commands by clicking the blue command icon in the list after closing this dialog.");
                        $('#telegram-user-allowed-chkbox').append("<input id=\"telegram-user-allowed-chkbox-box\" style=\"display:none\" type=\"checkbox\" data-bind=\"checked: settings.settings.plugins.telegram.chats['"+data['id']+"']['allow_users']\"> ");
                        ko.applyBindings(self, $("#telegram-user-allowed-chkbox-box")[0]);
                    }
                    
        	        self.editChatDialog.modal("show");
                }
        
                self.showEditCmdDialog = function(data,option) {
                    if (data === undefined) return;
                    self.currChatTitle("Edit " + option + ": " +data.title);
                    for(self.cmdCnt;self.cmdCnt>0;self.cmdCnt--)
                        $("#telegram-cmd-chkbox"+(self.cmdCnt-1)).remove();
                    keys = self.bind[option].sort();
                    for(var id in keys) {
                        if( self.bind['no_setting'].indexOf(keys[id]) < 0) {
                            $("#telegram-cmd-chkbox-grp").append('<span id="telegram-cmd-chkbox'+self.cmdCnt+'"><label class="checkbox"><input  type="checkbox" data-bind="checked: settings.settings.plugins.telegram.chats[\''+data['id']+'\'][\''+option+'\'][\''+keys[id]+'\']"> <span>'+keys[id]     +'</span><label></span>');
                            ko.applyBindings(self, $("#telegram-cmd-chkbox"+self.cmdCnt++)[0]);
                        }
                    }
                    $('#tele-edit-control-label').empty();
                    if (option == "commands")
                        $('#tele-edit-control-label').append("<strong>Allowed commands:</strong>");
                    else
                        $('#tele-edit-control-label').append("<strong>Get Notification at...</strong>")
                    self.editCmdDialog.modal("show");
                }
        
                self.delChat = function(data) {
                    if (data === undefined) return;
                    var callback = function() {
                            self.isloading(true);
                            data['command'] = "delChat";
                            data['ID'] = data.id
                            console.log("Delete Chat Data " + String(data['ID']));
                            $.ajax({
                                url: API_BASEURL + "plugin/telegram",
                                type: "POST",
                                dataType: "json",
                                data: JSON.stringify(data),
                                contentType: "application/json",
                                success: self.fromResponse
                            });
                        };
                    showConfirmationDialog('Do you really want to delete ' + data.title, function (e) {
                        callback();
                    });
          
                }
        
                self.onSettingsHidden = function() {
                    clearTimeout(self.reloadPending);
                }
        
                self.onSettingsShown = function() {
                    self.requestData(true,false);
                    self.requestData();
                    self.requestBindings();
                    self.testToken();
                    self.editChatDialog = $("#settings-telegramDialogEditChat");
                    self.editCmdDialog = $("#settings-telegramDialogEditCommands");
                    self.varInfoDialog = $('#settings-telegramDialogVarInfo');
                    self.emoInfoDialog = $('#settings-telegramDialogEmoInfo');
                    self.mupInfoDialog = $('#settings-telegramDialogMupInfo');
                    $('.teleEmojiImg').each( function(){
                        $(this).attr('src','/plugin/telegram/static/img/'+$(this).attr('id')+".png")
                    });
                    
                }
        
                self.onServerDisconnect = function(){
                    clearTimeout(self.reloadPending);
                }
        
                self.onDataUpdaterReconnect = function(){
                    if(self.reloadUsr())
                        self.requestData();
                    else
                        self.requestData(true,false);
                        self.requestData();
                    self.requestBindings();
                }
        
            }
        
            // view model class, parameters for constructor, container to bind to
            OCTOPRINT_VIEWMODELS.push([
                TelegramViewModel,
        
                // e.g. loginStateViewModel, settingsViewModel, ...
                [ "settingsViewModel" ],
        
                // e.g. #settings_plugin_telegram, #tab_plugin_telegram, ...
                [ '#settings_plugin_telegram','#wizard_plugin_telegram']
            ]);
        });
        
        ;
        
    } catch (error) {
        log.error("Error in JS assets for plugin telegram:", (error.stack || error));
    }
})();
