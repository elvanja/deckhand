// TODO fancier error handling
var handleError = function(response) {
  alert('Error: ' + response.data.error);
};

angular.module('controllers', ['ui.bootstrap'])

.controller('RootCtrl', ['$rootScope', 'Model', function($rootScope, Model) {

  $rootScope.cards = [];
  var openedItems = {};

  var focusCard = function(index) {
    var event = new CustomEvent('focusItem', {detail: {index: index}});
    document.getElementById('cards').dispatchEvent(event);
  }

  $rootScope.showCard = function(model, id) {
    var openedItem = (openedItems[model] ? openedItems[model][id] : null);

    if (openedItem) {
      focusCard($rootScope.cards.indexOf(openedItem));
    } else {
      Model.get({model: model, id: id}, function(item) {
        if (!openedItems[model]) openedItems[model] = {};
        openedItems[model][id] = item;
        $rootScope.cards.unshift(item);
        focusCard(0);
      });
    }
  };

  $rootScope.removeCard = function(item) {
    $rootScope.cards.splice($rootScope.cards.indexOf(item), 1);
    delete openedItems[item._model][item.id];
  };

  $rootScope.replaceCard = function(item, newItem) {
    $rootScope.cards.splice($rootScope.cards.indexOf(item), 1, newItem);
    delete openedItems[item._model][item.id];
    openedItems[newItem._model][newItem.id] = newItem;
  };

}])

.controller('SearchCtrl', ['$scope', 'Search', 'Model', function($scope, Search, Model) {

  $scope.search = function() {
    $scope.noResults = false;
    $scope.results = Search.query({term: $scope.term}, function(results) {
      if (results.length == 0) $scope.noResults = true;
    });
  };

  $scope.reset = function() {
    $scope.term = null;
    $scope.results = [];
    $scope.noResults = false;
  };

}])

.controller('ActionFormCtrl', ['$scope', '$modalInstance', 'Model', 'context', function($scope, $modalInstance, Model, context) {

  var item = context.item, action = context.action, inputs = [];

  $scope.item = item;
  $scope.action = action;
  $scope.form = {};

  Model.form({model: item._model, act: action, id: item.id}, function(form) {
    Object.keys(form).forEach(function(key) {
      if (key.charAt(0) != '$') {
        $scope.form[key] = form[key];
        inputs.push(key);
      }
    });
  });

  $scope.cancel = function() {
    $modalInstance.dismiss('cancel');
  };

  $scope.submit = function() {
    var data = {model: item._model, id: item.id, act: action, form: $scope.form};
    $scope.error = null;
    Model.act(data, function(newItem) {
      $modalInstance.close(newItem);
    }, function(response) {
      $scope.error = response.data.error;
    });
  };

}])

.controller('CardsCtrl', ['$scope', '$sce', '$filter', '$modal', 'Model', function($scope, $sce, $filter, $modal, Model) {

  $scope.template = function(item) {
    return DeckhandGlobals.templatePath + '?model=' + item._model;
  };

  $scope.raw = function(value) {
    return $sce.trustAsHtml(value);
  };

  $scope.value = function(item, attr) {
    var fieldTypes = DeckhandGlobals.fieldTypes[item._model];
    var value;
    if (!fieldTypes) {
      value = item[attr];
    } else if (fieldTypes[attr] == 'time') {
      value = $filter('humanTime')(item[attr]);
    } else if (fieldTypes[attr] == 'relation') {
      obj = item[attr];
      value = (obj ? obj._label : 'none');
    } else {
      value = item[attr];
    }
    return value;
  };

  $scope.substitute = function(item, attr, string) {
    var value = $scope.value(item, attr);
    return string.replace(':value', value);
  };

  var refreshItem = function(item, newItem) {
    $scope.replaceCard(item, newItem);
    var result = newItem._result;
    if (result && result._model) {
      $scope.open(result._model, result.id);
    }
  };

  $scope.act = function(item, action, options) {
    if (!options) options = {confirm: true};

    if (options.form) {
      var url = DeckhandGlobals.templatePath + '?model=' + item._model + '&act=' + action + '&id=' + item.id;
      var modalInstance = $modal.open({
        templateUrl: url,
        controller: 'ActionFormCtrl',
        resolve: {
          context: function() {
            return {item: item, action: action};
          }
        }
      });

      modalInstance.result.then(function(newItem) {
        refreshItem(item, newItem);
      });
      return;
    }

    if (!('confirm' in options) || confirm('Are you sure you want to do that?')) {
      Model.act({model: item._model, id: item.id, act: action}, function(newItem) {
        refreshItem(item, newItem);
      });
    }
  };

  $scope.updateAttribute = function(item, name) {
    var promptLabel = "Change " + name + " for " + item._label + ':';
    var newValue = prompt(promptLabel, item[name]);

    if (newValue != null) {
      var data = {model: item._model, id: item.id, attributes: {}};
      data.attributes[name] = newValue;

      Model.update(data, function(newItem) {
        refreshItem(item, newItem);
      }, handleError);
    }
  };

}]);