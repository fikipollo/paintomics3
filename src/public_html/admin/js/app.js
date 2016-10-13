
SERVER_URL = "/";
SERVER_URL_DM_DELETE_GTF = SERVER_URL + "dm_delete_gtffile";
SERVER_URL_DM_ADD_GTF = SERVER_URL + "dm_add_gtffiles";
SERVER_URL_DM_GET_GTF = SERVER_URL + "dm_get_gtffiles";

SERVER_URL_DM_GET_INSTALLED_ORGANISMS = SERVER_URL + "dm_get_installed_organism";
SERVER_URL_DM_UPDATE_ORGANISM_INFO = SERVER_URL + "dm_update_organism_db_info";
SERVER_URL_DM_UPDATE_ORGANISM_DATA = SERVER_URL + "dm_update_organism_db_data";
SERVER_URL_DM_RESTORE_ORGANISM_DATA = SERVER_URL + "dm_restore_organism_db_data";

SERVER_URL_UM_GET_ALL_USERS = SERVER_URL + "um_get_all_users";
SERVER_URL_UM_CLEAN_OLD_DATA = SERVER_URL + "um_clean_old_data";

SERVER_URL_CPU_MONITOR = SERVER_URL + "um_cpu_monitor";
SERVER_URL_RAM_MONITOR = SERVER_URL + "um_ram_monitor";

SERVER_URL_SAVE_MESSAGE = SERVER_URL + "um_save_message";
SERVER_URL_GET_MESSAGE = SERVER_URL + "um_get_message";
SERVER_URL_DELETE_MESSAGE= SERVER_URL + "um_delete_message";

OLD_DATABASE_WARNING = (60 * 60 * 24 * 1000) * 60; //60 DAYS
OLD_DATABASE_ALERT = (60 * 60 * 24 * 1000) * 90; //90 DAYS
OLD_GUEST_CREATION_ALERT = (60 * 60 * 24 * 1000) * 14; //14 DAYS
OLD_USER_LOGIN_ALERT = (60 * 60 * 24 * 1000) * 60; //60 DAYS

$(function () {
    /****************************************************************************************
    *  USERS
    *****************************************************************************************/
    /****************************************************************************************
    * USER MODEL DECLARATION
    *****************************************************************************************/
    var User = Backbone.Model.extend({
        defaults: {
            userName: 'User name',
            userID: 'User ID',
            email: 'email',
            affiliation: 'No info',
            creation_date: '20000101',
            last_login: '20000101',
            is_guest: false,
            usedSpace: 0
        }
    });
    // Create a collection of users
    var UsersList = Backbone.Collection.extend({model: User});
    var users = new UsersList([]);
    /****************************************************************************************
    * VIEW DECLARATION
    *****************************************************************************************/
    var UserViewTable = Backbone.View.extend({
        tagName: 'tr',
        events: {
            'click button.deleteButton': 'deleteUser',
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            var creation_date = this.model.get('creation_date');
            creation_date = new Date(creation_date.substr(0, 4), creation_date.substr(4, 2) - 1, creation_date.substr(6, 2));
            var last_login = this.model.get('last_login');
            last_login = new Date(last_login.substr(0, 4), last_login.substr(4, 2) - 1, last_login.substr(6, 2));

            var old_creation_date = new Date() - creation_date;
            var old_last_login = new Date() - last_login;

            var alert_creation_date = ((this.model.get('is_guest') && old_creation_date > OLD_GUEST_CREATION_ALERT)?"text-danger":"");
            var alert_login_date = ((old_last_login > OLD_USER_LOGIN_ALERT)?"text-danger":"");
            var alert_used_space = ((this.model.get('usedSpace')  > application.availableSpace)?"text-danger":"");

            if(alert_creation_date === alert_login_date && alert_login_date === "text-danger"){
                this.$el.addClass("danger");
            }

            this.$el.html(
                '<td>' + this.model.get('userName') + '</td>' +
                '<td class="userIDCell">' + this.model.get('userID') + '</td>' +
                '<td>' + this.model.get('email') + '</td>' +
                '<td>' + this.model.get('affiliation') + '</td>' +
                '<td class="'+alert_used_space+'">' + Math.round(this.model.get('usedSpace') / Math.pow(1024, 2) * 100) / 100 + ' MB</td>' +
                '<td class="'+alert_creation_date+'">' + creation_date.toDateString() + '</td>' +
                '<td class="'+alert_login_date+'">' + last_login.toDateString() + '</td>' +
                '<td>' + this.model.get('is_guest') + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-danger deleteButton"><i class="fa fa-trash-o"></i> Delete</button>'+
                '</td>'
            );
            return this;
        },
        deleteUser: function () {
            var me = this;
            this.$el.find("button.deleteButton").confirmation({
                title: "Remove all data for " + me.model.get('userName') + "?",
                btnOkLabel: "Remove",
                onConfirm: function(){
                    application.cleanOldData([me.model.get('userID')]);
                }
            });
            // var view = new DatabaseViewDialog({model: this.model});
            // $("#databaseEdit").html(view.render().el);
            // $("#editDatabaseModal").modal();
        }
    });



    /****************************************************************************************
    *  FILES
    *****************************************************************************************/
    /****************************************************************************************
    * FILE MODEL DECLARATION
    *****************************************************************************************/
    var File = Backbone.Model.extend({
        defaults: {
            fileName: 'My GTF file',
            dataType: 'Reference file',
            omicType: 'GTF file',
            description: "",
            otherFields: {}
        }
    });
    // Create a collection of files
    var FilesList = Backbone.Collection.extend({model: File});
    var files = new FilesList([]);
    /****************************************************************************************
    * VIEW DECLARATION
    *****************************************************************************************/
    var FileViewTable = Backbone.View.extend({
        tagName: 'tr',
        events: {
            'click button.editButton': 'editFile',
            //            'click span.deleteButton': 'removeFile'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            this.$el.html(
                '<td>' + this.model.get('fileName') + '</td>' +
                '<td>' + (this.model.has('otherFields') ? this.model.get('otherFields').specie : "") + '</td>' +
                '<td>' + (this.model.has('otherFields') ? this.model.get('otherFields').version : "") + '</td>' +
                '<td>' + (this.model.has('otherFields') ? this.model.get('otherFields').source : "") + '</td>' +
                '<td>' + this.model.get('usedSpace') + '</td>' +
                '<td>' + this.model.get('description') + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-warning editButton"><i class="fa fa-pencil"></i> Edit</button>'+
                '</td>'
            );
            return this;
        },
        editFile: function () {
            var view = new FileViewDialog({model: this.model});
            $("#gtfFileEdit").html(view.render().el);
            $("#addGTFModal").modal();
        }
    });

    var FileViewDialog = Backbone.View.extend({
        tagName: 'div',
        events: {
            'click button#saveFile': 'saveFile',
            'click button#removeFile': 'removeFile'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            this.$el.html(
                '<form action="' + SERVER_URL_DM_ADD_GTF + '" method="post" enctype="multipart/form-data">' +
                '    <div class="form-group">' +
                '        <label for="filename">File:</label>' +
                '        <input type="file" class="form-control" name="filename" id="filename">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="specie">Specie:</label>' +
                '        <input type="text" class="form-control" id="specie" name="specie" value="' + (this.model.get('otherFields') && this.model.get('otherFields').specie ? this.model.get('otherFields').specie : "") + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="version">Version:</label>' +
                '        <input type="text" class="form-control" id="version" name="version" value="' + (this.model.get('otherFields') && this.model.get('otherFields').version ? this.model.get('otherFields').version : "") + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="source">Source:</label>' +
                '        <input type="text" class="form-control" id="source" name="source" value="' + (this.model.get('otherFields') && this.model.get('otherFields').source ? this.model.get('otherFields').source : "") + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="dataType">Data type:</label>' +
                '        <input type="text" class="form-control" id="dataType" name="dataType" value="' + this.model.get('dataType') + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="omicType">Omic type:</label>' +
                '        <input type="text" class="form-control" id="omicType" name="omicType" value="' + this.model.get('omicType') + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="description">Description:</label>' +
                '          <textarea class="form-control" rows="5" id="description" name="description">' + this.model.get('description') + '</textarea>' +
                '    </div>' +
                '    <button type="submit" class="btn btn-success" id="saveFile">Save</button>' +
                '    <button class="btn btn-danger" id="removeFile">Remove</button>' +
                '</form>'
            );
            return this;
        },
        saveFile: function () {
            this.model.set("filename", $("#gtfFileEdit input").val());
            this.model.set("description", $("#gtfFileEdit textarea").val());

            if (this.model.get("fileName") === "") {
                $("#gtfFileEdit input").closest('.form-group').removeClass('success').addClass('error');
                return false;
            } else {
                $("#gtfFileEdit input").closest('.form-group').addClass('success');
            }
            //            return false;
        },
        removeFile: function () {
            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_DELETE_GTF,
                dataType: "json",
                data: {fileName: this.model.get("fileName")},
                success: function (data) {
                    showSuccessMessage("File removed successfully", "#addGTFModal");
                    $("#addGTFModal").modal('hide');
                    application.updateGTFList();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while removing file.", "#addGTFModal");
                }
            });
            return false;
        }
    });




    /****************************************************************************************
    *  INSTALLED DATABASES
    *****************************************************************************************/
    /****************************************************************************************
    * DATABASE MODEL DECLARATION
    *****************************************************************************************/
    var Database = Backbone.Model.extend({
        defaults: {
            organism_name: 'My GTF file',
            organism_code: 'Reference file',
            acceptedIDs: "UniProt;RefSeq Gene ID",
            kegg_date: "",
            mapping_date: ""
        }
    });
    // Create a collection of databases
    var DatabaseList = Backbone.Collection.extend({model: Database});
    var databases = new DatabaseList([]);
    /****************************************************************************************
    * VIEW DECLARATION
    *****************************************************************************************/
    var DatabaseViewTable = Backbone.View.extend({
        tagName: 'tr',
        events: {
            'click button.editButton': 'editDatabase',
            //            'click span.deleteButton': 'removeFile'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            var kegg_date = this.model.get('kegg_date');
            kegg_date = new Date(kegg_date.substr(0, 4), kegg_date.substr(4, 2) - 1, kegg_date.substr(6, 2), kegg_date.substr(9, 2), kegg_date.substr(11, 2));

            var mapping_date = this.model.get('mapping_date');
            mapping_date = new Date(mapping_date.substr(0, 4), mapping_date.substr(4, 2) - 1, mapping_date.substr(6, 2), mapping_date.substr(9, 2), mapping_date.substr(11, 2));

            var old_kegg_date = new Date() - kegg_date;
            var old_mapping_date = new Date() - mapping_date;


            if (old_mapping_date > OLD_DATABASE_ALERT || old_kegg_date > OLD_DATABASE_ALERT) {
                this.$el.addClass("danger");
            } else if (old_mapping_date > OLD_DATABASE_WARNING || old_kegg_date > OLD_DATABASE_WARNING) {
                this.$el.addClass("warning");
            }

            this.$el.html(
                '<td>' + this.model.get('organism_name') + '</td>' +
                '<td>' + this.model.get('organism_code') + '</td>' +
                '<td>' + kegg_date.toDateString() + '</td>' +
                '<td>' + mapping_date.toDateString() + '</td>' +
                '<td>' + this.model.get('acceptedIDs') + '</td>' +
                '<td>' +
                '<button type="button" class="btn btn-warning editButton"><i class="fa fa-pencil"></i> Edit</button>'+
                //'<span style="margin-left:15px;color:#D9534F;cursor:pointer" class="glyphicon glyphicon-trash deleteButton"></span>' +
                '</td>'
            );
            return this;
        },
        editDatabase: function () {
            var view = new DatabaseViewDialog({model: this.model});
            $("#databaseEdit").html(view.render().el);
            $("#editDatabaseModal").modal();
        }
    });

    var DatabaseViewDialog = Backbone.View.extend({
        tagName: 'div',
        events: {
            'click button#saveChanges': 'saveChanges',
            'click button#updateDBs': 'updateDatabases'
            //            'click button#removeFile': 'removeFile'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            var me = this;

            this.$el.html(
                '<div>' +
                '    <div class="form-group">' +
                '        <label for="specie">Organism:</label>' +
                '        <select class="form-control" id="organism_name" name="organism_name" value="' + this.model.get('organism_name') + '"></select>' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="version">Code:</label>' +
                '        <input type="text" class="form-control" id="organism_code" name="organism_code" value="' + this.model.get('organism_code') + '" readonly>' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="description">Accepted IDs:</label>' +
                '          <textarea class="form-control" rows="5" id="acceptedIDs" name="acceptedIDs">' + (this.model.get('acceptedIDs').split(";")).join("\n") + '</textarea>' +
                '    </div>' +
                '    <button class="btn btn-success" id="saveChanges" style=" margin-left: auto; display: block; margin-bottom: 20px; ">Save</button>' +
                '    <label for="dataType">Update databases:</label>' +
                '    <div class="form-group" style="padding-left:10px;">' +
                '        <div class="radio"><label><input type="radio" name="updateDB" value="updateKegg">Update KEGG Data</label></div>' +
                '        <div class="radio"><label><input type="radio" name="updateDB" value="updateMapping">Update Mapping Data</label></div>' +
                '        <div class="radio"><label><input type="radio" name="updateDB" value="all">Update all</label></div>' +
                '        <div class="radio"><label><input type="radio" name="updateDB" value="reinstallData">Only reinstall data</label></div>' +
                '    </div>' +
                '    <button class="btn btn-info" id="updateDBs">Update databases</button>' +
                '</div>'
            );
            $.getJSON(SERVER_URL + "resources/data/all_species.json", function (data) {
                var options = "";
                for (var i in data.species) {
                    options += '<option value="' + data.species[i].name + '" ' +  (data.species[i].name ===  me.model.get('organism_name')? "selected=true":"") +'>' + data.species[i].name + '</option>';
                }
                $("#organism_name").html(options);
            });
            return this;
        },
        saveChanges: function () {
            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_UPDATE_ORGANISM_INFO,
                dataType: "json",
                data: {
                    organism_name: this.model.get("organism_name"),
                    organism_code: this.model.get("organism_code"),
                    acceptedIDs: this.model.get("acceptedIDs").replace(/\n/g, ";")
                },
                success: function (data) {
                    showSuccessMessage("Organism database updated successfully", "#editDatabaseModal");
                    $("#editDatabaseModal").modal('hide');
                    application.updateDatabaseList();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while removing file.", "#editDatabaseModal");
                }
            });
            return false;
        },
        updateDatabases: function () {
            var option = $("input[name=updateDB]:checked").val();
            if (option !== undefined) {
                waitingDialog.show("Updating Organism database, please wait.<p style='font-size: 15px;margin: 8px 2px;color: #969696;'>Depending on the selected specie this could take up to 2 hours...</p>");
                $.ajax({
                    type: "POST",
                    url: SERVER_URL_DM_UPDATE_ORGANISM_DATA,
                    dataType: "json",
                    data: {
                        organism_code: this.model.get("organism_code"),
                        option: option
                    },
                    success: function (data) {
                        showSuccessMessage("Organism database updated successfully", "#editDatabaseModal");
                        $("#editDatabaseModal").modal('hide');
                        application.updateDatabasesList();
                        waitingDialog.hide();
                    },
                    error: function (jqXHR, textStatus, errorThrown) {
                        showErrorMessage("Error while removing file.", "#editDatabaseModal");
                        waitingDialog.hide();
                    }
                });
            }
            return false;
        }
    });




    /****************************************************************************************
    *  MESSAGES
    *****************************************************************************************/
    /****************************************************************************************
    * MESSAGE MODEL DECLARATION
    *****************************************************************************************/
    var Message = Backbone.Model.extend({
        defaults: {
            message_type: 'login_message',
            message_content: ''
        }
    });
    // Create a collection of messages
    var MessageList = Backbone.Collection.extend({model: Message});
    var messages = new MessageList([]);
    /****************************************************************************************
    * VIEW DECLARATION
    *****************************************************************************************/
    var MessageViewTable = Backbone.View.extend({
        tagName: 'tr',
        events: {
            'click button.editButton': 'editMessage',
            'click button.deleteButton': 'removeMessage'
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            this.$el.html(
                '<td>' + this.model.get('message_type') + '</td>' +
                '<td>' + this.model.get('message_content').substr(0,30)  + ' [...]</td>' +
                '<td>'+
                '   <button type="button" class="btn btn-warning editButton"><i class="fa fa-pencil"></i></button>'+
               '    <button type="button" class="btn btn-danger deleteButton"><i class="fa fa-trash-o"></i></button>'+
                '</td>'
            );
            return this;
        },
        editMessage: function () {
            var view = new MessageViewDialog({model: this.model});
            $("#messageEdit").html(view.render().el);
            $("#editMessageModal").modal();
        },
        removeMessage: function () {
            $.ajax({
                type: "POST",
                url: SERVER_URL_DELETE_MESSAGE,
                dataType: "json",
                data: {message_type: this.model.get("message_type")},
                success: function (data) {
                    showSuccessMessage("Message removed successfully", "#editMessageModal");
                    $("#editMessageModal").modal('hide');
                    application.updateMessageList();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while removing message.", "#editMessageModal");
                }
            });
            return false;
        }
    });

    var MessageViewDialog = Backbone.View.extend({
        tagName: 'div',
        events: {
            'click button#saveChanges': 'saveChanges',
        },
        initialize: function () {
            this.listenTo(this.model, 'change', this.render);
        },
        render: function () {
            var me = this;

            this.$el.html(
                '<div>' +
                '    <div class="form-group">' +
                '        <label for="message_type">Message type:</label>' +
                '        <input type="text" class="form-control" id="message_type" name="message_type" value="' + this.model.get('message_type') + '">' +
                '    </div>' +
                '    <div class="form-group">' +
                '        <label for="message_content">Message:</label>' +
                '        <textarea class="form-control" rows="5" id="message_content" name="message_content">' + this.model.get('message_content') + '</textarea>' +
                '    </div>' +
                '    <button class="btn btn-success" id="saveChanges" style=" margin-left: auto; display: block; margin-bottom: 20px; ">Save</button>' +
                '</div>'
            );
            return this;
        },
        saveChanges: function () {
            this.model.set("message_type", $("#message_type").val());
            this.model.set("message_content", $("#message_content").val());

            $.ajax({
                type: "POST",
                url: SERVER_URL_SAVE_MESSAGE,
                dataType: "json",
                data: {
                    message_type: this.model.get("message_type"),
                    message_content: this.model.get("message_content")
                },
                success: function (data) {
                    showSuccessMessage("Message database updated successfully", "#editMessageModal");
                    $("#editMessageModal").modal('hide');
                    application.updateMessageList();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while saving message file.", "#editMessageModal");
                }
            });
            return false;
        }
    });


    /****************************************************************************************
    *  APPLICATION
    *****************************************************************************************/
    // The main view of the application
    var App = Backbone.View.extend({
        // Base the view on an existing element
        el: $('#main'),
        initialize: function () {
            var me = this;

            $('#addGTFButton').click(function () {
                var view = new FileViewDialog({model: new File()});
                $("#gtfFileEdit").html(view.render().el);
            });

            $('#addMessageButton').click(function () {
                var view = new MessageViewDialog({model: new Message()});
                $("#messageEdit").html(view.render().el);
            });

            $('#installNewSpecieButton').click(function () {
                $("#installNewSpecieModal").modal();
            });

            $('#updateCommonDBs').confirmation({
                title : "Update all common KEGG information?",
                btnOkLabel: "Update",
                onConfirm: me.updateCommonDBs
            });

            $('#restoreDBs').confirmation({
                title : "Restore databases to previous version?",
                btnOkLabel: "Restore",
                onConfirm: me.restoreDBs
            });

            $('#installNewSpecieAccept').click(function () {
                me.installNewSpecie();
            });

            $('#cleanOldData').confirmation({
                title : "Remove all data for old users?",
                btnOkLabel: "Clean",
                onConfirm: me.cleanOldData
            });

            $.getJSON(SERVER_URL + "resources/data/all_species.json", function (data) {
                var options = "";
                for (var i in data.species) {
                    options += '<option value="' + data.species[i].value + '">' + data.species[i].name + '</option>';
                }
                $("#installNewSpecieCode").html(options);
            });

            me.fileList = $('#gtffiles');
            this.updateGTFList();

            me.messageList = $('#messagesTable');
            this.updateMessageList();

            me.databasesList = $('#databases');
            this.updateDatabasesList();

            me.userList = $('#users');
            this.updateUsersList();
        },
        updateGTFList: function () {
            var me = this;
            me.fileList.empty();
            files.reset();

            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_GET_GTF,
                dataType: "json",
                success: function (data) {
                    for (var i in data.fileList) {
                        files.push(new File(data.fileList[i]));
                    }

                    me.listenTo(files, 'change', me.render);

                    files.each(function (file) {
                        var view = new FileViewTable({model: file});
                        me.fileList.append(view.render().el);
                    }, me);

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while retrieving all GFT files.");
                }
            });
        },
        updateMessageList: function () {
            var me = this;
            me.messageList.empty();
            messages.reset();

            $.ajax({
                type: "POST",
                url: SERVER_URL_GET_MESSAGE,
                dataType: "json",
                success: function (data) {
                    for (var i in data.messageList) {
                        messages.push(new Message(data.messageList[i]));
                    }

                    me.listenTo(messages, 'change', me.render);

                    messages.each(function (message) {
                        var view = new MessageViewTable({model: message});
                        me.messageList.append(view.render().el);
                    }, me);

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while retrieving all messages.");
                }
            });
        },
        updateDatabasesList: function () {
            var me = this;
            me.databasesList.empty();
            databases.reset();

            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_GET_INSTALLED_ORGANISMS,
                dataType: "json",
                success: function (data) {

                    var common_info_date = data.common_info_date;
                    common_info_date = new Date(common_info_date.substr(0, 4), common_info_date.substr(4, 2) - 1, common_info_date.substr(6, 2), common_info_date.substr(9, 2), common_info_date.substr(11, 2));
                    var old_common_info_date = new Date() - common_info_date;

                    $("#versionCommonDBs").text("Last version installed on " + common_info_date.toDateString() + " " + common_info_date.toTimeString());
                    if (old_common_info_date > OLD_DATABASE_ALERT) {
                        $("#versionCommonDBs").addClass("text-danger");
                    } else if (old_common_info_date > OLD_DATABASE_WARNING) {
                        $("#versionCommonDBs").addClass("text-warning");
                    }


                    for (var i in data.databaseList) {
                        databases.push(new Database(data.databaseList[i]));
                    }

                    me.listenTo(databases, 'change', me.render);

                    databases.each(function (database) {
                        var view = new DatabaseViewTable({model: database});
                        me.databasesList.append(view.render().el);
                    }, me);

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while retrieving all Organism Databases.");
                }
            });
        },

        updateCommonDBs: function () {
            waitingDialog.show("Updating Common databases, please wait.<p style='font-size: 15px;margin: 8px 2px;color: #969696;'>This process could take up to 2 hours...</p>");
            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_UPDATE_ORGANISM_DATA,
                dataType: "json",
                data: {
                    organism_code: "common",
                    option: "all"
                },
                success: function (data) {
                    showSuccessMessage("Common databases updated successfully");
                    application.updateDatabasesList();
                    waitingDialog.hide();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while removing file.");
                    waitingDialog.hide();
                }
            });
        },
        restoreDBs: function () {
            waitingDialog.show("Restoring databases, please wait...");
            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_RESTORE_ORGANISM_DATA,
                dataType: "json",
                data: {},
                success: function (data) {
                    showSuccessMessage("Databases restored successfully");
                    application.updateDatabasesList();
                    waitingDialog.hide();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while restoring data.");
                    waitingDialog.hide();
                }
            });
        },
        installNewSpecie: function(){
            var option = "all";
            var organism_code = $("#installNewSpecieCode").val();
            var just_install = $("#onlyInstallNewSpecie").is(':checked');

            waitingDialog.show("Installing Organism database, please wait.<p style='font-size: 15px;margin: 8px 2px;color: #969696;'>Depending on the selected specie this could take up to 2 hours...</p>");
            $.ajax({
                type: "POST",
                url: SERVER_URL_DM_UPDATE_ORGANISM_DATA,
                dataType: "json",
                data: {
                    'organism_code': organism_code,
                    'just_install': just_install,
                    'option': option
                },
                success: function (data) {
                    showSuccessMessage("Organism database installed successfully", "#installNewSpecieModal");
                    $("#installNewSpecieModal").modal('hide');
                    application.updateDatabasesList();
                    waitingDialog.hide();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while removing file.", "#installNewSpecieModal");
                    waitingDialog.hide();
                }
            });
            return false;
        },
        updateUsersList: function () {
            var me = this;
            me.userList.empty();
            users.reset();

            $.ajax({
                type: "POST",
                url: SERVER_URL_UM_GET_ALL_USERS,
                dataType: "json",
                success: function (data) {
                    me.availableSpace = data.availableSpace;

                    for (var i in data.userList) {
                        users.push(new User(data.userList[i]));
                    }

                    me.listenTo(users, 'change', me.render);

                    users.each(function (user) {
                        var view = new UserViewTable({model: user});
                        me.userList.append(view.render().el);
                    }, me);

                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while retrieving information for users.");
                }
            });
        },
        cleanOldData: function (userIDs) {
            waitingDialog.show("Cleaning data and users, please wait...");
            if(!Array.isArray(userIDs)){
                userIDs=[];
                $("tr.danger > td.userIDCell").each(function(){
                    userIDs.push($(this).text());
                });
            }

            $.ajax({
                type: "POST",
                url: SERVER_URL_UM_CLEAN_OLD_DATA,
                data: {"user_ids" : userIDs.join(",")},
                success: function (data) {
                    showSuccessMessage("All users and data were removed successfully");
                    application.updateUsersList();
                    waitingDialog.hide();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    showErrorMessage("Error while cleaning data.");
                    waitingDialog.hide();
                }
            });
        },
    });

    application = new App();

    Highcharts.setOptions({global: {useUTC: false}});
    initializeCPUMonitor();
    initializeMemMonitor();

    $("#enableMonitors").click(function(){
        monitorTimers = !monitorTimers;
        if(monitorTimers){
            initializeCPUMonitor();
            initializeMemMonitor();
            $(this).text("Stop");
        }else{
            $(this).text("Resume");
        }
        return;
    });
});

monitorTimers = false;

function initializeCPUMonitor() {
    $.ajax({
        type: "POST",
        url: SERVER_URL_CPU_MONITOR,
        success: function (data) {
            var nCPUs = data.cpu_usage[0].length;
            var series = [];

            for (var i = 0; i < nCPUs; i++) {
                series.push({
                    name: 'CPU' + (i + 1),
                    data: (function () {
                        var data = [];
                        for (var k = -10; k < 0; k++) {
                            data.push({x: k, y: 0});
                        }
                        return data;
                    }())
                });
            }

            $("#cpu-usage-container").highcharts({
                chart: {
                    type: 'spline',
                    animation: Highcharts.svg, // don't animate in old IE
                    marginRight: 10,
                    events: {
                        load: function () {
                            series = this.series;
                        }
                    }
                },
                title: null,
                xAxis: {labels: {enabled: false}, lineWidth: 0},
                yAxis: {
                    title: {text: '% Usage'},
                    plotLines: [{value: 0, width: 1, color: '#808080'}],
                    min: 0, max: 100
                },
                tooltip: false,
                legend: {enabled: true},
                exporting: {enabled: false},
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false
                        }
                    }
                },
                series: series
            });

            updateCPUMonitor(series, data);
        }
    });

}

function updateCPUMonitor(series, data) {
    if(monitorTimers){
        $.ajax({
            type: "POST",
            url: SERVER_URL_CPU_MONITOR,
            success: function (data) {
                updateCPUMonitor(series, data);
            }
        });
        setTimeout(function () {
            addCPUPoint(series, data.cpu_usage);
        }, (1000));
    }
}

function addCPUPoint(series, values) {
    for (var i in series) {
        var y = values[0][i];
        series[i].addPoint(y, false, true);
    }
    series[0].chart.redraw();

    values.shift();

    if (values.length > 0) {
        setTimeout(function () {
            addCPUPoint(series, values);
        }, 1000);
    }
}

function initializeMemMonitor() {
    $.ajax({
        type: "POST",
        url: SERVER_URL_RAM_MONITOR,
        success: function (data) {

            var series = [];

            series.push({
                name: 'RAM',
                data: (function () {
                    var data = [];
                    for (var k = -10; k < 0; k++) {
                        data.push({x: k, y: 0});
                    }
                    return data;
                }())
            });

            series.push({
                name: 'SWAP',
                data: (function () {
                    var data = [];
                    for (var k = -10; k < 0; k++) {
                        data.push({x: k, y: 0});
                    }
                    return data;
                }())
            });

//            $("#ram-usage-container").append('<div class="col-md-8" id="ram-usage-plot"></div>');
//            $("#ram-usage-container").append('<div class="col-md-4" id="ram-usage-box"></div>');

            $("#ram-usage-container").highcharts({
                chart: {
                    type: 'spline',
                    animation: Highcharts.svg, // don't animate in old IE
                    marginRight: 10,
                    events: {
                        load: function () {
                            series = this.series;
                        }
                    }
                },
                title: null,
                xAxis: {labels: {enabled: false}, lineWidth: 0},
                yAxis: {
                    title: {text: '% Usage'},
                    plotLines: [{value: 0, width: 1, color: '#808080'}],
                    min: 0, max: 100
                },
                tooltip: false,
                legend: {enabled: true},
                exporting: {enabled: false},
                plotOptions: {
                    series: {
                        marker: {
                            enabled: false
                        }
                    }
                },
                series: series
            });

            updateMemMonitor(series, data);
        }
    });
}

function updateMemMonitor(series, data) {
    if(monitorTimers){
        $.ajax({
            type: "POST",
            url: SERVER_URL_RAM_MONITOR,
            success: function (data) {
                updateMemMonitor(series, data);
            }
        });
        setTimeout(function () {
            addMemPoint(series, data.ram_usage, data.swap_usage);
        }, (1000));
    }
}

function addMemPoint(series, ram_usage, swap_usage) {
    var y = ram_usage[0][2];
    series[0].addPoint(y, false, true);

    y = swap_usage[0][2];
    series[1].addPoint(y, false, true);

    series[0].chart.redraw();

    ram_usage.shift();
    swap_usage.shift();

    if (ram_usage.length > 0) {
        setTimeout(function () {
            addMemPoint(series, ram_usage, swap_usage);
        }, 1000);
    }
}
