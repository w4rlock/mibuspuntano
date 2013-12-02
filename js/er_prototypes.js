String.prototype.insert = function (index, string) {
  if (index > 0)
    return this.substring(0, index) + string + this.substring(index, this.length);
  else
    return string + this;
};

Number.prototype.toRad = function() {
   return this * Math.PI / 180;
}

Array.prototype.sortBy = function() {
      function _sortByAttr(attr) {
          var sortOrder = 1;
          if (attr[0] == "-") {
              sortOrder = -1;
              attr = attr.substr(1);
          }
          return function(a, b) {
              var result = (a[attr] < b[attr]) ? -1 : (a[attr] > b[attr]) ? 1 : 0;
              return result * sortOrder;
          }
      }
      function _getSortFunc() {
          if (arguments.length == 0) {
              throw "Zero length arguments not allowed for Array.sortBy()";
          }
          var args = arguments;
          return function(a, b) {
              for (var result = 0, i = 0; result == 0 && i < args.length; i++) {
                  result = _sortByAttr(args[i])(a, b);
              }
              return result;
          }
      }
      return this.sort(_getSortFunc.apply(null, arguments));
}

