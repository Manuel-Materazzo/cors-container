'use strict';

function ResponseBuilder(response){
    this.response = response;
    this.headers = {};
}

ResponseBuilder.prototype.addHeaderByKeyValue = function(key, value) {
    this.headers[key] = value;
    return this;
}

ResponseBuilder.prototype.build = function(headers){
    return headers ? this.response.header(Object.assign(headers, this.headers)) : this;
}

export default ResponseBuilder