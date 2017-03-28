(function() {

	var app = angular.module('PaintomicsAdminSiteApp', [
		'ang-dialogs',
		'ui.router',
		'ngSanitize',
		'admin.controllers.database-controllers',
		'admin.controllers.systeminfo-controllers',
		'admin.controllers.user-controllers',
		'admin.controllers.file-controllers',
		'admin.controllers.message-controllers'
	]);

	app.constant('myAppConfig', {
		VERSION: '0.1',
		SERVER_URL : "/"
	});

	//Define the events that are fired in the APP
	app.constant('APP_EVENTS', {
		launchService: 'launch-service'
	});

	//DEFINE THE ENTRIES FOR THE WEB APP
	app.config([
		'$stateProvider',
		'$urlRouterProvider',
		function ($stateProvider, $urlRouterProvider) {
			// For any unmatched url, redirect to /login
			$urlRouterProvider.otherwise("/");
			var controlPanel = {
				name: 'control-panel',
				url: '/',
				templateUrl: "templates/control-panel.tpl.html",
				data: {requireLogin: false}
			},
			usersManagement = {
				name: 'users-management',
				url: '/users-management',
				templateUrl: "templates/users-management.tpl.html",
				data: {requireLogin: false}
			},
			filesManagement = {
				name: 'files-management',
				url: '/files-management',
				templateUrl: "templates/files-management.tpl.html",
				data: {requireLogin: false}
			},
			databasesManagement = {
				name: 'databases-management',
				url: '/databases-management',
				templateUrl: "templates/databases-management.tpl.html",
				data: {requireLogin: false}
			};
			$stateProvider.state(controlPanel);
			$stateProvider.state(usersManagement);
			$stateProvider.state(filesManagement);
			$stateProvider.state(databasesManagement);
		}]
	);


	/******************************************************************************
	*       _____ ____  _   _ _______ _____   ____  _      _      ______ _____   _____
	*      / ____/ __ \| \ | |__   __|  __ \ / __ \| |    | |    |  ____|  __ \ / ____|
	*     | |   | |  | |  \| |  | |  | |__) | |  | | |    | |    | |__  | |__) | (___
	*     | |   | |  | | . ` |  | |  |  _  /| |  | | |    | |    |  __| |  _  / \___ \
	*     | |___| |__| | |\  |  | |  | | \ \| |__| | |____| |____| |____| | \ \ ____) |
	*      \_____\____/|_| \_|  |_|  |_|  \_\\____/|______|______|______|_|  \_\_____/
	*
	******************************************************************************/
	app.controller('AdminController', function ($rootScope, $scope, $state, $http, $sce, $timeout, $interval, myAppConfig, APP_EVENTS) {
		/******************************************************************************
		*       ___ ___  _  _ _____ ___  ___  _    _    ___ ___
		*      / __/ _ \| \| |_   _| _ \/ _ \| |  | |  | __| _ \
		*     | (_| (_) | .` | | | |   / (_) | |__| |__| _||   /
		*      \___\___/|_|\_| |_|_|_|_\\___/|____|____|___|_|_\
		*        | __| | | | \| |/ __|_   _|_ _/ _ \| \| / __|
		*        | _|| |_| | .` | (__  | |  | | (_) | .` \__ \
		*        |_|  \___/|_|\_|\___| |_| |___\___/|_|\_|___/
		*
		******************************************************************************/

		$rootScope.getRequestPath = function(service, extra){
			extra = (extra || "");
			switch (service) {
				case "users":
				return myAppConfig.SERVER_URL + "api/admin/users/" + extra;
				case "files":
				return myAppConfig.SERVER_URL + "api/admin/files/" + extra;
				case "system-info":
				return myAppConfig.SERVER_URL + "api/admin/system-info/" + extra;
				case "messages":
				return myAppConfig.SERVER_URL + "api/admin/messages/" + extra;
				case "databases":
				return myAppConfig.SERVER_URL + "api/admin/databases/" + extra;
				case "clean-databases":
				return myAppConfig.SERVER_URL + "api/admin/clean-databases/";
				default:
				return "";
			}
		};

		$rootScope.getHttpRequestConfig = function(method, service, options){
			options = (options || {});
			options.params = (options.params || {});

			var requestData = {
				method: method,
				headers: options.headers,
				url: this.getRequestPath(service, options.extra),
				params: options.params,
				data: options.data
			};

			if(options.transformRequest !== undefined){
				requestData.transformRequest = options.transformRequest;
			}

			return requestData;
		};

		this.setPage = function (page) {
			$state.transitionTo(page);
			$scope.currentPage = page;
		};

		this.getPageTitle  = function(page){
			return
		};

		this.setCurrentPageTitle = function(page){
			$scope.currentPageTitle = page;
		};

		/******************************************************************************
		*            _____   _____ _  _ _____
		*           | __\ \ / / __| \| |_   _|
		*           | _| \ V /| _|| .` | | |
		*      _  _ |___| \_/_|___|_|\_| |_| ___  ___
		*     | || | /_\ | \| |   \| |  | __| _ \/ __|
		*     | __ |/ _ \| .` | |) | |__| _||   /\__ \
		*     |_||_/_/ \_\_|\_|___/|____|___|_|_\|___/
		*
		******************************************************************************/
		$scope.$on(APP_EVENTS.launchService, function (event, args) {
		});


		this.changeCurrentServiceHandler = function(service){
			if($scope.visible_services.indexOf(service) === -1){
				if($scope.visible_services.length >=  $scope.max_visible_services){
					$scope.visible_services.shift();
				}
				$scope.visible_services.push(service);
				while($rootScope.interval.length > 0){
					$interval.cancel($rootScope.interval[0]);
					$rootScope.interval.shift();
					console.log("Cleaning interval");
				}
				$state.transitionTo(service.name);
			}
		};

		/******************************************************************************
		*      ___ _  _ ___ _____ ___   _   _    ___ ____  _ _____ ___ ___  _  _
		*     |_ _| \| |_ _|_   _|_ _| /_\ | |  |_ _|_  / /_\_   _|_ _/ _ \| \| |
		*      | || .` || |  | |  | | / _ \| |__ | | / / / _ \| |  | | (_) | .` |
		*     |___|_|\_|___| |_| |___/_/ \_\____|___/___/_/ \_\_| |___\___/|_|\_|
		*
		******************************************************************************/
		var me = this;
		$rootScope.myAppConfig = myAppConfig;

		$scope.open_services = [
			{name:"control-panel", title: 'Control panel', description: 'The main Paintomics admin page', icon : 'fa-tachometer'},
			{name:"users-management", title: 'Users', description: 'Manage the users in the applications', icon : 'fa-users'},
			{name:"databases-management", title: 'Organisms', description: 'Manage the installed organisms', icon : 'fa-database'},
			{name:"files-management", title: 'Files', description: 'Manage available reference files', icon : 'fa-files-o'}
		];

		$scope.visible_services = [$scope.open_services[0]];
		$scope.max_visible_services = 1;
		$rootScope.interval = [];
	});
})();
