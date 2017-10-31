//# sourceURL=ExtJS_extensions.js
/*
 * (C) Copyright 2014 The Genomics of Gene Expression Lab, CIPF
 * (http://bioinfo.cipf.es/aconesawp) and others.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the GNU Lesser General Public License
 * (LGPL) version 3 which accompanies this distribution, and is available at
 * http://www.gnu.org/licenses/lgpl.html
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * Contributors:
 *     Rafael Hernandez de Diego
 *     rhernandez@cipf.es
 *     Ana Conesa Cegarra
 *     aconesa@cipf.es
 *
 * THIS FILE CONTAINS THE FOLLOWING COMPONENT DECLARATION
 * - Ext.grid.column.CheckColumnCustom
 * - Ext.grid.column.ActionCustom
 * - Ext.grid.LiveSearchGridPanel
 */
/************************************************************
 *
 * EXTJS EXTENSIONS
 *
 ************************************************************/
Ext.define('Ext.grid.column.CheckColumnCustom', {
    extend: 'Ext.grid.column.CheckColumn',
    alias: 'widget.customcheckcolumn',
    innerCls: Ext.baseCSSPrefix + 'grid-cell-inner-checkcolumn customcheckcolumn',
    renderer: function (value, meta) {
        var classes = "";
        if (this.disabled) {
            meta.tdCls += ' ' + this.disabledCls;
        }
        if (value) {
            classes = "fa-check-square fa-checkedcheckcolumn";
        } else {
            classes = "fa-square-o";
        }

        return '<i class="fa ' + classes + '"></i>';
    }
});

Ext.define('Ext.grid.column.ActionCustom', {
    extend: 'Ext.grid.column.Action',
    alias: ['widget.customactioncolumn'],
    innerCls: Ext.baseCSSPrefix + 'grid-cell-inner-action-col customactioncolumn',
    defaultRenderer: function (v, meta, record, rowIdx, colIdx, store, view) {
        var me = this, prefix = Ext.baseCSSPrefix,
                scope = me.origScope || me,
                items = me.items,
                len = items.length,
                i = 0,
                item, ret, disabled, tooltip;
        ret = Ext.isFunction(me.origRenderer) ? me.origRenderer.apply(scope, arguments) || '' : '';

        meta.tdCls += ' ' + Ext.baseCSSPrefix + 'action-col-cell';
        for (; i < len; i++) {
            item = items[i];

            item_tooltip = (typeof(item.tooltip) == "function") ? item.tooltip(v, meta, record, rowIdx, colIdx, store, view) : item.tooltip;

            disabled = item.disabled || (item.isDisabled ? item.isDisabled.call(item.scope || scope, view, rowIdx, colIdx, item, record) : false);
            tooltip = disabled ? null : (item_tooltip || (item.getTip ? item.getTip.apply(item.scope || scope, arguments) : null));

            // Only process the item action setup once.
            if (!item.hasActionConfiguration) {
                // Apply our documented default to all items
                item.stopSelection = me.stopSelection;
                item.disable = Ext.Function.bind(me.disableAction, me, [i], 0);
                item.enable = Ext.Function.bind(me.enableAction, me, [i], 0);
                item.hasActionConfiguration = true;
            }

            // If text is a function, call it and use the return value as text
            var rowText = (typeof(item.text) == "function") ? item.text(v, meta, record, rowIdx, colIdx, store, view): item.text;

            ret += '<a href="' + ((item.href !== undefined) ? item.href : 'javascript:void(0)') + '" ' + ((item.style !== undefined) ? 'style="' + item.style + '"' : '') + ' class="helpTip ' + prefix + 'action-col-icon ' + prefix + 'action-col-' + String(i) + ' ' + (disabled ? prefix + 'item-disabled' : ' ') +
                    ' ' + (Ext.isFunction(item.getClass) ? item.getClass.apply(item.scope || scope, arguments) : (item.iconCls || me.iconCls || '')) + '"' +
                    (tooltip ? ' title="' + tooltip + '"' : '') + '>' + '<i class="fa ' + item.icon + '"></i> ' + rowText + '</a>';
        }
        return ret;
    },
    processEvent: function (type, view, cell, recordIndex, cellIndex, e, record, row) {
        var me = this,
                target = e.getTarget(),
                match,
                item, fn,
                key = type == 'keydown' && e.getKey();

        // If the target was not within a cell (ie it's a keydown event from the View), then
        // rely on the selection data injected by View.processUIEvent to grab the
        // first action icon from the selected cell.
        if ((key && !Ext.fly(target).findParent(view.cellSelector)) || target.nodeName === "I") {
            target = Ext.fly(cell).down('.' + Ext.baseCSSPrefix + 'action-col-icon', true);
        }

        // NOTE: The statement below tests the truthiness of an assignment.
        if (target && (match = target.className.match(me.actionIdRe))) {
            item = me.items[parseInt(match[1], 10)];
            if (item) {
                if (type == 'click' || (key == e.ENTER || key == e.SPACE)) {
                    fn = item.handler || me.handler;
                    if (fn && !item.disabled) {
                        fn.call(item.scope || me.origScope || me, view, recordIndex, cellIndex, item, e, record, row);
                    }
                } else if (type == 'mousedown' && item.stopSelection !== false) {
                    return false;
                }
            }
        }
        // return me.callParent(arguments);
    }
});

Ext.define('Ext.grid.LiveSearchGridPanel', {
    extend: 'Ext.grid.Panel',
    alias: ['widget.livesearchgrid'],
    requires: ['Ext.toolbar.TextItem', 'Ext.form.field.Checkbox', 'Ext.form.field.Text'],
    searchValue: null, //search value initialization
    searchRegExp: null, //The generated regular expression used for searching.
    caseSensitive: false, //Case sensitive mode.
    regExpMode: false, //Regular expression mode.
    matchCls: 'x-livesearch-match', //The matched string css classe.
    tagsRe: /<[^>]*>/gm, // detects html tag
    tagsProtect: '\x0f', // DEL ASCII code
    download: false,
    multidelete: false,
    databases: [],
    stripeRows: true,
    viewConfig: {
        markDirty: false,
        listeners: {
            refresh: function (view) {
                initializeTooltips(".helpTip");
//                initializeTooltips(".customactioncolumn > .x-action-col-icon");
            }
        }},
    regExpProtect: /\\|\/|\+|\\|\.|\[|\]|\{|\}|\?|\$|\*|\^|\|/gm, // detects regexp reserved word
    searchFor: "title", //the name of the column that will be inspected
    // Component initialization override: adds the top and bottom toolbars and setup headers renderer.
    multiDeleteHandler: function () {
        console.error("multiDeleteHandler: Not implemented!");
        return this;
    },
    initComponent: function () {
        var me = this;
        me.viewConfig.stripeRows = this.stripeRows;

        me.tbar = ['Search', {
                xtype: 'textfield',
                name: 'searchField',
                hideLabel: true,
                width: 200,
                listeners: {change: {fn: me.onTextFieldChange, scope: this, buffer: 100}}
            }, '-', {
                xtype: 'checkbox',
                hideLabel: true,
                margin: '0 0 0 4px',
                handler: me.regExpToggle,
                scope: me
            }, 'Regular expression', {
                xtype: 'checkbox',
                hideLabel: true,
                margin: '0 0 0 4px',
                handler: me.caseSensitiveToggle,
                scope: me
            }, 'Case sensitive',
            /* Splice position: -3 */
            '->',
            ((me.download !== false) ? '<a class="downloadXLS" href="javascript:void(0)"><i class="fa fa-file-excel-o"></i> Download as XLS</a>' : ""),
            ((me.multidelete !== false) ? '<a class="multiDelete" style="color:rgb(242, 105, 105);" href="javascript:void(0)"><i class="fa fa-trash"></i> Delete selected</a>' : "")
        ];

        if (me.databases.length > 1) {
          /* Add a separator then the extra checkboxes */
          var database_options = ['-', '<span style="margin: 0 5px 0 10px;font-weight: bold;">Databases to view:</span>'];

          me.databases.forEach(function(source) {
            database_options.push({
              xtype: 'checkbox',
              hideLabel: true,
              margin: '0 0 0 4px',
              handler: me.databaseToggle,
              name: 'database',
              scope: me,
              inputValue: source,
              checked: true
            }, source);
          });

          me.tbar.splice(-3, 0, ...database_options);
        }

        me.callParent(arguments);
    },
    // afterRender override: it adds textfield and statusbar reference and start monitoring keydown events in textfield input
    afterRender: function () {
        var me = this;
        me.callParent(arguments);
        me.textField = me.down('textfield[name=searchField]');
        $("#" + this.el.id + " a.downloadXLS").click(function () {
            me.downloadExcelXml();
        });
        $("#" + this.el.id + " a.multiDelete").click(function () {
            me.multiDeleteHandler();
        });
    },
    /**
     * In normal mode it returns the value with protected regexp characters.
     * In regular expression mode it returns the raw value except if the regexp is invalid.
     * @return {String} The value to process or null if the textfield value is blank or invalid.
     * @private
     */
    getSearchValue: function () {
        var me = this;
        var value = me.textField.getValue();

        if (value === '') {
            return null;
        }
        if (!me.regExpMode) {
            value = value.replace(me.regExpProtect,
                    function (m) {
                        return '\\' + m;
                    });
        } else {
            try {
                new RegExp(value);
            } catch (error) {
                return null;
            }
            // this is stupid
            if (value === '^' || value === '$') {
                return null;
            }
        }

        return value;
    },
    /**
     * Finds all strings that matches the searched value in each grid cells.
     * @private
     */
    onTextFieldChange: function () {
        var me = this, count = 0;

        me.view.refresh();
        me.searchValue = me.getSearchValue();
        me.indexes = [];
        me.currentIndex = null;

        if (me.searchValue !== null) {
            me.searchRegExp = new RegExp(me.searchValue, (me.caseSensitive ? '' : 'i'));
            me.store.addFilter({id: "livesearch", property: me.searchFor, value: me.searchRegExp, root: 'data'});
        } else {
            me.store.removeFilter('livesearch');
        }
        me.getSelectionModel().deselectAll();
        me.textField.focus();
    },
    /**
     * Switch to case sensitive mode.
     * @private
     */
    caseSensitiveToggle: function (checkbox, checked) {
        this.caseSensitive = checked;
        this.onTextFieldChange();
    },
    /**
     * Switch to regular expression mode
     * @private
     */
    regExpToggle: function (checkbox, checked) {
        this.regExpMode = checked;
        this.onTextFieldChange();
    },
    /**
     * Enable/disable source databases in the table view
     * @private
     */
    databaseToggle: function (checkbox, checked) {
        var me = this;
        var db_cboxes = me.query('checkbox[name=database]').map(function(elem) {
          if (elem.checked) {
            return(elem.inputValue);
          }
        });

        me.view.refresh();
        me.store.addFilter({id: "database", filterFn: function(item) {
          return(db_cboxes.indexOf(item.raw.source) !== -1);
        }, root: 'data'});
        me.getSelectionModel().deselectAll();
    }
});

Ext.form.field.Base.override({
    listeners: {
        boxready: function () {
            if ((this.helpTip !== undefined) && (this.labelEl !== undefined)) {
                var label = this.inputRow.dom, pos = label.innerHTML.indexOf('helpTip');
                if (pos === -1) {
                    $(label).append('<td style="width:15px"><span class="helpTip" style="float:right;" title="' + this.helpTip + '""></span></td>');
                }
            }
        }
    }
});
/**
 * Excel.js - convert an Ext 4 grid into an Excel spreadsheet using nothing but
 * javascript and good intentions.

 * First versuib by: Steve Drucker
 * October 26, 2013
 * Original Ext 3 Implementation by: Nige "Animal" White?

 * Second version: sdruckerfig (e. sdrucker@figleaf.com)
 * Company: Fig Leaf Software (http://www.figleaf.com / http://training.figleaf.com)
 * git: http://github.com/sdruckerfig
 */
var Base64 = (function () {
    // Private property
    var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
    // Private method for UTF-8 encoding
    function utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) {
                utftext += String.fromCharCode(c);
            } else if ((c > 127) && (c < 2048)) {
                utftext += String.fromCharCode((c >> 6) | 192);
                utftext += String.fromCharCode((c & 63) | 128);
            } else {
                utftext += String.fromCharCode((c >> 12) | 224);
                utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                utftext += String.fromCharCode((c & 63) | 128);
            }
        }
        return utftext;
    }

    // Public method for encoding
    return {
        encode: (typeof btoa == 'function') ? function (input) {
            return btoa(utf8Encode(input));
        } : function (input) {
            var output = "";
            var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
            var i = 0;
            input = utf8Encode(input);
            while (i < input.length) {
                chr1 = input.charCodeAt(i++);
                chr2 = input.charCodeAt(i++);
                chr3 = input.charCodeAt(i++);
                enc1 = chr1 >> 2;
                enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
                enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
                enc4 = chr3 & 63;
                if (isNaN(chr2)) {
                    enc3 = enc4 = 64;
                } else if (isNaN(chr3)) {
                    enc4 = 64;
                }
                output = output +
                        keyStr.charAt(enc1) + keyStr.charAt(enc2) +
                        keyStr.charAt(enc3) + keyStr.charAt(enc4);
            }
            return output;
        }
    };
})();

Ext.define('Ext.view.override.Grid', {
    override: 'Ext.grid.GridPanel',
    requires: 'Ext.form.action.StandardSubmit',
    /**
     * Kick off process
     * @param {type} includeHidden
     * @param {type} title
     * @returns {undefined}
     */
    downloadExcelXml: function () {
        if (this.download === false) {
            return;
        }
        if (!this.download.title) {
            this.download.title = (this.title ? this.title : "Noname");
        }
        if (!this.download.includeHidden) {
            this.download.includeHidden = false;
        }
        if (!this.download.ignoreColums) {
            this.download.ignoreColums = [];
        }

        var vExportContent = this.getExcelXml(this.download.includeHidden, this.download.title, this.download.ignoreColums);

        var location = 'data:application/vnd.ms-excel;base64,' + Base64.encode(vExportContent);

        //Dynamically create and anchor tag to force download with suggested filename
        //note: download attribute is Google Chrome specific
        if (Ext.isChrome) {
            var gridEl = this.getEl();
            var el = Ext.DomHelper.append(gridEl, {
                tag: "a",
                download: this.download.title.replace(/ /g, "_") + "-" + Ext.Date.format(new Date(), 'Y-m-d Hi') + '.xls',
                href: location
            });

            el.click();
            Ext.fly(el).destroy();
        } else {
            var form = this.down('form#uploadForm');
            if (form) {
                form.destroy();
            }
            form = this.add({
                xtype: 'form',
                itemId: 'uploadForm',
                hidden: true,
                standardSubmit: true,
                url: 'http://webapps.figleaf.com/dataservices/Excel.cfc?method=echo&mimetype=application/vnd.ms-excel&filename=' + escape(this.download.title.replace(/ /g, "_") + ".xls"),
                items: [{
                        xtype: 'hiddenfield',
                        name: 'data',
                        value: vExportContent
                    }]
            });
            form.getForm().submit();
        }
    },
    /**
     * Welcome to XML Hell
     * See: http://msdn.microsoft.com/en-us/library/office/aa140066(v=office.10).aspx for more details
     *
     * @param {type} includeHidden
     * @param {type} title
     * @returns {String}
     */
    getExcelXml: function (includeHidden, title, ignoreColumns) {
        var theTitle = title || this.title;
        var worksheet = this.createWorksheet(includeHidden, theTitle, ignoreColumns);
        var totalWidth = this.columnManager.columns.length;
        return ''.concat(
                '<?xml version="1.0"?>',
                '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet" xmlns:html="http://www.w3.org/TR/REC-html40">',
                '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>' + theTitle + '</Title></DocumentProperties>',
                '<OfficeDocumentSettings xmlns="urn:schemas-microsoft-com:office:office"><AllowPNG/></OfficeDocumentSettings>',
                '<ExcelWorkbook xmlns="urn:schemas-microsoft-com:office:excel">',
                '<WindowHeight>' + worksheet.height + '</WindowHeight>',
                '<WindowWidth>' + worksheet.width + '</WindowWidth>',
                '<ProtectStructure>False</ProtectStructure>',
                '<ProtectWindows>False</ProtectWindows>',
                '</ExcelWorkbook>',
                '<Styles>',
                '<Style ss:ID="Default" ss:Name="Normal">',
                '<Alignment ss:Vertical="Bottom"/>',
                '<Borders/>',
                '<Font ss:FontName="Calibri" x:Family="Swiss" ss:Size="12" ss:Color="#000000"/>',
                '<Interior/>',
                '<NumberFormat/>',
                '<Protection/>',
                '</Style>',
                '<Style ss:ID="title">',
                '<Borders />',
                '<Font ss:Bold="1" ss:Size="18" />',
                '<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1" />',
                '<NumberFormat ss:Format="@" />',
                '</Style>',
                '<Style ss:ID="headercell">',
                '<Font ss:Bold="1" ss:Size="14" />',
                '<Alignment ss:Horizontal="Center" ss:WrapText="1" />',
                '<Interior ss:Color="#A3C9F1" ss:Pattern="Solid" />',
                '</Style>',
                '<Style ss:ID="even">',
                '<Interior ss:Color="#FAFAFA" ss:Pattern="Solid" />',
                '</Style>',
                '<Style ss:ID="evendate" ss:Parent="even">',
                '<NumberFormat ss:Format="yyyy-mm-dd" />',
                '</Style>',
                '<Style ss:ID="evenint" ss:Parent="even">',
                '<Alignment ss:Horizontal="Center" ss:WrapText="1" />',
                '<Numberformat ss:Format="0" />',
                '</Style>',
                '<Style ss:ID="evenfloat" ss:Parent="even">',
                '<Alignment ss:Horizontal="Center" ss:WrapText="1" />',
                '<Numberformat ss:Format="0.00" />',
                '</Style>',
                '<Style ss:ID="odd">',
                '<Interior ss:Color="#FFFFFF" ss:Pattern="Solid" />',
                '</Style>',
                '<Style ss:ID="groupSeparator">',
                '<Interior ss:Color="#D3D3D3" ss:Pattern="Solid" />',
                '</Style>',
                '<Style ss:ID="odddate" ss:Parent="odd">',
                '<NumberFormat ss:Format="yyyy-mm-dd" />',
                '</Style>',
                '<Style ss:ID="oddint" ss:Parent="odd">',
                '<Alignment ss:Horizontal="Center" ss:WrapText="1" />',
                '<NumberFormat Format="0" />',
                '</Style>',
                '<Style ss:ID="oddfloat" ss:Parent="odd">',
                '<Alignment ss:Horizontal="Center" ss:WrapText="1" />',
                '<NumberFormat Format="0.00" />',
                '</Style>',
                '</Styles>',
                worksheet.xml,
                '</Workbook>'
                );
    },
    /*Support function to return field info from store based on fieldname*/
    getModelField: function (fieldName) {
        var fields = this.store.model.getFields();
        for (var i = 0; i < fields.length; i++) {
            if (fields[i].name === fieldName) {
                return fields[i];
            }
        }
    },
    /*Convert store into Excel Worksheet*/
    generateEmptyGroupRow: function (dataIndex, value, cellTypes, includeHidden) {
        var cm = this.columnManager.columns;
        var colCount = cm.length;
        var rowTpl = '<Row ss:AutoFitHeight="0"><Cell ss:StyleID="groupSeparator" ss:MergeAcross="{0}"><Data ss:Type="String"><html:b>{1}</html:b></Data></Cell></Row>';
        var visibleCols = 0;
        for (var j = 0; j < colCount; j++) {
            if (cm[j].xtype != 'actioncolumn' && (cm[j].dataIndex != '') && (includeHidden || !cm[j].hidden)) {
                visibleCols++;
            }
        }
        return Ext.String.format(rowTpl, visibleCols - 1, value);
    },
    createWorksheet: function (includeHidden, theTitle, ignoreColumns) {
        // Calculate cell data types and extra class names which affect formatting
        var cellType = [];
        var cellTypeClass = [];
        var cm = this.columnManager.columns;
        var colTitle = "";
        var totalWidthInPixels = 0, colXml = '', headerXml = '', visibleColumnCountReduction = 0, colCount = cm.length;
        //GENERATE THE COLUMNS INFORMATION
        debugger
        for (var i = 0; i < colCount; i++) {
            //ADJUST TITLE (REMOVE SPECIAL CHARACTERS, HTML,...)
            colTitle = cm[i].text.replace("</br>", "");

            //NOTE IF YOU USE A CULUMN TYPE NOT VALID(e.g. actioncolumn) YOU MUST EDIT THIS LINE
            if (cm[i].xtype != 'actioncolumn' && cm[i].xtype != 'customactioncolumn'
                    && (cm[i].dataIndex != '') && (includeHidden || !cm[i].hidden)
                    && ignoreColumns.indexOf(i + 1) === -1) {
                var w = cm[i].getEl().getWidth();
                totalWidthInPixels += w;

                if (cm[i].text === "") {
                    cellType.push("None");
                    cellTypeClass.push("");
                    ++visibleColumnCountReduction;
                } else {
                    colXml += '<Column ss:AutoFitWidth="1" ss:Width="' + w + '" />';
                    headerXml += '<Cell ss:StyleID="headercell"><Data ss:Type="String">' + colTitle + '</Data><NamedCell ss:Name="Print_Titles"></NamedCell></Cell>';

                    var fld = this.getModelField(cm[i].dataIndex);
                    switch (fld.type.type) {
                        case "int":
                            cellType.push("Number");
                            cellTypeClass.push("int");
                            break;
                        case "float":
                            cellType.push("Number");
                            cellTypeClass.push("float");
                            break;

                        case "bool":
                        case "boolean":
                            cellType.push("String");
                            cellTypeClass.push("");
                            break;
                        case "date":
                            cellType.push("DateTime");
                            cellTypeClass.push("date");
                            break;
                        default:
                            cellType.push("String");
                            cellTypeClass.push("");
                            break;
                    }
                }
            }
        }
        var visibleColumnCount = cellType.length - visibleColumnCountReduction;

        var result = {height: 9000, width: Math.floor(totalWidthInPixels * 30) + 50};

        // Generate worksheet header details.
        // determine number of rows
        var numGridRows = this.store.getCount() + 2;
        if (!Ext.isEmpty(this.store.groupField) || this.store.groupers.items.length > 0) {
            numGridRows = numGridRows + this.store.getGroups().length;
        }

        // create header for worksheet
        var t = ''.concat(
                '<Worksheet ss:Name="' + theTitle + '">',
                '<Names>',
                '<NamedRange ss:Name="Print_Titles" ss:RefersTo="=\'' + theTitle + '\'!R1:R2">',
                '</NamedRange></Names>',
                '<Table ss:ExpandedColumnCount="' + (visibleColumnCount + 2),
                '" ss:ExpandedRowCount="' + numGridRows + '" x:FullColumns="1" x:FullRows="1" ss:DefaultColumnWidth="65" ss:DefaultRowHeight="15">',
                colXml,
                '<Row ss:Height="38">',
                '<Cell ss:MergeAcross="' + (visibleColumnCount - 1) + '" ss:StyleID="title">',
                '<Data ss:Type="String" xmlns:html="http://www.w3.org/TR/REC-html40">',
                '<html:b>' + theTitle + '</html:b></Data><NamedCell ss:Name="Print_Titles">',
                '</NamedCell></Cell>',
                '</Row>',
                '<Row ss:AutoFitHeight="1">',
                headerXml +
                '</Row>'
                );

        // Generate the data rows from the data in the Store
        var groupVal = "";
        var groupField = "";
        if (this.store.groupers.keys.length > 0) {
            groupField = this.store.groupers.keys[0];
        }
        for (var i = 0, it = this.store.data.items, l = it.length; i < l; i++) {
            if (!Ext.isEmpty(groupField)) {
                if (groupVal != this.store.getAt(i).get(groupField)) {
                    groupVal = this.store.getAt(i).get(groupField);
                    t += this.generateEmptyGroupRow(groupField, groupVal, cellType, includeHidden);
                }
            }
            t += '<Row>';
            var cellClass = (i & 1) ? 'odd' : 'even';
            r = it[i].data;
            var k = 0;
            for (var j = 0; j < colCount; j++) {
                if (ignoreColumns.indexOf(j + 1) === -1 && cm[j].xtype != 'actioncolumn' && (cm[j].dataIndex != '') && (includeHidden || !cm[j].hidden)) {
                    var v = r[cm[j].dataIndex];
                    var celltype = cellType[k];
                    //TRY TO GET THE CEL TYPE WHEN IS NOT DEFINED (auto type)
                    if (v && !isNaN(v)) {
                        celltype = "Number";
                        if (v % 1 !== 0) {
                            cellTypeClass[k] = "float"; //oddfloat or evenfloat
                        } else {
                            cellTypeClass[k] = "int"; //oddint or evenint
                        }
                    } else if (v === "-" && celltype === "Number") {
                        celltype = "String";
                    } else if (v) {
                        v = v.replace("</br>", "");
                    } else {
                        v = "";
                    }

                    if (celltype !== "None") {
                        t += '<Cell ss:StyleID="' + cellClass + (cellTypeClass[k] ? cellTypeClass[k] : "") + '"><Data ss:Type="' + (celltype ? celltype : "String") + '">';
                        if (celltype == 'DateTime') {
                            t += Ext.Date.format(v, 'Y-m-d');
                        } else {
                            t += v;
                        }
                        t += '</Data></Cell>';
                    }
                    k++;
                }
            }
            t += '</Row>';
        }

        result.xml = t.concat(
                '</Table>',
                '<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">',
                '<PageLayoutZoom>0</PageLayoutZoom>',
                '<Selected/>',
                '<Panes>',
                '<Pane>',
                '<Number>3</Number>',
                '<ActiveRow>2</ActiveRow>',
                '</Pane>',
                '</Panes>',
                '<ProtectObjects>False</ProtectObjects>',
                '<ProtectScenarios>False</ProtectScenarios>',
                '</WorksheetOptions>',
                '</Worksheet>'
                );
        return result;
    }
});

Ext.override(Ext.form.field.FileButton, {
    renderTpl: [
        '<span id="{id}-btnWrap" class="{baseCls}-wrap',
        '<tpl if="splitCls"> {splitCls}</tpl>',
        '{childElCls}" unselectable="on">',
        '<span id="{id}-btnEl" class="{baseCls}-button">',
        '<span id="{id}-btnInnerEl" class="{baseCls}-inner {innerCls}',
        '{childElCls}" unselectable="on">',
        '{text}',
        '</span>',
        '<span role="img" id="{id}-btnIconEl" class="{baseCls}-icon-el {iconCls}',
        '{childElCls} {glyphCls}" unselectable="on" style="',
        '<tpl if="iconUrl">background-image:url({iconUrl});</tpl>',
        '<tpl if="glyph && glyphFontFamily">font-family:{glyphFontFamily};</tpl>">',
        '<tpl if="glyph">&#{glyph};</tpl><tpl if="iconCls || iconUrl"> </tpl>',
        '</span>',
        '</span>',
        '</span>',
        '<input id="{id}-fileInputEl" class="{childElCls} {inputCls}" type="file" size="1" ',
        'name="{inputName}" <tpl if="disabled"> disabled="disabled"</tpl>>'
    ],
    getTemplateArgs: function () {
        var args = this.callParent();
        args.inputCls = this.inputCls;
        args.inputName = this.inputName;
        args.disabled = this.disabled;
        return args;
    },
    createFileInput: function (isTemporary) {
        var me = this;

        me.fileInputEl = me.el.createChild(Ext.apply({
            name: me.inputName,
            id: !isTemporary ? me.id + '-fileInputEl' : undefined,
            cls: me.inputCls,
            tag: 'input',
            type: 'file',
            size: 1
        }, me.disabled ? {disabled: true} : {}));
        me.fileInputEl.on('change', me.fireChange, me);
    }
});
/************************************************************
 *
 * HIGHCHARTS EXTENSIONS
 *
 ************************************************************/

//EXTEND THE DRAW COMPONENT ADDING ZOOMING AND DRAGGING
Ext.applyIf(Ext.draw.Component.prototype, {
    // direction 't", 'b", 'l' or 'r'
    // distance in pixels - int
    // pan() means reset pan
    pan: function (direction, distance) {
        var me = this;
        if (Ext.isDefined(direction)) {
            me.surface.el.move(direction, distance || 75, true);
        } else {
            var el = me.surface.el,
                    position = el.getStyle("position");
            if (position === 'relative') {
                el.setStyle({position: 'static', top: 0, left: 0});
            }
        }
        return me;
    },
//    multiplePan: function(movements) {
//        var me = this;
//        var dir, dist;
//        for (var i in movements) {
//            dir = movements[i][0];
//            dist = movements[i][1];
//            this.pan(dir, dist);
//        }
//        return me;
//    },
    drag: function (distX, distY) {
        var me = this;
        if (distX < 0) {
            distX = Math.max(me.surface.el.getX() + distX, (me.surface.el.getWidth() - me.prevZoom * me.surface.el.getWidth()) * 1.5);
        } else {
            distX = Math.min(50, me.surface.el.getX() + distX);
        }
        if (distY < 0) {
            distY = Math.max(me.surface.el.getY() + distY, (me.surface.el.getHeight() - me.prevZoom * me.surface.el.getHeight()) * 1.5);
        } else {
            distY = Math.min(170, me.surface.el.getY() + distY);
        }


        me.surface.el.moveTo(distX, distY);
        return me;

    },
    reset: function () {
        return this.pan().zoom();
    },
    prevZoom: 1,
    // zoom(120) means zoom 120%
    // zoom() means reset zoom
    zoom: function (zoom) {
        var me = this;
        if (zoom <= 100) {
            me.pan();
        }

        function zoomFF(zoom) {
            var size = me.getSize();
            me.surface.setViewBox(0, 0, (size.width * 100) / zoom, (size.height * 100) / zoom);
        }
        function zoomWebKit(zoom) {
            me.surface.el.setStyle({
                WebkitTransform: 'scale(' + (zoom / 100) + ')',
                WebkitTransformOrigin: '0 0',
                zoom: zoom + '%'
            });
        }
        if (Ext.isDefined(zoom)) {
            me.prevZoom = zoom / 100;
            var fn = Ext.isGecko ? zoomFF : zoomWebKit;
            fn(zoom);
        } else {
            if (me.prevZoom !== 1) {
                me.zoom(100 / me.prevZoom);
                me.prevZoom = 1;
            }
        }
        return me;
    },
    setViewBox: function () {
        var me = this,
                bbox = me.surface.items.getBBox(),
                width = bbox.width,
                height = bbox.height,
                x = bbox.x,
                y = bbox.y;
        me.surface.setViewBox(x, y, width + 5, height + 5);
    }
});

//ADD A ROW MARKER FOR THE HEATMAP
(function (H) {
    H.wrap(H.Series.prototype, 'render', function (proceed) {
        // Now apply the original function with the original arguments,
        // which are sliced off this function's arguments
        proceed.apply(this, Array.prototype.slice.call(arguments, 1));

        // This functionality is only available with categories and only if configured for it
        if (this.xAxis && this.xAxis.categories && this.chart.options.heatmapSelector) {
            this.showHeatmapSelector = function (x, y) {
                var chart = this.chart;
                var renderer = chart.renderer;
                var axis = this.xAxis;

                var height = this.yAxis.height / this.yAxis.categories.length;
                var width = axis.len;
                x = ((x === undefined) ? axis.pos : x);
                y = axis.top + ((this.yAxis.categories.length - ((y === undefined) ? this.points[0].y : y) - 1) * height);


                var heatmapSelector = chart.heatmapSelector;
                var options = chart.options.heatmapSelector;

                var path = [
                    'M', x, y,
                    'L', x, y + height,
                    'L', x + width, y + height,
                    'L', x + width, y,
                    'Z'];

                if (heatmapSelector) {
                    heatmapSelector.attr("display", "block");
                    heatmapSelector.animate({
                        d: path
                    });
                } else {
                    heatmapSelector = chart.heatmapSelector = renderer.path(path).attr({
                        'stroke': options.color || '#C0C0C0',
                        'stroke-width': options.lineWidth || 1,
                        'dashstyle': options.dashStyle || 'solid',
                        zIndex: 10
                    }).add();
                }
            };

            this.hideHeatmapSelector = function () {
                if (this.chart.heatmapSelector) {
                    this.chart.heatmapSelector.attr("display", "none");
                }
            };

            this.onMouseOver = function () {
                this.showHeatmapSelector();
            };
        }
    });


    H.wrap(H.Chart.prototype, 'init', function (proceed) {
        // If not data for clusterize or not a Heatmap chart, apply the original
        // function with the original arguments, which are sliced off this function's arguments
        var options = arguments[1];

        if (!options.clusterize || options.series.length < 3) {
            proceed.apply(this, Array.prototype.slice.call(arguments, 1));
            return;
        }

        /*
         * CLUSTERIZE OPTIONS (http://en.wikipedia.org/wiki/Cluster_analysis)
         *
         *  algorithm:  clustering algorithm, we use a customized version of figue library
         *              https://code.google.com/p/figue/wiki/Introduction. [default = hierarchical]
         *              Valid options are:
         *              - kmeans:       K-means is one of the most famous clustering algorithm,
         *                              http://en.wikipedia.org/wiki/K-means_clustering
         *              - hierarchical: Hierarchical clustering is useful to cluster data without
         *                              knowing apriori the number of clusters or just in order to
         *                              visualize the distance relationships between data items.
         *              - fuzzy:        Fuzzy C-means, not implemented yet.
         *
         *  distance:   function that we use to calculate the distance between to elements in the
         *              data vector. [default = euclidean]
         *              Valid options are:
         *              - euclidean:    Euclidean distance, http://en.wikipedia.org/wiki/Euclidean_distance
         *              - manhattan:    Manhattan distance, http://en.wikipedia.org/wiki/Taxicab_geometry
         *              - max:          Maximal distance
         *
         *  linkage:    since a cluster consists of multiple objects, there are multiple candidates to compute
         *              the distance to. [default = average]
         *              Valid options are:
         *              - single:       Single-linkage clustering, at each step, the two clusters separated by the shortest
         *                              distance are combined. http://en.wikipedia.org/wiki/Single-linkage_clustering
         *              - average:      UPGMA  hierarchical clustering method. At each step, the nearest two clusters are combined
         *                              into a higher-level cluster. http://en.wikipedia.org/wiki/UPGMA
         *              - complete:     Complete-linkage clustering, at each step, the two clusters separated by the largest
         *                              distance are combined. http://en.wikipedia.org/wiki/Complete-linkage_clustering
         *
         *  k:          [only for K-means clustering] number of clusters for k-means algorithm. [default = SQRT(N/2), rounded upwards].
         *              http://en.wikipedia.org/wiki/Determining_the_number_of_clusters_in_a_data_set
         *
         *  dendogram:  [only for hierarchical clustering] boolean value (true == draw default dendogram) or an object containing the dendogram
         *              settings. [default = false]
         *              Valid dendogram options are:
         *              - width:        width for the dendongram. Note that this size will be taken from the total size
         *                              of the chart container.  [default = 150px]
         *              - color:        color line for the dendogram [default = #C0C0C0]
         *              - lineWidth:    thick of line for the dendogram [default = 1px]
         *              - reorder:      determines if the row dendrogram should be reordered
         *                              By default, it is TRUE, which implies dendrogram is computed and reordered based on row means
         *
         *
         */

        //*********************************************************************************
        //STEP 0. READ SETTINGS AND VARIABLE DECLARATION
        var validAlgorithm = {"kmeans": "kmeans", "hierarchical": "hierarchical", /*"fuzzi":"fuzzi"*/};
        var validDistance = {"euclidean": clusterfck.EUCLIDIAN_DISTANCE, "manhattan": clusterfck.MANHATTAN_DISTANCE, "max": clusterfck.MAX_DISTANCE};
        var validLinkage = {"single": clusterfck.SINGLE_LINKAGE, "average": clusterfck.AVERAGE_LINKAGE, "complete": clusterfck.COMPLETE_LINKAGE};

        //DEFAULT OPTION hierarchical
        var algorithm = (validAlgorithm[options.clusterize.algorithm] || "hierarchical");
        //DEFAULT OPTION EUCLIDIAN_DISTANCE
        var distance = (validDistance[options.clusterize.distance] || clusterfck.EUCLIDIAN_DISTANCE);
        //DEFAULT OPTION AVERAGE_LINKAGE
        var linkage = (validLinkage[options.clusterize.linkage] || clusterfck.AVERAGE_LINKAGE);
        //DEFAULT OPTION k = SQRT(N/2), rounded upwards
        var k = options.clusterize.k;
        if (!k || k > options.series.length) {
            k = Math.ceil(Math.sqrt(options.series.length / 2));
        }
        //DEFAULT OPTION FALSE
        var dendogram = false;
        if (options.clusterize.dendogram === true) {
            dendogram = {};
        } else if (Object.prototype.toString.call(options.clusterize.dendogram) === "[object Object]") {
            dendogram = options.clusterize.dendogram;
        }

        //READ ORIGINAL DATA
        var originalData = options.series;
        var oldAxis = options.yAxis.categories;

        //SOME AUXILIAR VARIABLE DECLARATION
        var clusters = [], clusterElem, positions = [], labels = [];

        //*********************************************************************************
        //STEP 1. EXTRACT VALUES FOR EACH SERIES AND KEEP POSITIONS FOR LATER REORDERING
        for (var i in originalData) {
            clusterElem = [];
            for (var j in originalData[i].data) {
                clusterElem.push(originalData[i].data[j].value);
            }
            clusters.push(clusterElem);
            positions.push(i);
            labels.push(originalData[i].name);
        }

        //*********************************************************************************
        //STEP 2. CLUSTERIZE
        //After clustering, the order for the series in the chart may change therefore we
        //need to update the corresponding y coordinate for each value in each series and
        //update the order for the labels in the y Axis.
        if (algorithm === "kmeans") {
            //STEP 2.1 CALCULATE CLUSTERS
            //This function returns a set of clusters (arrays) containing the indexes for the
            //each element in the input vector
            clusters = clusterfck.kmeans(positions, clusters, k, {distance: distance});

            //STEP 2.2 FOR EACH CLUSTER, EXTRACT THE INFORMATION FOR EACH ELEMENT
            var newYaxis = [], yPos = 0, originalElem;
            for (var i in clusters.labels) { //for each cluster
                clusterElem = clusters.labels[i];
                for (var nElem in clusterElem) { //for element in the current cluster
                    //UPDATE THE CONTENT (REORDER THE DATA MATRIX)
                    originalElem = originalData[clusterElem[nElem]];
                    for (var j in originalElem.data) {
                        originalElem.data[j].y = yPos;
                    }

                    newYaxis.push(oldAxis[clusterElem[nElem]]);
                    yPos++;
                }
            }
            //STEP 2.3 UPDATE THE ORIGINAL DATA
            options.yAxis.categories = newYaxis;
            options.clusterize.clusters = clusters.labels;
        } else if (algorithm === "hierarchical") {
            //STEP 2.1 CALCULATE CLUSTERS
            //This function returns an object with 2 important properties: left and right,
            //i.e. a binary tree. Each node in the tree contains the corresponding left and
            //right child. The elements of the input vector are always at leaves nodes which
            //contains an attribute "label" that, in our case, stores the position of the
            //element at the input vector. E.g.
            //            {label:"1", left:null, right:null}
            //            /
            //           /     {label:"25", left:null, right:null}
            //       node     /
            //      /    \node      ...
            // root           \    /
            //      \...       node
            //                     \...
            var root, newYaxis = [], dendogramData = {};

            var reorder = true;
            if (dendogram.reorder !== undefined) {
                reorder = dendogram.reorder;
            }

            root = clusterfck.hcluster(positions, clusters, {reorder: reorder, distance: distance, linkage: linkage});

            //STEP 2.1 COLLAPSE THE TREE INTO AN ARRAY AND GENERATE THE DENDOGRAM STRUCTURE
            var collapseTree = function (node, newYaxis, dendogram, depth) {
                if (!node) {
                    return depth;
                } else if (node.left === undefined && node.right === undefined) {
                    var originalElem = originalData[node.label]; //Get the original serie
                    for (var j in originalElem.data) {
                        originalElem.data[j].y = newYaxis.length; //Update the y coordinate
                    }
                    newYaxis.push(oldAxis[node.label]); //Update the yAxis

                    dendogram.right = null;
                    dendogram.left = null;
                    return depth + 1;
                }
                dendogram.right = {};
                dendogram.left = {};

                var depthLeft = collapseTree(node.left, newYaxis, dendogram.left, depth + 1);
                var depthRight = collapseTree(node.right, newYaxis, dendogram.right, depth + 1);

                return Math.max(depthRight, depthLeft);
            };

            var maxDepth = collapseTree(root, newYaxis, dendogramData, 0);

            //STEP 2.3 UPDATE THE ORIGINAL DATA
            if (dendogram) {
                dendogram.depth = maxDepth;
                dendogram.data = dendogramData;
            }
            options.yAxis.categories = newYaxis;
            options.clusterize.dendogram = dendogram;
        }

        proceed.apply(this, Array.prototype.slice.call(arguments, 1));
    });

    H.wrap(H.Chart.prototype, 'render', function (proceed) {
        // If not data for clusterize or not a Heatmap chart or not dendogram option, apply the original
        // function with the original arguments, which are sliced off this function's arguments
        if (!this.xAxis || !this.options.clusterize || (!this.options.clusterize.dendogram && !this.options.clusterize.clusters) || this.series.length < 3) {
            proceed.apply(this, Array.prototype.slice.call(arguments, 1));
            return;
        }

        //IF THE HEATMAP WAS ORDERED BY K-MEANS
        if (this.options.clusterize.clusters) {
            //STEP 0. ADAPT THE CHART SIZE AND DRAW
            this.chartWidth = this.chartWidth - 20;
            proceed.apply(this, Array.prototype.slice.call(arguments, 1));

            //*********************************************************************************
            //STEP 1. READ SETTINGS AND VARIABLE DECLARATION
            var renderer = this.renderer;
            var serie = this.series[0];
            var axis = serie.xAxis;

            //CALCULATE THE HEIGHT FOR EACH NODE (HEIGHT OF THE yAxis / number of series)
            var levelHeight = serie.yAxis.height / serie.yAxis.categories.length;
            //GET THE COORDINATES FOR FIRST ELEMENT IN THE SERIE, WE WILL START DRAWING HERE
            var initialX = axis.pos + axis.len + 8; //SAME FOR ALL CLUSTERS
            var initialY = axis.top;

            var nClusters = this.options.clusterize.clusters.length;

            //GET K DIFFERENT COLORS
            var colors = randomColor({hue: 'random',luminosity: 'random', count: nClusters});

            //STEP 2. DRAW THE COLOR CLASSIFICATION
            var drawClusterGroups = function (clusterNumber, x, y, length, color) {
                var newY = y + length;
                var path = [
                    'M', x, y,
                    'L', x, newY,
                    'Z'];

                renderer.path(path).attr({
                    'stroke': color || '#C0C0C0',
                    'stroke-width': 3,
                    'dashstyle': 'solid'
                }).add();

                renderer.label(clusterNumber, x + 5, y + length / 2 - 10)
                        .css({
                            color: color,
                            fontSize: '10px'
                        })
                        .add();

                return newY;
            };

            for (var i = nClusters; i--; ) {
                initialY = drawClusterGroups(i + 1, initialX, initialY, this.options.clusterize.clusters[i].length * levelHeight, colors[i]);
            }

            delete this.options.clusterize.clusters;
        } else { //IF THE HEATMAP WAS ORDERED BY HIERARCHICAL
            /*
             * DENDOGRAM OPTIONS (http://en.wikipedia.org/wiki/Dendrogram)
             * [only for hierarchical clustering] An object containing the dendogram settings.
             * Valid dendogram options are:
             *  - width:        width for the dendongram. Note that this size will be taken from the total size
             of the chart container.  [default = 150px]
             *  - color:        color line for the dendogram [default = #C0C0C0]
             *  - lineWidth:    thick of line for the dendogram [default = 1px]
             *
             */

            //*********************************************************************************
            //STEP 0. ADAPT THE CHART SIZE AND DRAW
            var options = this.options.clusterize.dendogram;
            this.chartWidth = this.chartWidth - (options.width || 150);
            proceed.apply(this, Array.prototype.slice.call(arguments, 1));

            //*********************************************************************************
            //STEP 1. READ SETTINGS AND VARIABLE DECLARATION
            var renderer = this.renderer;
            var serie = this.series[0];
            var axis = serie.xAxis;

            //CALCULATE THE WIDTH FOR EACH LEVEL (SAVED SPACE / LEVELS IN THE TREE)
            options["levelWidth"] = (options.width || 150) / options.depth;
            //CALCULATE THE HEIGHT FOR EACH NODE (HEIGHT OF THE yAxis / number of series)
            options["levelHeight"] = serie.yAxis.height / serie.yAxis.categories.length;
            //
            //                       LEVEL WIDTH
            //                            |
            //                          __|__
            //                         |     |
            //                         v     v
            //                ···>  elem ----
            // LEVEL HEIGHT···|              |---
            //                ···>  elem ----    |_ ...
            //                                   |
            //                      elem --------
            //

            //GET THE COORDINATES FOR FIRST ELEMENT IN THE SERIE, WE WILL START DRAWING HERE
            options["initialX"] = axis.pos + axis.len; //SAME FOR ALL LEAVES
            options["initialY"] = axis.top + serie.points[0].shapeArgs.height / 2;
            options["featureNumber"] = 0;

            //*********************************************************************************
            //STEP 2. DRAW THE DENDOGRAM
            var drawDendogram = function (node, level, options) {
                //IF node IS A LEAF
                if (node.right === null && node.left === null) {
                    //RECALCULATE Y COORDINATE
                    var y = options.initialY + options.levelHeight * options.featureNumber;
                    //CALCULATE THE LENGTH FOR THE LINE
                    var width = level * options.levelWidth;
                    //SVG PATH
                    var path = [
                        'M', options.initialX, y, //MOVE TO INITIAL POSITION
                        'L', options.initialX + width, y, //DRAW A LINE
                        'Z'];                            //END

                    renderer.path(path).attr({
                        'stroke': options.color || '#C0C0C0',
                        'stroke-width': options.lineWidth || 1,
                        'dashstyle': options.dashStyle || 'solid'
                    }).add();

                    options.featureNumber++; //COUNT THE NUMBER OF DRAWN FEATURES (NECESSARY TO CALCULATE Y)
                    return y;
                }

                var yLeft = drawDendogram(node.right, level - 1, options);//DRAW LEFT CHILD
                var yRight = drawDendogram(node.left, level - 1, options);//DRAW RIGHT CHILD

                var x = options.initialX + (level - 1) * options.levelWidth;
                var middleY = yRight - (yRight - yLeft) / 2;

                //DRAW THE INTERMEDIATE NODES
                //            |           |
                //            V           V
                // leaf ------
                //            |-------------
                // leaf ------
                var path = [
                    'M', x, yRight,
                    'L', x, yLeft,
                    'M', x, middleY,
                    'L', x + options.levelWidth, middleY,
                    'Z'];

                renderer.path(path).attr({
                    'stroke': options.color || '#C0C0C0',
                    'stroke-width': options.lineWidth || 1,
                    'dashstyle': options.dashStyle || 'solid'
                }).add();

                return middleY;
            };
            drawDendogram(options.data, options.depth + 1, options);

            delete options["initialX"];
            delete options["initialY"];
            delete options["levelHeight"];
            delete options["levelWidth"];
            delete options["dendogram"];
        }

    });
}
)(Highcharts);



/**
 * @class Ext.dom.Element
 */
Ext.dom.Element.override((function () {
    return {
        /**
         * Returns the offset height of the element
         * @param {Boolean} [contentHeight] true to get the height minus borders and padding
         * @return {Number} The element's height
         */
        getHeight: function (contentHeight) {
            var dom = this.dom,
                    height = (contentHeight ? (dom.clientHeight - this.getPadding("tb")) : dom.offsetHeight);
            return (height && height > 0) ? height : 0;
        },
        /**
         * Returns the offset width of the element
         * @param {Boolean} [contentWidth] true to get the width minus borders and padding
         * @return {Number} The element's width
         */
        getWidth: function (contentWidth) {
            var dom = this.dom,
                    width = (contentWidth ? (dom.clientWidth - this.getPadding("lr")) : dom.offsetWidth);
            return (width && width > 0) ? width : 0;
        }
    };
}()));

/**
 * @class Ext.dom.Element
 */
Ext.define('Ext.slider.MultiCustom', {
    // extend: 'Ext.form.FieldContainer',
    extend: 'Ext.panel.Panel',
    alias: 'widget.multicustomslider',
    layout:  {
      type: 'hbox',
      align: 'stretch',
      pack: 'center'
    },

    style: 'margin: 10px auto;',

    config: {
      // dataCallback: null,
      // dataOmic: null,
      // dataValues: null,
      minValue: 0,
      maxValue: 0,
      customValues: [0, 0]
      // idMinValue: null,
      // idMaxValue: null
    },

    initComponent: function() {

      var me = this;

      // Force the values to be integers
      // TODO: remove this limitation in the future?
      me.minValue = Math.round(me.minValue);
      me.maxValue = Math.round(me.maxValue);
      me.customValues = [Math.round(me.customValues[0]), Math.round(me.customValues[1])];

      //
      me.idMinValue =

      this.items = [
          {
            xtype: 'hiddenfield',
            id: me.id + "_customMinValue",
            name: me.id + "_customMinValue",
            value: me.customValues[0]
          },
          {
            xtype: 'hiddenfield',
            id: me.id + "_customMaxValue",
            name: me.id + "_customMaxValue",
            value: me.customValues[1]
          },
          {
              xtype: 'numberfield',
              // hideTrigger: true,
              // flex: 0.25,
              // style: 'margin-right:10px',
              width: 50,
              name: 'minvalue',
              // cls: 'unstyled',
              value: this.customValues[0],
              minValue: this.minValue,
              maxValue: this.customValues[1],
              hideLabel: true,
              listeners: {
                  change: function(numberField, newValue, oldValue, eOpts){
                      this.up('panel').down("numberfield[name=maxvalue]").setMinValue(newValue);
                      this.up('panel').down('multislider').setValue(0, newValue);
                  }
              }
          },
          {
              xtype: 'multislider',
              flex: 1,
              values: this.customValues,
              minValue: this.minValue,
              maxValue: this.maxValue,
              hideLabel: true,
              listeners: {
                  change: function(slider, newValue, thumb, eOpts){
                      var newValues = slider.getValues();

                      // Update min/max values
                      this.up('panel').down('numberfield[name=maxvalue]').setValue(newValues[1]);
                      this.up('panel').down('numberfield[name=minvalue]').setValue(newValues[0]);

                      this.up('panel').down('hiddenfield[name="' + me.id + "_customMinValue" + '"]').setValue(newValues[0]);
                      this.up('panel').down('hiddenfield[name="' + me.id + "_customMaxValue" + '"]').setValue(newValues[1]);

                      // me.dataValues.splice(11, 2, ...newValues);

                      // Callback must point to setDataDistributionSummaries(newDistribution, omicName)
                      // me.dataCallback(me.dataValues, me.dataOmic);
                  }
              }
          },
          {
              xtype: 'numberfield',
              // hideTrigger: true,
              // flex: 0.25,
              // style: 'margin-left:10px',
              width: 50,
              name: 'maxvalue',
              // cls: 'unstyled',
              value: this.customValues[1],
              minValue: this.customValues[0],
              maxValue: this.maxValue,
              listeners: {
                  change: function(numberField, newValue, oldValue, eOpts){
                    this.up('panel').down("numberfield[name=minvalue]").setMaxValue(newValue);
                    this.up('panel').down('multislider').setValue(1, newValue);
                  }
              }
          }
      ];

      this.callParent(arguments);
    },

    getValues: function() {
        return [
          parseInt(this.down('hiddenfield[name="' + this.id + "_customMinValue" + '"]').getValue()),
          parseInt(this.down('hiddenfield[name="' + this.id + "_customMaxValue" + '"]').getValue())
        ];
    },


});
