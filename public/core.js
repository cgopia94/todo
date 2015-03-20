var theTodo = angular.module('theTodo', []).controller('mainController', 
	function($scope, $http, $q) {
		$scope.formData = {};

		$http.get('/api/todos')
		.success(function(data) {
			$scope.todos = data;
			console.log(data);
		})
		.error(function(data) {
			console.log('Error: ' + data);
		});

		$scope.getTodo = function(id) {
			return $http.get('/api/todos/' + id)
			.then(function(res) {
				$scope.todo = res.data;
				return res.data;
			}, function(data) {
				console.log('Error: ' + data);	
				return $q.reject(res.data);
			});
		};

		$scope.createTodo = function(id) {
			if(id) {
				$scope.updateTodo(id);
			}
			else {
				$http.post('/api/todos', $scope.formData)
				.success(function(data) {
					$scope.formData = {};
					$scope.todos = data;
					console.log(data);
				})
				.error(function(data) {
					console.log('Error: ' + data);
				});
			}
		};

		$scope.deleteTodo = function(id) {
			$http.delete('/api/todos/' + id)
			.success(function(data) {
				$scope.formData = {};
				$scope.todos = data;
				console.log(data);
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
		};

		$scope.editTodo = function(id) {
			$('#todoSubmit').text('Edit');
			$scope.getTodo(id)
			.then(function(data) {
				$('#todoText').val(data.text);
			}, function(err) {
				console.log('Error: ' + err);	
			});
		};

		$scope.updateTodo = function(id) {
			$http.put('/api/todos/' + id, $scope.formData)
			.success(function(data) {
				$scope.formData = {};
				$scope.todo = {};
				$scope.todos = data;
				$('#todoSubmit').text('Add');
				console.log(data);
			})
			.error(function(data) {
				console.log('Error: ' + data);
			});
		};
});
// .factory('getATodo', ['$scope', '$http', '$q',
// 	function($scope, $http, $q) {

// 	}]);

