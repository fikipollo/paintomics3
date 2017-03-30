//# sourceURL=UserController.js
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
* - UserController
*
* EVENT HANDLERS MAPPING
*  - getUserViewsDialog
*  - signInLinkClickHandler
*  - signInButtonClickHandler
*  - signUpLinkClickHandler
*  - signUpButtonClickHandler
*  - signUpCloseButtonClickHandler
*  - forgotPassLinkClickHandler #Not yet implemented!
*  - signOutButtonClickHandler
*  - startGuestSessionButtonClickHandler
*  - showGuestSessionDialog
*  - myDataButtonClickHandler
*  - getCredentialsParams
*/
function UserController() {

    /**
    * This function returns a new dialog for user managemnet (login etc.)
    * @param {type} width
    * @param {type} height
    * @returns ExtJS.Dialog
    */
    this.getUserViewsDialog = function (width, height) {
        var userViewsDialog = Ext.getCmp("userViewsDialog");
        if (userViewsDialog == null) {
            userViewsDialog = Ext.create('Ext.window.Window', {
                id: "userViewsDialog",
                modal: true, closable: false,
                items: []
            });
        }

        userViewsDialog.setHeight(height);
        userViewsDialog.setWidth(width);
        userViewsDialog.center();
        return userViewsDialog;
    };

    /**
    * This function shows a new dialog for login
    */
    this.signInLinkClickHandler = function () {
        var userViewsDialog = this.getUserViewsDialog(700, 400);

        var signInPanel = new SignInPanel();
        signInPanel.setController(this);
        userViewsDialog.removeAll();
        userViewsDialog.add(signInPanel.getComponent());
        userViewsDialog.setLoading(false);
        userViewsDialog.show();
    };

    /**
    * This function send to server the credentials for log in the application.
    *
    * @param {panel} userView
    */
    this.signInButtonClickHandler = function (userView) {
        var signInForm = userView.getComponent().queryById("signInForm");
        if (signInForm.isValid()) {
            $.ajax({
                type: "POST",
                url: SERVER_URL_UM_SIGNIN,
                data: signInForm.getForm().getValues(),
                success: function (response) {
                    if (response.success === false) {
                        $("#invalidUserPassMessage").html(response.message.split("ERROR MESSAGE:")[1]);
                        $("#invalidUserPassMessage").fadeIn();
                        return;
                    }
                    $("#invalidUserPassMessage").fadeOut();

                    /*1. Set the cookies*/
                    Ext.util.Cookies.set("lastEmail", signInForm.getForm().getValues().email, null, location.pathname);
                    Ext.util.Cookies.set("sessionToken", response.sessionToken, null, location.pathname);
                    Ext.util.Cookies.set("userID", response.userID, null, location.pathname);
                    Ext.util.Cookies.set("userName", response.userName, null, location.pathname);
                    /*3. Close window*/
                    var userViewsDialog = Ext.getCmp("userViewsDialog");
                    if (userViewsDialog != null) {
                        userViewsDialog.close();
                    }

                    showSuccessMessage(
                        "Welcome back " + response.userName, {
                            message: (response.loginMessage !== null ? response.loginMessage.message_content: ""),
                            logMessage: "Signed in as " + response.userName,
                            callback: function () {
                                application.getController("JobController").resetButtonClickHandler(null, true);
                            }
                        });
                    },
                    error: ajaxErrorHandler
                });
            }
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.signUpLinkClickHandler = function (userView) {
            var userViewsDialog = this.getUserViewsDialog(440, 520);

            userViewsDialog.setLoading(true);
            var signUpPanel = new SignUpPanel();
            signUpPanel.setController(this);
            userViewsDialog.removeAll();
            userViewsDialog.add(signUpPanel.getComponent());
            userViewsDialog.setLoading(false);
            userViewsDialog.show();
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.signUpButtonClickHandler = function (userView) {
            var signUpForm = userView.getComponent().queryById("signUpForm");
            if (signUpForm.isValid()) {
                $.ajax({
                    type: "POST",
                    url: SERVER_URL_UM_SIGNUP,
                    data: signUpForm.getForm().getValues(),
                    success: function (response) {
                        if (response.success === false) {
                            $("#invalidSignUpMessage").html(response.message.split("ERROR MESSAGE:")[1]);
                            $("#invalidSignUpMessage").fadeIn();
                            return;
                        }
                        $("#invalidSignUpMessage").fadeOut();
                        /*1. Show Congratz panel*/
                        userView.showCongratzPanel();
                        Ext.util.Cookies.set("lastEmail", signUpForm.getForm().getValues().email, null, location.pathname);
                        //After that a confirmation email is sent and user must access to the provided link to enable account.
                        /*After confirmation, user must sign in app using the Sign In option*/
                    },
                    error: ajaxErrorHandler
                });
            }
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.signUpCloseButtonClickHandler = function (userView) {
            var userViewsDialog = Ext.getCmp("userViewsDialog");
            if (userViewsDialog != null) {
                userViewsDialog.close();
            }
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.forgotPassLinkClickHandler = function (userView) {
            alert("Not implemented yet");
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.changePassLinkClickHandler = function () {
            var userViewsDialog = this.getUserViewsDialog(440, 300);
            userViewsDialog.setLoading(true);
            var changePasswordPanel = new ChangePasswordPanel();
            changePasswordPanel.setController(this);
            userViewsDialog.removeAll();
            userViewsDialog.add(changePasswordPanel.getComponent());
            userViewsDialog.setLoading(false);
            userViewsDialog.show();
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.changePasswordAcceptButtonClickHandler = function (userView) {
            var changePassForm = userView.getComponent().queryById("changePassForm");
            if (changePassForm.isValid()) {
                $.ajax({
                    type: "POST",
                    url: SERVER_URL_UM_CHANGEPASS,
                    data: changePassForm.getForm().getValues(),
                    success: function (response) {
                        /*1. Show Congratz panel*/
                        userView.showSuccessPanel();
                    },
                    error: ajaxErrorHandler
                });
            }
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.changePasswordCancelButtonClickHandler = function (userView) {
            var userViewsDialog = Ext.getCmp("userViewsDialog");
            if (userViewsDialog != null) {
                userViewsDialog.close();
            }
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.signOutButtonClickHandler = function (userView) {
            $.ajax({
                type: "POST",
                url: SERVER_URL_UM_SIGNOUT,
                data: this.getCredentialsParams(),
                success: function (response) {
                    /*1. Clear the cookies*/
                    Ext.util.Cookies.clear("sessionToken", location.pathname);
                    Ext.util.Cookies.clear("userID", location.pathname);
                    Ext.util.Cookies.clear("userName", location.pathname);
                    if (userView)
                    userView.getComponent().updateLoginState();
                    //                this.signInButtonClickHandler();
                    application.getController("JobController").resetButtonClickHandler(null, true);
                },
                error: ajaxErrorHandler
            });

        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.startGuestSessionButtonClickHandler = function (userView) {
            var me = this;

            $.ajax({
                type: "POST",
                url: SERVER_URL_UM_NEWGUESTSESSION,
                success: function (response) {
                    /*1. Set the cookies*/
                    Ext.util.Cookies.set("lastEmail", response.userName + "@paintomics.org", null, location.pathname);
                    Ext.util.Cookies.set("sessionToken", response.sessionToken, null, location.pathname);
                    Ext.util.Cookies.set("userID", response.userID, null, location.pathname);
                    Ext.util.Cookies.set("userName", response.userName, null, location.pathname);

                    /*2. Show Credentials dialog*/
                    //TODO: REVISAR ESTO, SEGURO?
                    me.showGuestSessionDialog(response.userName + "@paintomics.org", response.p);
                },
                error: ajaxErrorHandler
            });
        };

        /**
        *
        * @param {type} email
        * @param {type} p
        * @returns {undefined}
        */
        this.showGuestSessionDialog = function (email, p) {
            var userViewsDialog = this.getUserViewsDialog(700, 400);

            var guestSessionPanel = new GuestSessionPanel(email, p);
            guestSessionPanel.setController(this);
            userViewsDialog.removeAll();
            userViewsDialog.add(guestSessionPanel.getComponent());
            userViewsDialog.setLoading(false);
            userViewsDialog.show();
        };

        /**
        *
        * @param {type} userView
        * @returns {undefined}
        */
        this.myDataButtonClickHandler = function (userView) {
            application.getController("DataManagementController").showMyDataPanelClickHandler(null);
        };

        /**
        *
        * @param {type} request_params
        * @returns {UserController.getCredentialsParams.credentials}
        */
        this.getCredentialsParams = function (request_params) {
            var credentials = {};
            if (request_params != null) {
                credentials = request_params;
            }

            credentials['sessionToken'] = Ext.util.Cookies.get('sessionToken');
            credentials['userID'] = Ext.util.Cookies.get('userID');
            return credentials;
        };
    }
