//# sourceURL=UserViews.js
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
 * - SessionInfoBar
 * - SignInPanel
 * - SignUpPanel
 *
 */

function SessionInfoBar() {
    /*********************************************************************
     * ATTRIBUTES
     ***********************************************************************/
    this.name = "SessionInfoBar";
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.signInButtonClick = function () {
        this.getController().signInLinkClickHandler(this);
    };
    this.myDataButtonClick = function () {
        this.getController().myDataButtonClickHandler(this);
    };
    this.signOutButtonClick = function () {
        this.getController().signOutButtonClickHandler(this);
    };
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.initComponent = function () {
        var me = this;
        this.component = Ext.widget(
                {xtype: "container", id: 'sessionInfoBar',
                    width: 150, height: 40, layout: 'hbox', style: {marginTop: "40px"},
                    items: [
                        {xtype: "box", height: 40, width: 30, html: '<img src="resources/images/anonymous_user_30x30.png" alt="User avatar">'},
                        {xtype: "button", itemId: "buttonSessionOptions", text: "Not logged in!", height: 30,
                            style: {background: "none", border: "none"},
                            menu: {
                                xtype: 'menu',
                                items: [
                                    {xtype: 'menuitem', scale: 'small', itemId: "signInButton", handler: this.signInButtonClick, scope: this, cls: "notLoggedButtons", iconCls: 'login', text: 'Sign in'},
//                                    {xtype: 'menuitem', scale: 'small', itemId: "recoverJobButton", handler: this.recoverJobButtonClick, scope: this, text: 'Recover a job'},
//                                    {xtype: 'menuitem', scale: 'small', itemId: "myDataButton", handler: this.myDataButtonClick, scope: this, cls: "loggedButtons", hidden: true, text: 'My data'},
                                    {xtype: 'menuitem', scale: 'small', itemId: "signOutButton", handler: this.signOutButtonClick, scope: this, cls: "loggedButtons", hidden: true, text: 'Sign out'}
                                ]
                            }
                        }
                    ],
                    updateLoginState: function () {
                        var loggedIn = Ext.util.Cookies.get("userID") !== null;
                        var text = (loggedIn == true) ? Ext.util.Cookies.get("userName") : "Please Sign In";
                        this.queryById('buttonSessionOptions').setText(text);
                        this.queryById('signInButton').setVisible(loggedIn !== true);
//                        this.queryById('myDataButton').setVisible(loggedIn === true);
                        this.queryById('signOutButton').setVisible(loggedIn === true);
                        $(".loggedOption").css("display", (loggedIn == true) ? "block" : "none");
                    }
                }
        );
    };
    return this;
}
SessionInfoBar.prototype = new View;

function SignInPanel() {
    /*********************************************************************
     * ATTRIBUTES
     ***********************************************************************/
    this.name = "SignInPanel";
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.signInButtonClick = function () {
        this.getController().signInButtonClickHandler(this);
    };
    this.signUpLinkClick = function () {
        this.getController().signUpLinkClickHandler(this);
    };
    this.forgotPassLinkClick = function () {
        this.getController().forgotPassLinkClickHandler(this);
    };
    this.startGuestSessionButtonClick = function () {
        this.getController().startGuestSessionButtonClickHandler(this);
    };

    this.initComponent = function () {
        var me = this;
        this.component = Ext.widget(
                {xtype: "container", layout: {type: 'hbox', align: 'stretch'}, flex: 1, maxWidth: 900, margin: '20px',
                    items: [
                        {xtype: 'form', itemId: "signInForm", flex: 1, border: 0,
                            layout: {type: 'vbox', align: 'stretch'}, defaults: {labelAlign: "top", border: false}, style: {"padding-right": "20px"},
                            items: [
                                {xtype: "box", html: '<h2>Sign In</h2>'},
                                {xtype: "textfield", name: 'email', fieldLabel: 'Email Address', vtype: 'email', value: Ext.util.Cookies.get('lastEmail'), allowBlank: false},
                                {xtype: "textfield", name: 'password', fieldLabel: 'Password', inputType: 'password', allowBlank: false,
                                    listeners: {
                                        specialkey: function (field, e) {
                                            if (e.getKey() === e.ENTER) {
                                                me.signInButtonClick();
                                            }
                                        }
                                    }},
                                {xtype: "box", html:
                                            '<div style="color: #D22; font-size: 16px;" id="invalidUserPassMessage" style="display:none"></div>' +
                                            '<a class="button exampleButton" id="signInLink" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-sign-in"></i> Sign in</a>' +
                                            '<a id="forgotPassLink" href="javascript:void(0)"><p style="text-align: right;">Forgot your password?</p></a>' +
                                            '<p style="text-align: center;">New in Paintomics? <a class="signUpLink" href="javascript:void(0)">Sign up now.</a></p>'
                                }
                            ]
                        },
                        {xtype: "box", flex: 1, html:
                                    '<div style="padding-left: 30px; border-left: 1px solid #E7E7E7;">' +
                                    '  <h2>Guest session</h2>' +
                                    '  <h4>Start a new Guest session on Paintomics.</h4>' +
																		'  <p><b>Please note</b> that all data submitted by Guest users as well as jobs and the generated data, will be stored on the system a maximum of <b>7 days</b>. Besides, <b style="color: #ef2020">Guest accounts do not receive assistance in case of problems</b> as there is not contact information.</p>' +
                                    '  <p style="text-align:center;font-size: 17px;"><b><a class="signUpLink" href="javascript:void(0)">Sign Up.</a></b> It only takes a few seconds!</p>' +
                                    '  <a class="button acceptButton" id="guestUserButton" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-sign-in"></i> Start Guest session</a>' +
                                    '</div>'
                        }
                    ],
                    listeners: {
                        afterrender: function () {
                            $("#forgotPassLink").click(function () {
                                me.signInButtonClick();
                            });
                            $(".signUpLink").click(function () {
                                me.signUpLinkClick();
                            });
                            $("#signInLink").click(function () {
                                me.signInButtonClick();
                            });
                            $("#guestUserButton").click(function () {
                                me.startGuestSessionButtonClick();
                            });
                        }
                    }
                }
        );
        return this.component;
    };
    return this;
}
SignInPanel.prototype = new View;

function SignUpPanel() {
    /*********************************************************************
     * ATTRIBUTES
     ***********************************************************************/
    this.name = "SignUpPanel";
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.signUpButtonClick = function () {
        this.getController().signUpButtonClickHandler(this);
    };
    this.signUpCloseButtonClick = function () {
        this.getController().signInLinkClickHandler(this);
    };
    this.signUpBackLinkClick = function () {
        this.getController().signInLinkClickHandler();
    };

    this.showCongratzPanel = function () {
        var signUpForm = this.getComponent().queryById("signUpForm");
        var congratzPanel = this.getComponent().queryById("congratzPanel");

        var userName = signUpForm.down("textfield[name=userName]").getValue();
        var email = signUpForm.down("textfield[name=email]").getValue();


        var tpl = new Ext.Template("<div style='font-size: 20px;'>Thanks {0} for using Paintomics.</br>A confirmation email was sent to {1}, please check your inbox and follow the instructions for account activation.</div>");
        tpl = tpl.apply([userName, email]);

        congratzPanel.queryById("messageBox").update(tpl);

        signUpForm.setVisible(false);
        congratzPanel.setVisible(true);
    };

    this.initComponent = function () {
        var me = this;
        this.component = Ext.widget(
                {xtype: "container", layout: {type: 'vbox', align: 'stretch'}, flex: 1, maxWidth: 900, margin: '20',
                    items: [
                        {xtype: 'form', itemId: "signUpForm", border: 0, layout: {type: 'vbox', align: 'stretch'}, defaults: {labelAlign: "top", border: false},
                            items: [
                                {xtype: "box", html: '<h2>Sign Up in seconds</h2>'},
                                {xtype: "textfield", name: 'email', fieldLabel: 'Your Email ', vtype: 'email', allowBlank: false},
                                {xtype: "textfield", name: 'password', fieldLabel: 'Choose a Password', inputType: 'password', allowBlank: false},
                                {xtype: "textfield", name: 'password2', fieldLabel: 'Confirm Password', inputType: 'password', submitValue: false, allowBlank: false,
                                    validator: function (value) {
                                        if ($("input[name=password]").val() != value) {
                                            return "Password do not match!";
                                        }
                                        return true;
                                    }
                                },
                                {xtype: "textfield", name: 'userName', fieldLabel: 'Your name or nickname', allowBlank: false},
                                {xtype: "textfield", name: 'affiliation', fieldLabel: 'Your Affiliation '},
                                {xtype: "box", html: '<p class="formNode">Please let us know your university, research centre or company and the department or institute.</p>'},
                                {xtype: "box", html: '<div style="color: #D22; font-size: 16px;" id="invalidSignUpMessage" style="display:none"></div>' +
                                            '<a class="button exampleButton" id="signUpButton" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-sign-in"></i> Sign me up!</a>' +
                                            '<a id="signUpBackLink" href="javascript:void(0)"><i class="fa fa-arrow-circle-o-left"></i> Back</a>'
                                }
                            ]
                        },
                        {xtype: "container", itemId: "congratzPanel", hidden: true, layout: {type: 'vbox', align: 'stretch'},
                            items: [
                                {xtype: "box", html: '<h2>Congratz!</h2>'},
                                {xtype: "box", flex: 1, itemId: "messageBox", html: ''},
                                {xtype: "box", html: '<a class="button exampleButton" id="signUpCloseButton" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-check-circle-o"></i> Close</a>'}
                            ]
                        }
                    ],
                    listeners: {
                        afterrender: function () {
                            $("#signUpButton").click(function () {
                                me.signUpButtonClick();
                            });
                            $("#signUpCloseButton").click(function () {
                                me.signUpCloseButtonClick();
                            });
                            $("#signUpBackLink").click(function () {
                                me.signUpBackLinkClick();
                            });
                        }
                    }
                }
        );
        return this.component;
    };
    return this;
}
SignUpPanel.prototype = new View;

function GuestSessionPanel(email, p) {
    /*********************************************************************
     * ATTRIBUTES
     ***********************************************************************/
    this.name = "SignInPanel";
    this.email = email;
    this.p = p;
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.continueButtonClick = function () {
        application.getController("JobController").resetButtonClickHandler(null, true);
    };

    this.initComponent = function () {
        var me = this;
        this.component = Ext.widget(
                {
                    xtype: "box", flex: 1, margin: '20px',
                    html:
                            '<div style="padding-left: 30px; border-left: 1px solid #E7E7E7;">' +
                            '<h2>Guest session</h2>' +
                            '<p><b>Welcome Guest</b>, please find your temporary credentials below. Use this information to resume your jobs or recover your data.</p>' +
                            '<h4><b>Email:    </b> ' + me.email + '</h4>' +
                            '<h4><b>Password: </b> ' + me.p + '</h4>' +
                            '<b>Remember:</b> all data, jobs, and results for Guest Users will be kept on the system for a maximum of <b>7 days</b>.</p>' +
                            '<p><a class="signUpLink" href="javascript:void(0)">Sign Up</a></b>. It only takes a few seconds. <a>More info</a>.</p>' +
                            '<a class="button exampleButton" id="continueButton" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-sign-in"></i> Got it! Let\'s get to work!</a>' +
                            '</div>',
                    listeners: {
                        afterrender: function () {
                            $("#continueButton").click(function () {
                                me.continueButtonClick();
                            });
                        }
                    }
                }
        );
        return this.component;
    };

    return this;
}
GuestSessionPanel.prototype = new View;

function ChangePasswordPanel() {
    /*********************************************************************
     * ATTRIBUTES
     ***********************************************************************/
    this.name = "ChangePasswordPanel";
    /*********************************************************************
     * OTHER FUNCTIONS
     ***********************************************************************/
    this.acceptButtonClick = function () {
        this.getController().changePasswordAcceptButtonClickHandler(this);
    };
    this.cancelButtonClick = function () {
        this.getController().changePasswordCancelButtonClickHandler(this);
    };

    this.showSuccessPanel = function () {
            var changePassForm = this.getComponent().queryById("changePassForm");
            var successPanel = this.getComponent().queryById("successPanel");
            changePassForm.setVisible(false);
            successPanel.setVisible(true);
        };

    this.initComponent = function () {
        var me = this;
        this.component = Ext.widget(
            {xtype: "container", layout: {type: 'vbox', align: 'stretch'}, flex: 1, maxWidth: 900, margin: '20',
                items: [
                    {xtype: 'form', itemId: "changePassForm", border: 0, layout: {type: 'vbox', align: 'stretch'}, defaults: {labelAlign: "top", border: false},
                        items: [
                            {xtype: "box", html: '<h2>Change your password</h2>'},
                            {xtype: "textfield", name: 'password', fieldLabel: 'Choose a new Password', inputType: 'password', allowBlank: false},
                            {xtype: "textfield", name: 'password2', fieldLabel: 'Confirm Password', inputType: 'password', submitValue: false, allowBlank: false,
                                validator: function (value) {
                                    if ($("input[name=password]").val() != value) {
                                        return "Password do not match!";
                                    }
                                    return true;
                                }
                            },
                            {xtype: "box", html: '<a class="button acceptButton" id="acceptNewPassButton" style=" width: 100%; text-align: center; margin: 10px 0px; "><i class="fa fa-check"></i> Accept</a>' +
                                        '<a id="cancelNewPassButton" href="javascript:void(0)"><i class="fa fa-arrow-circle-o-left"></i> Cancel</a>'
                            }
                        ],
                    },
                    {xtype: "container", itemId: "successPanel", hidden: true, layout: {type: 'vbox', align: 'stretch'},
                            items: [
                                {xtype: "box", html: '<h2>Success!</h2>'},
                                {xtype: "box", flex: 1, itemId: "messageBox", html: 'Your password has been successfully updated.'},
                                {xtype: "box", html: '<a class="button acceptButton" style=" width: 100%; text-align: center; margin: 10px 0px; " id="closeNewPassButton" href="javascript:void(0)"><i class="fa fa-arrow-circle-o-left"></i> Close</a>'}
                            ]
                    }
                ],
                listeners: {
                    afterrender: function () {
                        $("#acceptNewPassButton").click(function () {
                            me.acceptButtonClick();
                        });
                        $("#cancelNewPassButton").click(function () {
                            me.cancelButtonClick();
                        });
                        $("#closeNewPassButton").click(function () {
                            me.cancelButtonClick();
                        });
                    }
                }
            }
        );
        return this.component;
    };

    return this;
}
ChangePasswordPanel.prototype = new View;
