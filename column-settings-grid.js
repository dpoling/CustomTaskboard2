(function () {
    console.log('Inside Column Settings Grid Function');
    Ext.define('Rally.apps.kanban.columnSettngsComp', {
        extend: 'Ext.form.field.Base',
        alias: 'widget.kanbancolumnsettngscomp',
        fieldSubTpl: '<div id="{id}" class="settings-grid"></div>',
        width: 600,
        cls: 'column-settings',
        config: {
            value: undefined
        },

        onDestroy: function () {
            if (this._grid) {
                this._grid.destroy();
                delete this._grid;
            }
            this.callParent(arguments);
        },

        onRender: function () {
            console.log("inside onRender");
            this.callParent(arguments);

            var decodedValue = this.value;
            console.log('decodedValue= ', decodedValue);
            if (Ext.isString(decodedValue)) {
                decodedValue = Ext.JSON.decode(decodedValue);
            }
            this.columnDefs = decodedValue;

            this._store = Ext.create('Ext.data.Store', {
                fields: ['column', 'display', 'mapping'],
                data: []
            });
            this._buildGrid();
        },
        updateField: function (fieldRecord) {

            console.log('updateField', fieldRecord, this.columnDefs);
            fieldRecord.getAllowedValueStore().load({
                callback: function (records) {
                    var data = [];
                    Ext.Array.each(records, function (r) {
                        if (r.get('StringValue') && r.get('StringValue').length > 0) {
                            data.push(this._recordToGridRow(r, this.columnDefs));
                        }
                    }, this);
                    console.log('data is: ', data);
                    this._store.loadRawData(data);
                },
                scope: this
            });
        },
        _buildGrid: function () {
            console.log("inside buildGrid", this._store);
            if (this._grid) {
                this._grid.destroy();
            }
            this._grid = Ext.create('Rally.ui.grid.Grid', {
                width: 600,
                renderTo: this.inputEl,
                showPagingToolbar: false,
                showRowActionsColumn: false,
                enableRanking: false,
                columnCfgs: this._getColumnCfgs(),
                minHeight: 122,
                maxHeight: 132,
                scroll: true,
                store: this._store
            });
        },
        _getColumnCfgs: function () {
            var ynStore = Ext.create('Rally.data.custom.Store', {
                fields: ['name', 'value'],
                data: [
                    {name: "No", value: false},
                    {name: "Yes", value: true}
                ]
            });
            var columns = [
                {
                    text: 'Column',
                    dataIndex: 'column',
                    emptyCellText: '- None -',
                    flex: 2
                },
                {
                    text: 'Display',
                    dataIndex: 'display',
                    width: 75,
                    xtype: 'templatecolumn',
                    tpl: Ext.create('Rally.ui.renderer.template.BooleanTemplate', {
                        fieldName: 'display'
                    }),
                    editor: {
                        xtype: 'rallycombobox',
                        store: ynStore,
                        displayField: 'name',
                        valueField: 'value'
                    }
                },
                {
                    text: 'Task State Mapping',
                    dataIndex: 'mapping',
                    //emptyCellText: '--No Mapping--',
                    flex: 2,
                    editor: {
                        xtype: 'rallyfieldvaluecombobox',
                        model: Ext.identityFn('Task'),
                        field: 'State',
                        listeners: {
                            ready: function (combo) {
                                var noMapping = {};
                                noMapping[combo.displayField] = '--No Mapping--';
                                noMapping[combo.valueField] = '';
                                combo.store.insert(0, [noMapping]);
                                combo.setValue(null);
                            }
                        }
                    },
                    renderer: function (v) {
                        console.log('renderer', v);
                        return v;
                    }
                }
            ];
            console.log("inside getColumnCfgs", columns);
            return columns;
        },
        _recordToGridRow: function (allowedValue, columnDefs) {
            var columnName = allowedValue.get('StringValue');
            //Look to see if the grid has data in it (_store is the grid's data stor)
            //If the store is empty, pref will be null, else pref will have the last set of column defs
            var pref = this._store.getCount() === 0 ? columnDefs : null;
            var row = null;
            console.log('recordToGridRow ', columnName, this._store.getCount());
            console.log('columnDefs: ', columnDefs, Ext.isArray(columnDefs));
            console.log("Pref: ", pref);
            // look for the same row in the pref's
            if (pref) {
                row = _.find(pref, function (row) {
                    return row.column === columnName;
                });
                console.log('Row is: ', row);
            }
            // if the row isn't found in the prefs, create a default row
            if (!row) {
                row = {
                    column: columnName,
                    display: true,
                    mapping: ''
                };
            }
            return row;
        },
        getSubmitData: function () {
            var data = {};
            data[this.name] = Ext.JSON.encode(this._getData());
            console.log('data', data);
            return data;
        },
        _getData: function () {
            var setting = [];
            this._store.each(function (record) {
                var row = {};
                row['column'] = record.get('column');
                row['display'] = record.get('display');
                row['mapping'] = record.get('mapping');
                setting.push(row);
            });
            return setting;
        },
        getErrors: function () {
            var errors = [];
            if (this._store && !Ext.Object.getSize(this._getData())) {
                errors.push('At least one column must be shown.');
            }
            return errors;
        },
        setValue: function (value) {
            this.callParent(arguments);
            this._value = value;
        }
    });
})();