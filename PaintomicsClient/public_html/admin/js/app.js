
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

OLD_DATABASE_WARNING = (60 * 60 * 24 * 1000) * 60; //60 DAYS
OLD_DATABASE_ALERT = (60 * 60 * 24 * 1000) * 90; //90 DAYS
OLD_GUEST_CREATION_ALERT = (60 * 60 * 24 * 1000) * 14; //14 DAYS
OLD_USER_LOGIN_ALERT = (60 * 60 * 24 * 1000) * 60; //60 DAYS

$(function () {
    /****************************************************************************************
    *     | |  | |/ ____|  ____|  __ \ / ____|
    *     | |  | | (___ | |__  | |__) | (___
    *     | |  | |\___ \|  __| |  _  / \___ \
    *     | |__| |____) | |____| | \ \ ____) |
    *      \____/|_____/|______|_|  \_\_____/
    *
    *****************************************************************************************/
    /****************************************************************************************
    * MODEL DECLARATION
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
    *      ______ _____ _      ______  _____
    *     |  ____|_   _| |    |  ____|/ ____|
    *     | |__    | | | |    | |__  | (___
    *     |  __|   | | | |    |  __|  \___ \
    *     | |     _| |_| |____| |____ ____) |
    *     |_|    |_____|______|______|_____/
    *
    *****************************************************************************************/

    /***************************************
    * DEFINITION FOR FILE MODELS
    ****************************************/
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
    *     _____       _______       ____           _____ ______  _____
    *    |  __ \   /\|__   __|/\   |  _ \   /\    / ____|  ____|/ ____|
    *    | |  | | /  \  | |  /  \  | |_) | /  \  | (___ | |__  | (___
    *    | |  | |/ /\ \ | | / /\ \ |  _ < / /\ \  \___ \|  __|  \___ \
    *    | |__| / ____ \| |/ ____ \| |_) / ____ \ ____) | |____ ____) |
    *    |_____/_/    \_\_/_/    \_\____/_/    \_\_____/|______|_____/

    *****************************************************************************************/
    /***************************************
    * DEFINITION FOR FILE MODELS
    ****************************************/
    var Database = Backbone.Model.extend({
        defaults: {
            organism_name: 'My GTF file',
            organism_code: 'Reference file',
            acceptedIDs: "UniProt;RefSeq Gene ID",
            kegg_date: "",
            mapping_date: ""
        }
    });
    // Create a collection of files
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
    *                _____  _____
    *          /\   |  __ \|  __ \
    *         /  \  | |__) | |__) |
    *        / /\ \ |  ___/|  ___/
    *       / ____ \| |    | |
    *      /_/    \_\_|    |_|
    *
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
});
