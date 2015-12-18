///**
// * The main upload panel, which ties all the functionality together.
// *
// * In the most basic case you need just to set the upload URL:
// *
// *     @example
// *     var uploadPanel = Ext.create('Ext.upload.Panel', {
// *         uploaderOptions: {
// *             url: '/api/upload'
// *         }
// *     });
// *
// * It uses the default ExtJsUploader to perform the actual upload. If you want to use another uploade, for
// * example the FormDataUploader, you can pass the name of the class:
// *
// *     @example
// *     var uploadPanel = Ext.create('Ext.upload.Panel', {
// *         uploader: 'Ext.upload.uploader.FormDataUploader',
// *         uploaderOptions: {
// *             url: '/api/upload',
// *             timeout: 120*1000
// *         }
// *     });
// *
// * Or event an instance of the uploader:
// *
// *     @example
// *     var formDataUploader = Ext.create('Ext.upload.uploader.FormDataUploader', {
// *         url: '/api/upload'
// *     });
// *
// *     var uploadPanel = Ext.create('Ext.upload.Panel', {
// *         uploader: formDataUploader
// *     });
// *
// */

Ext.Loader.setPath('Ext.upload', 'app/view/common/upload');

Ext.define('Ext.upload.Panel', {
    extend: 'Ext.panel.Panel',
    requires: ['Ext.upload.Manager'],
    config: {
        // button strings
        textUpload: '<span style="color:white"><i class="fa fa-upload"></i> Upload</span>',
        textBrowse: ' <span style="color:white"><i class="fa fa-search"></i> Browse</span>',
        textAbort: '<span style="color:white"><i class="fa fa-times"></i> Abort</span>',
        textRemoveSelected: '<span style="color:white"><i class="fa fa-trash-o"></i> Remove selected</span>',
        textRemoveAll: '<span style="color:white"><i class="fa fa-trash-o"></i> Remove all</span>',
        // grid strings
        textFilename: 'Filename',
        textSize: 'Size',
        textType: 'Type',
        textStatus: 'Status',
        textProgress: '<i class="fa fa-upload"></i>',
        // status toolbar strings
        selectionMessageText: 'Selected {0} file(s), {1}',
        uploadMessageText: 'Upload progress {0}% ({1} of {2} file(s))',
        /**
         * @cfg {Object/String}
         *
         * The name of the uploader class or the uploader object itself. If not set, the default uploader will
         * be used.
         */
        uploader: null,
        /**
         * @cfg {Object}
         *
         * Configuration object for the uploader. Configuration options included in this object override the
         * options 'uploadUrl', 'uploadParams', 'uploadExtraHeaders', 'uploadTimeout'.
         */
        uploaderOptions: null,
        /**
         * @cfg {boolean} [synchronous=false]
         *
         * If true, all files are uploaded in a sequence, otherwise files are uploaded simultaneously (asynchronously).
         */
        synchronous: true,
        /**
         * @cfg {String} uploadUrl
         *
         * The URL to upload files to. Not required if configured uploader instance is passed to this panel.
         */
        uploadUrl: '',
        /**
         * @cfg {Object}
         *
         * Params passed to the uploader object and sent along with the request. It depends on the implementation of the
         * uploader object, for example if the {@link Ext.upload.uploader.ExtJsUploader} is used, the params are sent
         * as GET params.
         */
        uploadParams: {},
        /**
         * @cfg {Object}
         *
         * Extra HTTP headers to be added to the HTTP request uploading the file.
         */
        uploadExtraHeaders: {},
        /**
         * @cfg {Number} [uploadTimeout=6000]
         *
         * The time after the upload request times out - in miliseconds.
         */
        uploadTimeout: 60000,
        /**
         * @cfg {Object/String}
         *
         * Encoder object/class used to encode the filename header. Usually used, when the filename
         * contains non-ASCII characters. If an encoder is used, the server backend has to be
         * modified accordingly to decode the value.
         */
        filenameEncoder: null,
    },
    /**
     * @property {Ext.upload.Queue}
     * @private
     */
    queue: null,
    /**
     * @property {Ext.upload.ItemGridPanel}
     * @private
     */
    grid: null,
    /**
     * @property {Ext.upload.Manager}
     * @private
     */
    uploadManager: null,
    /**
     * @property {Ext.upload.StatusBar}
     * @private
     */
    statusBar: null,
    /**
     * @property {Ext.upload.BrowseButton}
     * @private
     */
    browseButton: null,
    /**
     * Constructor.
     */
    constructor: function (config) {
        this.initConfig(config);
        return this.callParent(arguments);
    },
    /**
     * @private
     */
    initComponent: function () {
        this.addEvents({
            /**
             * @event
             *
             * Fired when all files has been processed.
             *
             * @param {Ext.upload.Panel} panel
             * @param {Ext.upload.Manager} manager
             * @param {Ext.upload.Item[]} items
             * @param {number} errorCount
             */
            'uploadcomplete': true
        });
        this.queue = this.initQueue();
        this.grid = Ext.create('Ext.upload.ItemGridPanel', {
            queue: this.queue,
            textFilename: this.textFilename,
            textSize: this.textSize,
            textType: this.textType,
            textStatus: this.textStatus,
            textProgress: this.textProgress
        });

        this.uploadManager = this.createUploadManager();
        this.uploadManager.on('uploadcomplete', this.onUploadComplete, this);
        this.uploadManager.on('itemuploadsuccess', this.onItemUploadSuccess, this);
        this.uploadManager.on('itemuploadfailure', this.onItemUploadFailure, this);
        this.statusBar = Ext.create('Ext.upload.StatusBar', {
            dock: 'bottom',
            selectionMessageText: this.selectionMessageText,
            uploadMessageText: this.uploadMessageText
        });


        Ext.apply(this, {
            title: this.dialogTitle,
            autoScroll: true,
            layout: 'fit',
            border: 0,
            bodyBorder: 0,
            uploading: false,
            items: [this.grid],
            dockedItems: [
                this.getTopToolbarConfig(), this.statusBar
            ]
        });
        this.on('afterrender', function () {
            this.stateInit();
        }, this);
        this.callParent(arguments);
    },
    createUploadManager: function () {
        var uploaderOptions = this.getUploaderOptions() || {};
        Ext.applyIf(uploaderOptions, {
            url: this.uploadUrl,
            params: this.uploadParams,
            extraHeaders: this.uploadExtraHeaders,
            timeout: this.uploadTimeout
        });
        var uploadManager = Ext.create('Ext.upload.Manager', {
            uploader: this.uploader,
            uploaderOptions: uploaderOptions,
            synchronous: this.getSynchronous(),
            filenameEncoder: this.getFilenameEncoder()
        });
        return uploadManager;
    },
    /**
     * @private
     *
     * Returns the config object for the top toolbar.
     *
     * @return {Array}
     */
    getTopToolbarConfig: function () {
        this.browseButton = Ext.create('Ext.upload.BrowseButton', {
            itemId: 'button_browse',
            buttonText: this.textBrowse
        });
        this.browseButton.on('fileselected', this.onFileSelection, this);

        return {
            xtype: 'toolbar',
            itemId: 'topToolbar',
            dock: 'top',
            items: [
                this.browseButton,
                '-',
                {
                    itemId: 'button_upload',
                    text: this.textUpload,
                    style: "background-image: none; background-color:#5CB85C;",
                    scope: this,
                    handler: this.onInitUpload
                },
                '-',
                {
                    itemId: 'button_abort',
                    text: this.textAbort,
                    style: "background-image: none; background-color:#dd4744;",
                    scope: this,
                    handler: this.onAbortUpload,
                    disabled: true
                },
                '->',
                {
                    itemId: 'button_remove_selected',
                    text: this.textRemoveSelected,
                    style: "background-image: none; background-color:#dd4744;",
                    scope: this,
                    handler: this.onMultipleRemove
                },
                '-',
                {
                    itemId: 'button_remove_all',
                    text: this.textRemoveAll,
                    style: "background-image: none; background-color:#dd4744;",
                    scope: this,
                    handler: this.onRemoveAll
                }
            ]
        }
    },
    /**
     * @private
     *
     * Initializes and returns the queue object.
     *
     * @return {Ext.upload.Queue}
     */
    initQueue: function () {
        var queue = Ext.create('Ext.upload.Queue');
        queue.on('queuechange', this.onQueueChange, this);
        return queue;
    },
    onInitUpload: function () {
        if (!this.queue.getCount()) {
            return;
        }
        //CODE ADDED BY RAFA
        var store = this.grid.getStore();
        if (store.findExact("omicType", "") != -1 || store.findExact("dataType", "") != -1) {
            var me = this;
            var view = this.grid.getView();
            var columnLength = this.grid.columns.length;
            store.each(function (record, idx) {
                for (var i = 1; i < columnLength; i++) {
                    var cell = view.getCellByPosition({row: idx, column: i});
                    cell.removeCls("invalid-cell");
                    cell.set({'data-errorqtip': ''});

                    var fieldName = me.grid.columns[i - 1].dataIndex;
                    if (fieldName === 'omicType' || fieldName === 'dataType') {
                        if (record.get(fieldName) === "") {
                            cell.addCls("invalid-cell");
                            cell.set({'data-errorqtip': 'Your error message qtip'});
                        }
                    }
                }
            });
            return;
        }

        this.stateUpload();
        this.startUpload();
    },
    onAbortUpload: function () {
        this.uploadManager.abortUpload();
        this.finishUpload();
        this.switchState();
    },
    onUploadComplete: function (manager, queue, errorCount) {
        this.finishUpload();
        if (errorCount) {
            this.stateQueue();
        } else {
            this.stateInit();
        }
        this.fireEvent('uploadcomplete', this, manager, queue.getUploadedItems(), errorCount);
        manager.resetUpload();
    },
    /**
     * @private
     *
     * Executes after files has been selected for upload through the "Browse" button. Updates the upload queue with the
     * new files.
     *
     * @param {Ext.upload.BrowseButton} input
     * @param {FileList} files
     */
    onFileSelection: function (input, files) {
        this.queue.clearUploadedItems();
        this.queue.addFiles(files);
        this.browseButton.reset();
    },
    /**
     * @private
     *
     * Executes if there is a change in the queue. Updates the related components (grid, toolbar).
     *
     * @param {Ext.upload.Queue} queue
     */
    onQueueChange: function (queue) {
        this.updateStatusBar();
        this.switchState();
    },
    /**
     * @private
     *
     * Executes upon hitting the "multiple remove" button. Removes all selected items from the queue.
     */
    onMultipleRemove: function () {
        var records = this.grid.getSelectedRecords();
        if (!records.length) {
            return;
        }

        var keys = [];
        var i;
        var num = records.length;
        for (i = 0; i < num; i++) {
            keys.push(records[i].get('filename'));
        }

        this.queue.removeItemsByKey(keys);
    },
    onRemoveAll: function () {
        this.queue.clearItems();
    },
    onItemUploadSuccess: function (manager, item, info) {

    },
    onItemUploadFailure: function (manager, item, info) {

    },
    startUpload: function () {
        this.uploading = true;
        this.uploadManager.uploadQueue(this.queue);
    },
    finishUpload: function () {
        this.uploading = false;
    },
    isUploadActive: function () {
        return this.uploading;
    },
    updateStatusBar: function () {
        if (!this.statusBar) {
            return;
        }

        var numFiles = this.queue.getCount();
        this.statusBar.setSelectionMessage(this.queue.getCount(), this.queue.getTotalBytes());
    },
    getButton: function (itemId) {
        var topToolbar = this.getDockedComponent('topToolbar');
        if (topToolbar) {
            return topToolbar.getComponent(itemId);
        }
        return null;
    },
    switchButtons: function (info) {
        var itemId;
        for (itemId in info) {
            this.switchButton(itemId, info[itemId]);
        }
    },
    switchButton: function (itemId, on) {
        var button = this.getButton(itemId);
        if (button) {
            if (on) {
                button.enable();
            } else {
                button.disable();
            }
        }
    },
    switchState: function () {
        if (this.uploading) {
            this.stateUpload();
        } else if (this.queue.getCount()) {
            this.stateQueue();
        } else {
            this.stateInit();
        }
    },
    stateInit: function () {
        this.switchButtons({
            'button_browse': 1,
            'button_upload': 0,
            'button_abort': 0,
            'button_remove_all': 1,
            'button_remove_selected': 1
        });
    },
    stateQueue: function () {
        this.switchButtons({
            'button_browse': 1,
            'button_upload': 1,
            'button_abort': 0,
            'button_remove_all': 1,
            'button_remove_selected': 1
        });
    },
    stateUpload: function () {
        this.switchButtons({
            'button_browse': 0,
            'button_upload': 0,
            'button_abort': 1,
            'button_remove_all': 1,
            'button_remove_selected': 1
        });
    }

});
/**
 * A "browse" button for selecting multiple files for upload.
 *
 */
Ext.define('Ext.upload.BrowseButton', {
    extend: 'Ext.form.field.File',
    buttonOnly: true,
    buttonText: 'Browse...',
    initComponent: function () {
        this.addEvents({
            'fileselected': true
        });
        Ext.apply(this, {
            buttonConfig: {
                style: "background-image: none; background-color:#17A8EB;",
            }
        });
        this.on('afterrender', function () {
            /*
             * Fixing the issue when adding an icon to the button - the text does not render properly. OBSOLETE - from
             * ExtJS v4.1 the internal implementation has changed, there is no button object anymore.
             */
            /*
             */

            // Allow picking multiple files at once.
            this.setMultipleInputAttribute();
        }, this);
        this.on('change', function (field, value, options) {
            var files = this.fileInputEl.dom.files;
            if (files) {
                this.fireEvent('fileselected', this, files);
            }
        }, this);
        this.callParent(arguments);
    },
    reset: function () {
        this.callParent(arguments);
        this.setMultipleInputAttribute();
    },
    setMultipleInputAttribute: function (inputEl) {
        inputEl = inputEl || this.fileInputEl;
        inputEl.dom.setAttribute('multiple', '1');
    }
});
/**
 * The grid displaying the list of uploaded files (queue).
 *
 * @class Ext.upload.ItemGridPanel
 * @extends Ext.grid.Panel
 */
Ext.define('Ext.upload.ItemGridPanel', {
    extend: 'Ext.grid.Panel',
    requires: ['Ext.selection.CheckboxModel'],
    layout: 'fit',
    border: 0,
    viewConfig: {scrollOffset: 40},
    config: {
        queue: null,
        //CODE ADDED BY RAFA
        textFilename: 'Filename',
        textSize: 'Size',
        textDataType: 'Data type',
        textOmicType: 'Omic type',
        textDescription: 'Description',
        textType: 'File format',
        textStatus: 'Status',
        textProgress: '%'
    },
    constructor: function (config) {
        this.initConfig(config);
        return this.callParent(arguments);
    },
    initComponent: function () {
        // CODE ADDED BY RAFA
        var me = this;

        //CODE ADDED BY RAFA
        var omicTypeCombo = new Ext.form.ComboBox({
            valueField: "name", displayField: "name",
            allowBlank: false, queryMode: 'local',
            store: new Ext.data.SimpleStore({
                fields: ['name'],
                autoLoad: true,
                proxy: {
                    type: 'ajax',
                    url: 'resources/data/all_omics.json',
                    reader: {type: 'json',root: 'omics', successProperty: 'success'}
                }
            }),
            listeners: {
                change: function (combo, newValue, oldValue) {
                    var selectedItem = combo.up("grid").getSelectionModel().getSelection()[0];
                    selectedItem.set("omicType", newValue);
                    me.queue.getByKey(selectedItem.get("filename")).omicType = newValue;
                }
            }
        });

        var datatypeCombo = new Ext.form.ComboBox({
            valueField: "name", displayField: "name",
            allowBlank: false, queryMode: 'local',
            store: new Ext.data.SimpleStore({
                fields: ['name'],
                autoLoad: true,
                proxy: {
                    type: 'ajax',
                    url: 'resources/data/file_types.json',
                    reader: {type: 'json', root: 'types', successProperty: 'success'}
                }
            }),
            listeners: {
                change: function (combo, newValue, oldValue) {
                    var selectedItem = combo.up("grid").getSelectionModel().getSelection()[0];
                    selectedItem.set("dataType", newValue);
                    me.queue.getByKey(selectedItem.get("filename")).dataType = newValue;

                    if(newValue === "Gene expression quantification" || newValue === "Relevant genes list"){
                        selectedItem.set("omicType", "Gene expression");
                        me.queue.getByKey(selectedItem.get("filename")).omicType = "Gene expression";
                    }else if(newValue === "Metabolomics quatification" || newValue === "Relevant compounds list"){
                        selectedItem.set("omicType", "Metabolomics");
                        me.queue.getByKey(selectedItem.get("filename")).omicType = "Metabolomics";
                    }else if(newValue === "Proteomics quatification" || newValue === "Relevant proteins list"){
                        selectedItem.set("omicType", "Proteomics");
                        me.queue.getByKey(selectedItem.get("filename")).omicType = "Proteomics";
                    }
                }
            }
        });

        //CODE ADDED BY RAFA
        var descriptionField = new Ext.form.field.Text({
            value:"",
            listeners: {
                change: function (field, newValue, oldValue) {
                    var selectedItem = field.up("grid").getSelectionModel().getSelection()[0];
                    selectedItem.set("description", newValue);
                    me.queue.getByKey(selectedItem.get("filename")).description = newValue;
                }
            }
        });

        if (this.queue) {
            this.queue.on('queuechange', this.onQueueChange, this);
            this.queue.on('itemchangestatus', this.onQueueItemChangeStatus, this);
            this.queue.on('itemprogressupdate', this.onQueueItemProgressUpdate, this);
        }

        Ext.apply(this, {
            store: Ext.create('Ext.upload.Store'),
            selModel: Ext.create('Ext.selection.CheckboxModel', {
                checkOnly: true
            }),
            plugins: [Ext.create('Ext.grid.plugin.CellEditing', {clicksToEdit: 1})],
            columns: [
                //CODE ADDED BY RAFA
                {dataIndex: 'filename', header: this.textFilename, width: 300},
                {dataIndex: 'dataType', header: this.textDataType, width: 200, editor: datatypeCombo, allowBlank: false},
                {dataIndex: 'omicType', header: this.textOmicType, width: 150, editor: omicTypeCombo, allowBlank: false},
                {dataIndex: 'description', header: this.textDescription, flex: 1, editor: descriptionField},
                {dataIndex: 'size', header: this.textSize, width: 100,
                    renderer: function (value) {
                        return Ext.util.Format.fileSize(value);
                    }
                },
                {dataIndex: 'type', header: this.textType, width: 150},
                {dataIndex: 'status', header: this.textStatus, width: 60, align: 'right', renderer: this.statusRenderer},
                {dataIndex: 'progress', header: this.textProgress, width: 60, align: 'right',
                    renderer: function (value) {
                        if (!value) {
                            value = 0;
                        }
                        return value + '%';
                    }
                },
                {dataIndex: 'message', width: 1, hidden: true}
            ]
        });
        this.callParent(arguments);
    },
    onQueueChange: function (queue) {
        this.loadQueueItems(queue.getItems());
    },
    onQueueItemChangeStatus: function (queue, item, status) {
        this.updateStatus(item);
    },
    onQueueItemProgressUpdate: function (queue, item) {
        this.updateStatus(item);
    },
    /**
     * Loads the internal store with the supplied queue items.
     *
     * @param {Array} items
     */
    loadQueueItems: function (items) {
        var data = [];
        var i;
        for (i = 0; i < items.length; i++) {
            data.push([
                //CODE ADDED BY RAFA
                items[i].getFilename(),
                items[i].getDataType(),
                items[i].getOmicType(),
                (items[i].getDescription()|| ""),
                items[i].getSize(),
                this.getType(items[i].getFilename(), items[i].getType()),
                items[i].getStatus(),
                items[i].getProgressPercent()
            ]);
        }

        this.loadStoreData(data);
    },
    knowExtension: {
        "tab": "Tab file",
        "txt": "Text file",
        "bed": "BED file",
        "gtf": "GTF file",
    },
    getType: function (fileName, fileType) {
        var extension = fileName.split('.').pop().toLowerCase();
        if (fileType === "" || this.knowExtension[extension] !== undefined) {
            fileType = (this.knowExtension[extension] !== undefined) ? this.knowExtension[extension] : "";
        }
        return fileType;
    },
    loadStoreData: function (data, append) {
        this.store.loadData(data, append);
    },
    getSelectedRecords: function () {
        return this.getSelectionModel().getSelection();
    },
    updateStatus: function (item) {
        var record = this.getRecordByFilename(item.getFilename());
        if (!record) {
            return;
        }

        var itemStatus = item.getStatus();
        // debug.log('[' + item.getStatus() + '] [' + record.get('status') + ']');
        if (itemStatus != record.get('status')) {
            this.scrollIntoView(record);
            record.set('status', item.getStatus());
            if (item.isUploadError()) {
                record.set('tooltip', item.getUploadErrorMessage());
            }
        }

        record.set('progress', item.getProgressPercent());
        record.commit();
    },
    getRecordByFilename: function (filename) {
        var index = this.store.findExact('filename', filename);
        if (-1 == index) {
            return null;
        }

        return this.store.getAt(index);
    },
    getIndexByRecord: function (record) {
        return this.store.findExact('filename', record.get('filename'));
    },
    statusRenderer: function (value, metaData, record, rowIndex, colIndex, store) {
        if (value === 'ready') {
            value = '<span style="color:#a8a8a8;display: block;text-align: center;" data-qtip="' + value + '"><i class="fa fa-clock-o"></i></span>';
        } else if (value === 'uploading') {
            value = '<span style="color:#333;display: block;text-align: center;" data-qtip="' + value + '"><i class="fa fa-spinner fa-pulse"></i></span>';
        } else if (value === 'uploaded') {
            value = '<span style="color:#5CB85C;display: block;text-align: center;" data-qtip="' + value + '"><i class="fa fa-check"></i></span>';
        } else if (value === 'uploaderror') {
            value = '<span style="color:#dd4744;display: block;text-align: center;" data-qtip="' + value + '"><i class="fa fa-times"></i></span>';
        } else {
            value = '<span style="color:#dd4744;display: block;text-align: center;" data-qtip="' + value + '"><i class="fa fa-question"></i></span>';
        }
        return value;
    },
    scrollIntoView: function (record) {
        var index = this.getIndexByRecord(record);
        if (-1 == index) {
            return;
        }

        this.getView().focusRow(index);
        return;
        var rowEl = Ext.get(this.getView().getRow(index));
        // var rowEl = this.getView().getRow(index);
        if (!rowEl) {
            return;
        }

        var gridEl = this.getEl();
        // debug.log(rowEl.dom);
        // debug.log(gridEl.getBottom());

        if (rowEl.getBottom() > gridEl.getBottom()) {
            rowEl.dom.scrollIntoView(gridEl);
        }
    }
});
Ext.define('Ext.upload.Store', {
    extend: 'Ext.data.Store',
    fields: [
        //CODE ADDED BY RAFA
        {name: 'filename', type: 'string'},
        {name: 'dataType', type: 'string'},
        {name: 'omicType', type: 'string'},
        {name: 'description', type: 'string', defaultValue:""},
        {name: 'size', type: 'integer'},
        {name: 'type', type: 'string'},
        {name: 'status', type: 'string'},
        {name: 'message', type: 'string'}
    ],
    proxy: {
        type: 'memory',
        reader: {type: 'array',idProperty: 'filename'}
    }
});
/**
 * Upload status bar.
 *
 * @class Ext.upload.StatusBar
 * @extends Ext.toolbar.Toolbar
 */
Ext.define('Ext.upload.StatusBar', {
    extend: 'Ext.toolbar.Toolbar',
    config: {
        selectionMessageText: 'Selected {0} file(s), {1}',
        uploadMessageText: 'Upload progress {0}% ({1} of {2} file(s))',
        textComponentId: 'mu-status-text'
    },
    constructor: function (config) {
        this.initConfig(config);
        return this.callParent(arguments);
    },
    initComponent: function () {
        Ext.apply(this, {
            items: [
                {
                    xtype: 'tbtext',
                    itemId: this.textComponentId,
                    text: '&nbsp;'
                }
            ]
        });
        this.callParent(arguments);
    },
    setText: function (text) {
        this.getComponent(this.textComponentId).setText(text);
    },
    setSelectionMessage: function (fileCount, byteCount) {
        this.setText(Ext.String.format(this.selectionMessageText, fileCount, Ext.util.Format.fileSize(byteCount)));
    },
    setUploadMessage: function (progressPercent, uploadedFiles, totalFiles) {
        this.setText(Ext.String.format(this.uploadMessageText, progressPercent, uploadedFiles, totalFiles));
    }

});
/**
 * Data structure managing the upload file queue.
 *
 */
Ext.define('Ext.upload.Queue', {
    extend: 'Ext.util.MixedCollection',
//    requires: ['Ext.upload.Item'],
    /**
     * Constructor.
     *
     * @param {Object} config
     */
    constructor: function (config) {
        this.callParent(arguments);
        this.addEvents({
            multiadd: true,
            multiremove: true,
            queuechange: true,
            itemchangestatus: true,
            itemprogressupdate: true
        });
        this.on('clear', function () {
            this.fireEvent('queuechange', this);
        }, this);
    },
    /**
     * Adds files to the queue.
     *
     * @param {FileList} fileList
     */
    addFiles: function (fileList) {
        var i;
        var items = [];
        var num = fileList.length;
        if (!num) {
            return;
        }

        for (i = 0; i < num; i++) {
            items.push(this.createItem(fileList[i]));
        }

        this.addAll(items);
        this.fireEvent('multiadd', this, items);
        this.fireEvent('queuechange', this);
    },
    /**
     * Uploaded files are removed, the rest are set as ready.
     */
    reset: function () {
        this.clearUploadedItems();
        this.each(function (item) {
            item.reset();
        }, this);
    },
    /**
     * Returns all queued items.
     *
     * @return {Ext.upload.Item[]}
     */
    getItems: function () {
        return this.getRange();
    },
    /**
     * Returns an array of items by the specified status.
     *
     * @param {String/Array}
     * @return {Ext.upload.Item[]}
     */
    getItemsByStatus: function (status) {
        var itemsByStatus = [];
        this.each(function (item, index, items) {
            if (item.hasStatus(status)) {
                itemsByStatus.push(item);
            }
        });
        return itemsByStatus;
    },
    /**
     * Returns an array of items, that have already been uploaded.
     *
     * @return {Ext.upload.Item[]}
     */
    getUploadedItems: function () {
        return this.getItemsByStatus('uploaded');
    },
    /**
     * Returns an array of items, that have not been uploaded yet.
     *
     * @return {Ext.upload.Item[]}
     */
    getUploadingItems: function () {
        return this.getItemsByStatus([
            'ready', 'uploading'
        ]);
    },
    /**
     * Returns true, if there are items, that are currently being uploaded.
     *
     * @return {Boolean}
     */
    existUploadingItems: function () {
        return (this.getUploadingItems().length > 0);
    },
    /**
     * Returns the first "ready" item in the queue (with status STATUS_READY).
     *
     * @return {Ext.upload.Item/null}
     */
    getFirstReadyItem: function () {
        var items = this.getRange();
        var num = this.getCount();
        var i;
        for (i = 0; i < num; i++) {
            if (items[i].isReady()) {
                return items[i];
            }
        }

        return null;
    },
    //CODE ADDED BY RAFA
    findItemById: function (itemId) {
        return this.getByKey(itemId)
    },
    /**
     * Clears all items from the queue.
     */
    clearItems: function () {
        this.clear();
    },
    /**
     * Removes the items, which have been already uploaded, from the queue.
     */
    clearUploadedItems: function () {
        this.removeItems(this.getUploadedItems());
    },
    /**
     * Removes items from the queue.
     *
     * @param {Ext.upload.Item[]} items
     */
    removeItems: function (items) {
        var num = items.length;
        var i;
        if (!num) {
            return;
        }

        for (i = 0; i < num; i++) {
            this.remove(items[i]);
        }

        this.fireEvent('queuechange', this);
    },
    /**
     * Removes the items identified by the supplied array of keys.
     *
     * @param {Array} itemKeys
     */
    removeItemsByKey: function (itemKeys) {
        var i;
        var num = itemKeys.length;
        if (!num) {
            return;
        }

        for (i = 0; i < num; i++) {
            this.removeItemByKey(itemKeys[i]);
        }

        this.fireEvent('multiremove', this, itemKeys);
        this.fireEvent('queuechange', this);
    },
    /**
     * Removes a single item by its key.
     *
     * @param {String} key
     */
    removeItemByKey: function (key) {
        this.removeAtKey(key);
    },
    /**
     * Perform cleanup, after the upload has been aborted.
     */
    recoverAfterAbort: function () {
        this.each(function (item) {
            if (!item.isUploaded() && !item.isReady()) {
                item.reset();
            }
        });
    },
    /**
     * @private
     *
     * Initialize and return a new queue item for the corresponding File object.
     *
     * @param {File} file
     * @return {Ext.upload.Item}
     */
    createItem: function (file) {

        var item = Ext.create('Ext.upload.Item', {
            fileApiObject: file
        });
        item.on('changestatus', this.onItemChangeStatus, this);
        item.on('progressupdate', this.onItemProgressUpdate, this);
        return item;
    },
    /**
     * A getKey() implementation to determine the key of an item in the collection.
     *
     * @param {Ext.upload.Item} item
     * @return {String}
     */
    getKey: function (item) {
        return item.getId();
    },
    onItemChangeStatus: function (item, status) {
        this.fireEvent('itemchangestatus', this, item, status);
    },
    onItemProgressUpdate: function (item) {
        this.fireEvent('itemprogressupdate', this, item);
    },
    /**
     * Returns true, if the item is the last item in the queue.
     *
     * @param {Ext.upload.Item} item
     * @return {boolean}
     */
    isLast: function (item) {
        var lastItem = this.last();
        if (lastItem && item.getId() == lastItem.getId()) {
            return true;
        }

        return false;
    },
    /**
     * Returns total bytes of all files in the queue.
     *
     * @return {number}
     */
    getTotalBytes: function () {
        var bytes = 0;
        this.each(function (item, index, length) {
            bytes += item.getSize();
        }, this);
        return bytes;
    }
});
/**
 * A single item designated for upload.
 *
 * It is a simple object wrapping the native file API object.
 */
Ext.define('Ext.upload.Item', {
    mixins: {observable: 'Ext.util.Observable'},
    STATUS_READY: 'ready',
    STATUS_UPLOADING: 'uploading',
    STATUS_UPLOADED: 'uploaded',
    STATUS_UPLOAD_ERROR: 'uploaderror',
    progress: null,
    status: null,
    config: {
        /**
         * @cfg {Object} fileApiObject (required)
         *
         * A native file API object
         */
        fileApiObject: null,
        /**
         * @cfg {String}
         *
         * The upload error message associated with this file object
         */
        uploadErrorMessage: ''
    },
    constructor: function (config) {
        this.mixins.observable.constructor.call(this);
        this.addEvents({
            changestatus: true,
            progressupdate: true
        });
        this.initConfig(config);
        Ext.apply(this, {
            status: this.STATUS_READY,
            progress: 0
        });
    },
    reset: function () {
        this.uploadErrorMessage = '';
        this.setStatus(this.STATUS_READY);
        this.setProgress(0);
    },
    getFileApiObject: function () {
        return this.fileApiObject;
    },
    getId: function () {
        return this.getFilename();
    },
    //CODE ADDED BY RAFA
    getName: function () {
        return this.getProperty('name');
    },
    getOmicType: function () {
        return this.omicType;
    },
    getDataType: function () {
        return this.dataType;
    },
    getDescription: function () {
        return (this.description || "");
    },
    getFilename: function () {
        return this.getName();
    },
    getSize: function () {
        return this.getProperty('size');
    },
    getType: function () {
        return this.getProperty('type');
    },
    getProperty: function (propertyName) {
        if (this.fileApiObject) {
            return this.fileApiObject[propertyName];
        }
        return null;
    },
    getProgress: function () {
        return this.progress;
    },
    getProgressPercent: function () {
        var progress = this.getProgress();
        if (!progress) {
            return 0;
        }

        var percent = Ext.util.Format.number((progress / this.getSize()) * 100, '0');
        if (percent > 100) {
            percent = 100;
        }

        return percent;
    },
    setProgress: function (progress) {
        this.progress = progress;
        this.fireEvent('progressupdate', this);
    },
    getStatus: function () {
        return this.status;
    },
    setStatus: function (status) {
        this.status = status;
        this.fireEvent('changestatus', this, status);
    },
    hasStatus: function (status) {
        var itemStatus = this.getStatus();
        if (Ext.isArray(status) && Ext.Array.contains(status, itemStatus)) {
            return true;
        }

        if (itemStatus === status) {
            return true;
        }

        return false;
    },
    isReady: function () {
        return (this.status == this.STATUS_READY);
    },
    isUploaded: function () {
        return (this.status == this.STATUS_UPLOADED);
    },
    setUploaded: function () {
        this.setProgress(this.getSize());
        this.setStatus(this.STATUS_UPLOADED);
    },
    isUploadError: function () {
        return (this.status == this.STATUS_UPLOAD_ERROR);
    },
    getUploadErrorMessage: function () {
        return this.uploadErrorMessage;
    },
    setUploadError: function (message) {
        this.uploadErrorMessage = message;
        this.setStatus(this.STATUS_UPLOAD_ERROR);
    },
    setUploading: function () {
        this.setStatus(this.STATUS_UPLOADING);
    }
});
