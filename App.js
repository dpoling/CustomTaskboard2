Ext.define('CustomApp', {
    extend: 'Rally.app.App',
    componentCls: 'app',
    config: {
        defaultSettings: {
            myQuery: '',
            groupByField: 'State',
            columnDefs: [
                {column: 'Defined', display: true, mapping: 'Defined'},
                {column: 'In-Progress', display: true, mapping: 'In-Progress'},
                {column: 'Completed', display: true, mapping: 'Completed'}
            ]
        }
    },
    launch: function () {
        console.log('settings', this.getSettings());
        this._addBoard();
    },
    _addBoard: function () {
        console.log('_addBoard');
        this.add({
            xtype: 'rallycardboard',
            types: ['Task'],
            attribute: 'State',
            context: this.getContext(),
            rowConfig: {
                field: 'WorkProduct'
            },
            storeConfig: {
                filters: this._getFilters()
            }
        });
        console.log('after adding the board');
    },
    _removeBoard: function () {
        var board = this.down('rallycardboard');
        if (board) {
            this.remove(board);
        }
    },
    _getFilters: function () {
        var tbScope = this.getContext().getTimeboxScope();
        var qFilter = this.getSetting('myQuery');
        if (tbScope) {
            var tbFilter = tbScope.getQueryFilter();
            if (qFilter && qFilter.length > 0) {
                return tbFilter.and(Rally.data.wsapi.Filter.fromQueryString(qFilter));
            } else {
                return tbFilter;
            }
        } else {
            if (qFilter && qFilter.length > 0) {
                return Rally.data.wsapi.Filter.fromQueryString(qFilter);
            } else {
                return [];
            }
        }
    },
    onTimeboxScopeChange: function (timeboxScope) {
        this.getContext().setTimeboxScope(timeboxScope);
        this._removeBoard();
        this._addBoard();
    },
    getSettingsFields: function () {
//        var parent = this;
//        var _columnDefsStore = Ext.create('Ext.data.Store', {
//            fields: ['column', 'display', 'mapping'],
//            data: []
//        });
        console.log('In getSettingsFields');
        return [
            {
                name: 'groupByField',
                xtype: 'rallyfieldcombobox',
                model: Ext.identityFn('Task'),
                margin: '0 0 0 0',
                fieldLabel: 'Columns',
                listeners: {
                    ready: function (combo) {
                        combo.store.filterBy(function (record) {
                            var attr = record.get('fieldDefinition').attributeDefinition;
                            return attr && !attr.ReadOnly && attr.Constrained && "STRING" === attr.AttributeType;
                        });
                    },
                    select: function (combo) {
                        console.log('select listener activated');
                        this.fireEvent('fieldselected', combo.getRecord().get('fieldDefinition'));
                    }
                },
                bubbleEvents: ['fieldselected', 'fieldready']
            },
            {
                name: 'columnDefs',
                fieldLabel: 'Column Definitions',
                xtype: 'kanbancolumnsettngscomp',
                margin: '2 0 0 0',
                width: 600
            },
            {
                xtype: 'textareafield',
                name: 'myQuery',
                margin: '2px 0 0 0',
                width: 680,
                fieldLabel: 'Custom Query',
                labelAlign: 'left',
                validateOnChange: false,
                validateOnBlur: false,
                validator: function (value) {
                    try {
                        if (value && value.length) {
                            Rally.data.wsapi.Filter.fromQueryString(value);
                        }
                    } catch (e) {
                        Rally.ui.notify.Notifier.showError({message: e.message});
                        console.log("message", e.message);
                        return e.message;
                    }
                    return true;
                }
            }
        ];
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
                emptyCellText: 'None',
                flex: 200
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
                emptyCellText: '--No Mapping--',
                flex: 3,
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
                        }
                    }
                }
            }
        ];
        return columns;
    },
    _recordToGridRow: function (allowedValue, store) {
        var columnName = allowedValue.get('StringValue');
        var pref = store.getCount() === 0 ? null : this.getSetting('columnDefs');
        var row = null;
        console.log('recordToGridRow ', columnName, store.getCount());
        console.log('columnDefs: ', this.getSetting('columnDefs'));
        console.log("Pref: ", pref);
        if (pref) {
            row = _.find(pref, function (row) {
                return row.column === columnName;
            });
            console.log('Row is: ', row);
        }
        if (!row) {
            row = {
                column: columnName,
                display: true,
                mapping: ''
            };
        }
        return row;
    }

});
