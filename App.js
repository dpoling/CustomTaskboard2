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
            attribute: this.getSetting('groupByField'),
            context: this.getContext(),
            rowConfig: {
                field: 'WorkProduct'
            },
            storeConfig: {
                filters: this._getFilters()
            },
            columnConfig: {
                listeners: {
                    beforecarddroppedsave: {
                        fn: this._onBeforeCardDroppedSave,
                        scope: this
                    },
                    beforerender: {
                        fn: this._onBeforeRenderColumn,
                        scope: this
                    }
                }
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
    _onBeforeRenderColumn: function (col) {
        console.log('in onBeforeRenderColumn column = ', col.columnHeaderConfig.headerTpl);
        var columnSetting = this._getColumnSetting();
        if (columnSetting) {
            var setting = _.find(columnSetting,
                    function (row) {
                        return row.column === col.columnHeaderConfig.headerTpl;
                    });
            if (setting) {
                console.log('display = ', setting.display);
                col.hidden = setting.display === false;
            } else {
                col.hidden = true;
            }
        }
    },
    _onBeforeCardDroppedSave: function (destCol, card) {
        console.log("In _onBeforeCardDroppedSaved");
        console.log('destCol= ', destCol);
        var columnSetting = this._getColumnSetting();
        if (columnSetting) {
            var setting = _.find(columnSetting,
                    function (row) {
                        return row.column === destCol.columnHeaderConfig.headerTpl;
                    });

            console.log("Task State: ", setting);
            if (setting) {
                card.getRecord().set('State', setting.mapping);
            }
        }
    },
    _getColumnSetting: function () {
        console.log("In _getColumnSetting");
        var columnSetting = this.getSetting('columnDefs');
        console.log("Columns: ", columnSetting);
        return columnSetting && Ext.JSON.decode(columnSetting);
    },

    onTimeboxScopeChange: function (timeboxScope) {
        this.getContext().setTimeboxScope(timeboxScope);
        this._removeBoard();
        this._addBoard();
    },
    getSettingsFields: function () {
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
                        console.log('select listener activated', combo);
                        //  this.fireEvent('fieldselected', combo.getRecord().get('fieldDefinition'));
                    }

                },
                bubbleEvents: ['select', 'ready']
            },
            {
                name: 'columnDefs',
                fieldLabel: 'Column Definitions',
                xtype: 'kanbancolumnsettngscomp',
                margin: '2 0 0 0',
                width: 600,
                handlesEvents: {
                    select: function (cb) {
                        this.updateField(cb.getRecord().get('fieldDefinition'));
                    },
                    ready: function (cb) {
                        this.updateField(cb.getRecord().get('fieldDefinition'));
                    }
                }
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
                emptyCellText: '- None -',
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