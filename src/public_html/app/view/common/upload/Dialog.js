Ext.define("Ext.upload.Dialog",{extend:"Ext.window.Window",width:700,height:500,border:0,config:{dialogTitle:"",synchronous:true,uploadUrl:"",uploadParams:{},uploadExtraHeaders:{},uploadTimeout:6e4,textClose:"Close"},constructor:function(config){this.initConfig(config);return this.callParent(arguments)},initComponent:function(){this.addEvents({uploadcomplete:true});if(!Ext.isObject(this.panel)){this.panel=Ext.create("Ext.upload.Panel",{synchronous:this.synchronous,uploadUrl:this.uploadUrl,uploadParams:this.uploadParams,uploadExtraHeaders:this.uploadExtraHeaders,uploadTimeout:this.uploadTimeout})}this.relayEvents(this.panel,["uploadcomplete"]);Ext.apply(this,{title:this.dialogTitle,layout:"fit",items:[this.panel],dockedItems:[{xtype:"toolbar",dock:"bottom",ui:"footer",defaults:{minWidth:this.minButtonWidth},items:["->",{text:this.textClose,cls:"x-btn-text-icon",scope:this,handler:function(){this.close()}}]}]});this.callParent(arguments)}});